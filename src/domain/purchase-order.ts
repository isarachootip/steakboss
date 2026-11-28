import { multiplyBaht, roundBaht } from "./money";

export type PurchaseOrderStatus =
  | "OPEN"
  | "PARTIAL"
  | "RECEIVED"
  | "SHORT_CLOSED"
  | "CANCELLED";

export type GoodsReceiptStatus = "POSTED" | "VOIDED";

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  OPEN: "รอรับสินค้า",
  PARTIAL: "รับบางส่วน",
  RECEIVED: "รับครบแล้ว",
  SHORT_CLOSED: "ปิดยอดไม่ครบ",
  CANCELLED: "ยกเลิก",
};

export interface PoLineCostInput {
  orderedQty: number;
  unitCostBaht: number;
}

export interface PoLineProgress {
  orderedQty: number;
  receivedQty: number;
}

export interface PoLineForReceipt extends PoLineProgress {
  id: string;
  skuSnapshot: string;
}

export interface ReceiptLineRequest {
  purchaseOrderItemId: string;
  receivedQty: number;
}

export interface VoidItemCheck {
  productId: string;
  skuSnapshot: string;
  receivedQty: number;
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function getYearMonthStamp(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

export function formatPurchaseOrderNo(yearMonth: string, sequence: number): string {
  return `PO-${yearMonth}-${String(Math.max(1, sequence)).padStart(4, "0")}`;
}

export function formatGoodsReceiptNo(yearMonth: string, sequence: number): string {
  return `GRN-${yearMonth}-${String(Math.max(1, sequence)).padStart(4, "0")}`;
}

export function extractNextSequence(
  latestDocNo: string | null | undefined,
  prefix: string
): number {
  if (!latestDocNo || !latestDocNo.startsWith(prefix)) return 1;
  const suffix = latestDocNo.slice(prefix.length);
  const parsed = Number.parseInt(suffix, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed + 1 : 1;
}

export function calculatePoTotals(items: readonly PoLineCostInput[]): {
  lineTotals: number[];
  totalCostBaht: number;
} {
  const lineTotals = items.map((item) =>
    roundBaht(multiplyBaht(item.unitCostBaht, item.orderedQty))
  );
  const totalCostBaht = roundBaht(
    lineTotals.reduce((sum, lineTotal) => sum + lineTotal, 0)
  );
  return { lineTotals, totalCostBaht };
}

export function resolvePurchaseOrderStatus(
  lines: readonly PoLineProgress[]
): "OPEN" | "PARTIAL" | "RECEIVED" {
  if (lines.length === 0) return "OPEN";
  const anyReceived = lines.some((l) => l.receivedQty > 0);
  if (!anyReceived) return "OPEN";
  const allComplete = lines.every((l) => l.receivedQty >= l.orderedQty);
  return allComplete ? "RECEIVED" : "PARTIAL";
}

export function canReceivePurchaseOrder(status: string): boolean {
  return status === "OPEN" || status === "PARTIAL";
}

export function validateReceiptLines(
  poLines: readonly PoLineForReceipt[],
  receiptLines: readonly ReceiptLineRequest[]
): ValidationResult {
  if (receiptLines.length === 0) {
    return { ok: false, error: "กรุณาระบุจำนวนสินค้าที่รับอย่างน้อย 1 รายการ" };
  }
  const byId = new Map(poLines.map((line) => [line.id, line]));
  const seen = new Set<string>();

  for (const req of receiptLines) {
    if (seen.has(req.purchaseOrderItemId)) {
      return { ok: false, error: "พบรายการสินค้าซ้ำในใบรับเดียวกัน" };
    }
    seen.add(req.purchaseOrderItemId);

    const poLine = byId.get(req.purchaseOrderItemId);
    if (!poLine) {
      return { ok: false, error: "พบรายการสินค้าที่ไม่ได้อยู่ในใบสั่งซื้อนี้" };
    }
    if (!Number.isInteger(req.receivedQty) || req.receivedQty <= 0) {
      return { ok: false, error: `จำนวนรับของ SKU ${poLine.skuSnapshot} ต้องมากกว่า 0` };
    }
    const remaining = poLine.orderedQty - poLine.receivedQty;
    if (remaining <= 0) {
      return { ok: false, error: `SKU ${poLine.skuSnapshot} รับสินค้าครบตามยอดสั่งแล้ว` };
    }
    if (req.receivedQty > remaining) {
      return {
        ok: false,
        error: `SKU ${poLine.skuSnapshot} รับเกินยอดค้างไม่ได้ (ค้างรับ ${remaining} แต่กรอก ${req.receivedQty})`,
      };
    }
  }
  return { ok: true };
}

export function validateVoidStockAvailability(
  receiptItems: readonly VoidItemCheck[],
  currentStockByProductId: ReadonlyMap<string, number>
): ValidationResult {
  for (const item of receiptItems) {
    const currentStock = currentStockByProductId.get(item.productId) ?? 0;
    if (currentStock < item.receivedQty) {
      return {
        ok: false,
        error: `ไม่สามารถยกเลิกใบรับได้ เนื่องจากสต็อกปัจจุบันของ SKU ${item.skuSnapshot} เหลือ ${currentStock} น้อยกว่าจำนวนที่ต้องหักคืน ${item.receivedQty}`,
      };
    }
  }
  return { ok: true };
}
