import { db } from "@/lib/db";
import {
  resolvePurchaseOrderStatus,
  validateVoidStockAvailability,
} from "@/domain/purchase-order";
import {
  mapPurchaseOrderDetail,
  PO_DETAIL_INCLUDE,
  type PurchaseOrderDetailDto,
} from "./purchase-order-mapper";

export async function voidGoodsReceipt(params: {
  purchaseOrderId: string;
  receiptId: string;
  reason: string;
  actorId: string;
  includeCost: boolean;
}): Promise<PurchaseOrderDetailDto> {
  return db.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: params.purchaseOrderId },
      include: { items: true },
    });
    if (!po) throw new Error("ไม่พบใบสั่งซื้อนี้");

    const receipt = await tx.goodsReceipt.findUnique({
      where: { id: params.receiptId },
      include: { items: true },
    });
    if (!receipt || receipt.purchaseOrderId !== po.id) {
      throw new Error("ไม่พบใบรับสินค้านี้ในใบสั่งซื้อ");
    }
    if (receipt.status !== "POSTED") {
      throw new Error("ใบรับสินค้านี้ถูกยกเลิกไปแล้ว");
    }

    const products = await tx.product.findMany({
      where: { id: { in: receipt.items.map((i) => i.productId) } },
      select: { id: true, stockQty: true },
    });
    const stockMap = new Map(products.map((p) => [p.id, p.stockQty]));
    const stockCheck = validateVoidStockAvailability(receipt.items, stockMap);
    if (!stockCheck.ok) throw new Error(stockCheck.error);

    await tx.goodsReceipt.update({
      where: { id: receipt.id },
      data: {
        status: "VOIDED",
        voidedById: params.actorId,
        voidReason: params.reason,
        voidedAt: new Date(),
      },
    });

    const nextProgress = new Map(
      po.items.map((item) => [
        item.id,
        { orderedQty: item.orderedQty, receivedQty: item.receivedQty },
      ])
    );

    for (const ri of receipt.items) {
      const currentLine = nextProgress.get(ri.purchaseOrderItemId);
      const nextReceived = Math.max(0, (currentLine?.receivedQty ?? 0) - ri.receivedQty);
      if (currentLine) {
        nextProgress.set(ri.purchaseOrderItemId, {
          orderedQty: currentLine.orderedQty,
          receivedQty: nextReceived,
        });
      }

      await tx.purchaseOrderItem.update({
        where: { id: ri.purchaseOrderItemId },
        data: { receivedQty: nextReceived },
      });
      await tx.product.update({
        where: { id: ri.productId },
        data: { stockQty: { decrement: ri.receivedQty } },
      });
      await tx.stockMovement.create({
        data: {
          productId: ri.productId,
          deltaQty: -ri.receivedQty,
          type: "ADJUST",
          reason: `ยกเลิกใบรับ ${receipt.receiptNo} (${po.poNo}): ${params.reason}`,
          purchaseOrderNo: po.poNo,
          goodsReceiptNo: receipt.receiptNo,
          actorId: params.actorId,
        },
      });
    }

    const nextStatus = resolvePurchaseOrderStatus(Array.from(nextProgress.values()));
    const updated = await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: nextStatus,
        closedAt: nextStatus === "RECEIVED" ? po.closedAt : null,
      },
      include: PO_DETAIL_INCLUDE,
    });
    return mapPurchaseOrderDetail(updated, params.includeCost);
  });
}
