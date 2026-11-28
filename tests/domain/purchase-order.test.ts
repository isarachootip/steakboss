import { describe, expect, it } from "vitest";
import {
  calculatePoTotals,
  formatGoodsReceiptNo,
  formatPurchaseOrderNo,
  getYearMonthStamp,
  resolvePurchaseOrderStatus,
  validateReceiptLines,
  validateVoidStockAvailability,
} from "@/domain/purchase-order";

describe("purchase-order domain", () => {
  it("formats PO and GRN document numbers deterministically", () => {
    const stamp = getYearMonthStamp(new Date("2026-11-28T03:00:00.000Z"));
    expect(stamp).toBe("202611");
    expect(formatPurchaseOrderNo("202611", 1)).toBe("PO-202611-0001");
    expect(formatPurchaseOrderNo("202611", 42)).toBe("PO-202611-0042");
    expect(formatGoodsReceiptNo("202611", 7)).toBe("GRN-202611-0007");
  });

  it("calculates line totals and grand total with exact baht rounding", () => {
    const result = calculatePoTotals([
      { orderedQty: 10, unitCostBaht: 33.75 },
      { orderedQty: 3, unitCostBaht: 18.75 },
    ]);
    expect(result.lineTotals).toEqual([337.5, 56.25]);
    expect(result.totalCostBaht).toBe(393.75);
  });

  it("resolves PO status from OPEN -> PARTIAL -> RECEIVED and back on void", () => {
    expect(
      resolvePurchaseOrderStatus([
        { orderedQty: 10, receivedQty: 0 },
        { orderedQty: 5, receivedQty: 0 },
      ])
    ).toBe("OPEN");

    expect(
      resolvePurchaseOrderStatus([
        { orderedQty: 10, receivedQty: 10 },
        { orderedQty: 5, receivedQty: 0 },
      ])
    ).toBe("PARTIAL");

    expect(
      resolvePurchaseOrderStatus([
        { orderedQty: 10, receivedQty: 10 },
        { orderedQty: 5, receivedQty: 5 },
      ])
    ).toBe("RECEIVED");
  });

  it("validates partial receipts and blocks over-receiving or invalid items", () => {
    const poLines = [
      { id: "line-1", skuSnapshot: "SB-A", orderedQty: 20, receivedQty: 5 },
      { id: "line-2", skuSnapshot: "SB-B", orderedQty: 10, receivedQty: 10 },
    ];

    const ok = validateReceiptLines(poLines, [
      { purchaseOrderItemId: "line-1", receivedQty: 15 },
    ]);
    expect(ok.ok).toBe(true);

    const over = validateReceiptLines(poLines, [
      { purchaseOrderItemId: "line-1", receivedQty: 16 },
    ]);
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.error).toContain("SB-A");

    const alreadyFull = validateReceiptLines(poLines, [
      { purchaseOrderItemId: "line-2", receivedQty: 1 },
    ]);
    expect(alreadyFull.ok).toBe(false);

    const unknown = validateReceiptLines(poLines, [
      { purchaseOrderItemId: "line-999", receivedQty: 1 },
    ]);
    expect(unknown.ok).toBe(false);
  });

  it("blocks voiding a GRN if current stock would become negative", () => {
    const ok = validateVoidStockAvailability(
      [{ productId: "p1", skuSnapshot: "SB-A", receivedQty: 10 }],
      new Map([["p1", 12]])
    );
    expect(ok.ok).toBe(true);

    const fail = validateVoidStockAvailability(
      [{ productId: "p1", skuSnapshot: "SB-A", receivedQty: 10 }],
      new Map([["p1", 8]])
    );
    expect(fail.ok).toBe(false);
    if (!fail.ok) expect(fail.error).toContain("SB-A");
  });
});
