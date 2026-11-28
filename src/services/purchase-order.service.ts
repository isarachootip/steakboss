import { db } from "@/lib/db";
import { calculatePoTotals } from "@/domain/purchase-order";
import type {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
} from "@/schemas/purchase-order.schema";
import {
  mapPurchaseOrderDetail,
  mapPurchaseOrderSummary,
  PO_DETAIL_INCLUDE,
  PO_LIST_INCLUDE,
  type PurchaseOrderDetailDto,
  type PurchaseOrderSummaryDto,
} from "./purchase-order-mapper";
import {
  buildPoItemsCreateData,
  generateNextPoNo,
  PurchaseOrderConflictError,
  resolveValidatedPoProducts,
} from "./purchase-order-helpers";

export { PurchaseOrderConflictError } from "./purchase-order-helpers";

export async function listPurchaseOrders(params: {
  includeCost: boolean;
  status?: string;
  search?: string;
}): Promise<PurchaseOrderSummaryDto[]> {
  const rows = await db.purchaseOrder.findMany({
    where: params.status && params.status !== "ALL" ? { status: params.status } : undefined,
    include: PO_LIST_INCLUDE,
    orderBy: [{ createdAt: "desc" }],
  });
  const mapped = rows.map((r) => mapPurchaseOrderSummary(r, params.includeCost));
  const q = params.search?.trim().toLowerCase();
  if (!q) return mapped;
  return mapped.filter((po) =>
    `${po.poNo} ${po.supplierName} ${po.skuList.join(" ")}`.toLowerCase().includes(q)
  );
}

export async function getPurchaseOrderById(
  id: string,
  includeCost: boolean
): Promise<PurchaseOrderDetailDto | null> {
  const row = await db.purchaseOrder.findUnique({
    where: { id },
    include: PO_DETAIL_INCLUDE,
  });
  if (!row) return null;
  return mapPurchaseOrderDetail(row, includeCost);
}

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput,
  actorId: string
): Promise<PurchaseOrderDetailDto> {
  return db.$transaction(async (tx) => {
    const productMap = await resolveValidatedPoProducts(
      tx,
      input.items.map((i) => i.productId)
    );
    const poNo = input.poNo ?? (await generateNextPoNo(tx));
    const dup = await tx.purchaseOrder.findUnique({
      where: { poNo },
      select: { id: true },
    });
    if (dup) {
      throw new PurchaseOrderConflictError(`เลขที่ใบสั่งซื้อ ${poNo} มีอยู่ในระบบแล้ว`);
    }

    const { lineTotals, totalCostBaht } = calculatePoTotals(input.items);
    const created = await tx.purchaseOrder.create({
      data: {
        poNo,
        supplierName: input.supplierName,
        status: "OPEN",
        expectedDate: input.expectedDate,
        note: input.note,
        totalCostBaht,
        createdById: actorId,
        items: { create: buildPoItemsCreateData(input.items, lineTotals, productMap) },
      },
      include: PO_DETAIL_INCLUDE,
    });
    return mapPurchaseOrderDetail(created, true);
  });
}

export async function updatePurchaseOrder(
  id: string,
  input: UpdatePurchaseOrderInput
): Promise<PurchaseOrderDetailDto> {
  return db.$transaction(async (tx) => {
    const existing = await tx.purchaseOrder.findUnique({
      where: { id },
      include: { _count: { select: { receipts: true } } },
    });
    if (!existing) throw new Error("ไม่พบใบสั่งซื้อนี้");
    if (existing.status !== "OPEN" || existing._count.receipts > 0) {
      throw new Error("แก้ไขได้เฉพาะใบสั่งซื้อสถานะรอรับที่ยังไม่เคยบันทึกรับสินค้า");
    }

    const productMap = await resolveValidatedPoProducts(
      tx,
      input.items.map((i) => i.productId)
    );
    const { lineTotals, totalCostBaht } = calculatePoTotals(input.items);

    await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: {
        supplierName: input.supplierName,
        expectedDate: input.expectedDate,
        note: input.note,
        totalCostBaht,
        items: { create: buildPoItemsCreateData(input.items, lineTotals, productMap) },
      },
      include: PO_DETAIL_INCLUDE,
    });
    return mapPurchaseOrderDetail(updated, true);
  });
}

export async function shortClosePurchaseOrder(
  id: string,
  reason: string
): Promise<PurchaseOrderDetailDto> {
  const existing = await db.purchaseOrder.findUnique({ where: { id } });
  if (!existing) throw new Error("ไม่พบใบสั่งซื้อนี้");
  if (existing.status !== "OPEN" && existing.status !== "PARTIAL") {
    throw new Error("ปิดยอดค้างได้เฉพาะใบสั่งซื้อที่ยังเปิดรับสินค้าอยู่");
  }
  const appendedNote = reason.trim()
    ? [existing.note, `[ปิดยอดค้าง] ${reason.trim()}`].filter(Boolean).join("\n")
    : existing.note;

  const updated = await db.purchaseOrder.update({
    where: { id },
    data: { status: "SHORT_CLOSED", closedAt: new Date(), note: appendedNote },
    include: PO_DETAIL_INCLUDE,
  });
  return mapPurchaseOrderDetail(updated, true);
}

export async function cancelPurchaseOrder(
  id: string,
  reason: string
): Promise<PurchaseOrderDetailDto> {
  return db.$transaction(async (tx) => {
    const existing = await tx.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: true,
        receipts: { where: { status: "POSTED" }, select: { id: true } },
      },
    });
    if (!existing) throw new Error("ไม่พบใบสั่งซื้อนี้");
    const hasReceived =
      existing.receipts.length > 0 || existing.items.some((i) => i.receivedQty > 0);
    if (existing.status !== "OPEN" || hasReceived) {
      throw new Error("ยกเลิกได้เฉพาะใบสั่งซื้อที่ยังไม่เคยรับสินค้าเข้าคลัง");
    }
    const appendedNote = reason.trim()
      ? [existing.note, `[ยกเลิก PO] ${reason.trim()}`].filter(Boolean).join("\n")
      : existing.note;

    const updated = await tx.purchaseOrder.update({
      where: { id },
      data: { status: "CANCELLED", closedAt: new Date(), note: appendedNote },
      include: PO_DETAIL_INCLUDE,
    });
    return mapPurchaseOrderDetail(updated, true);
  });
}
