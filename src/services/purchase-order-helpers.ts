import type { Prisma } from "@prisma/client";
import {
  extractNextSequence,
  formatPurchaseOrderNo,
  getYearMonthStamp,
} from "@/domain/purchase-order";

export class PurchaseOrderConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseOrderConflictError";
  }
}

export async function resolveValidatedPoProducts(
  tx: Prisma.TransactionClient,
  productIds: string[]
) {
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, sku: true, name: true, isBundle: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const pid of productIds) {
    const prod = byId.get(pid);
    if (!prod) {
      throw new Error("ไม่พบสินค้าที่เลือกในระบบ");
    }
    if (prod.isBundle) {
      throw new Error(
        `สินค้าเซ็ต "${prod.name}" (${prod.sku}) ไม่สามารถเปิด PO ได้ กรุณาสั่งซื้อเฉพาะ SKU สินค้าเดี่ยว`
      );
    }
    if (!prod.sku.trim()) {
      throw new Error(`สินค้า "${prod.name}" ยังไม่มีรหัส SKU`);
    }
  }
  return byId;
}

export async function generateNextPoNo(
  tx: Prisma.TransactionClient
): Promise<string> {
  const ym = getYearMonthStamp();
  const prefix = `PO-${ym}-`;
  const latest = await tx.purchaseOrder.findFirst({
    where: { poNo: { startsWith: prefix } },
    orderBy: { poNo: "desc" },
    select: { poNo: true },
  });
  const seq = extractNextSequence(latest?.poNo, prefix);
  return formatPurchaseOrderNo(ym, seq);
}

export function buildPoItemsCreateData(
  items: ReadonlyArray<{ productId: string; orderedQty: number; unitCostBaht: number }>,
  lineTotals: readonly number[],
  productMap: ReadonlyMap<string, { id: string; sku: string; name: string }>
) {
  return items.map((item, idx) => {
    const prod = productMap.get(item.productId)!;
    return {
      productId: prod.id,
      skuSnapshot: prod.sku,
      productNameSnapshot: prod.name,
      orderedQty: item.orderedQty,
      receivedQty: 0,
      unitCostBaht: item.unitCostBaht,
      lineTotalBaht: lineTotals[idx] ?? 0,
    };
  });
}
