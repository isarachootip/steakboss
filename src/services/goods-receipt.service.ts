import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  canReceivePurchaseOrder,
  extractNextSequence,
  formatGoodsReceiptNo,
  getYearMonthStamp,
  resolvePurchaseOrderStatus,
  validateReceiptLines,
} from "@/domain/purchase-order";
import type { CreateGoodsReceiptInput } from "@/schemas/purchase-order.schema";
import {
  mapPurchaseOrderDetail,
  PO_DETAIL_INCLUDE,
  type PurchaseOrderDetailDto,
} from "./purchase-order-mapper";

export { voidGoodsReceipt } from "./goods-receipt-void.service";

async function generateNextGrnNo(tx: Prisma.TransactionClient): Promise<string> {
  const ym = getYearMonthStamp();
  const prefix = `GRN-${ym}-`;
  const latest = await tx.goodsReceipt.findFirst({
    where: { receiptNo: { startsWith: prefix } },
    orderBy: { receiptNo: "desc" },
    select: { receiptNo: true },
  });
  const seq = extractNextSequence(latest?.receiptNo, prefix);
  return formatGoodsReceiptNo(ym, seq);
}

export async function receivePurchaseOrder(params: {
  purchaseOrderId: string;
  input: CreateGoodsReceiptInput;
  actorId: string;
  includeCost: boolean;
}): Promise<PurchaseOrderDetailDto> {
  return db.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: params.purchaseOrderId },
      include: { items: true },
    });
    if (!po) throw new Error("ไม่พบใบสั่งซื้อนี้");
    if (!canReceivePurchaseOrder(po.status)) {
      throw new Error("ใบสั่งซื้อนี้ปิดรับสินค้าแล้ว ไม่สามารถบันทึกรับเพิ่มได้");
    }

    const check = validateReceiptLines(po.items, params.input.items);
    if (!check.ok) throw new Error(check.error);

    const receiptNo = await generateNextGrnNo(tx);
    const poItemById = new Map(po.items.map((item) => [item.id, item]));

    await tx.goodsReceipt.create({
      data: {
        receiptNo,
        purchaseOrderId: po.id,
        deliveryNoteNo: params.input.deliveryNoteNo,
        note: params.input.note,
        status: "POSTED",
        receivedById: params.actorId,
        items: {
          create: params.input.items.map((req) => {
            const poItem = poItemById.get(req.purchaseOrderItemId)!;
            return {
              purchaseOrderItemId: poItem.id,
              productId: poItem.productId,
              skuSnapshot: poItem.skuSnapshot,
              receivedQty: req.receivedQty,
              unitCostBaht: poItem.unitCostBaht,
            };
          }),
        },
      },
    });

    const reasonText = [
      `รับสินค้าตาม ${po.poNo} (${receiptNo})`,
      params.input.deliveryNoteNo ? `DO: ${params.input.deliveryNoteNo}` : "",
      params.input.note,
    ]
      .filter(Boolean)
      .join(" · ");

    const nextProgress = new Map(
      po.items.map((item) => [
        item.id,
        { orderedQty: item.orderedQty, receivedQty: item.receivedQty },
      ])
    );

    for (const req of params.input.items) {
      const poItem = poItemById.get(req.purchaseOrderItemId)!;
      const newReceivedQty = poItem.receivedQty + req.receivedQty;
      nextProgress.set(poItem.id, {
        orderedQty: poItem.orderedQty,
        receivedQty: newReceivedQty,
      });

      await tx.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: { receivedQty: newReceivedQty },
      });
      await tx.product.update({
        where: { id: poItem.productId },
        data: {
          stockQty: { increment: req.receivedQty },
          ...(poItem.unitCostBaht > 0 ? { costBaht: poItem.unitCostBaht } : {}),
        },
      });
      await tx.stockMovement.create({
        data: {
          productId: poItem.productId,
          deltaQty: req.receivedQty,
          type: "RESTOCK",
          reason: reasonText,
          purchaseOrderNo: po.poNo,
          goodsReceiptNo: receiptNo,
          actorId: params.actorId,
        },
      });
    }

    const nextStatus = resolvePurchaseOrderStatus(Array.from(nextProgress.values()));
    const updated = await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: nextStatus,
        closedAt: nextStatus === "RECEIVED" ? new Date() : null,
      },
      include: PO_DETAIL_INCLUDE,
    });
    return mapPurchaseOrderDetail(updated, params.includeCost);
  });
}
