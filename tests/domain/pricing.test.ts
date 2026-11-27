import { describe, expect, it } from "vitest";
import {
  calculateGrossMargin,
  evaluateCartPricing,
  evaluateCoupon,
} from "@/domain/pricing";
import { multiplyBaht, roundBaht } from "@/domain/money";

describe("money & multi-tier pricing domain", () => {
  const fixedCoupon = {
    code: "BOSS50",
    type: "FIXED" as const,
    value: 50,
    minSubtotal: 300,
    maxUses: 100,
    usedCount: 5,
    expiresAt: new Date("2028-01-01T00:00:00Z"),
    isActive: true,
  };

  it("handles satang decimal arithmetic without floating-point drift", () => {
    expect(multiplyBaht(56.25, 3)).toBe(168.75);
    expect(multiplyBaht(31.25, 4)).toBe(125);
    expect(roundBaht(0.1 + 0.2)).toBe(0.3);
  });

  it("applies retail price for small retail cart", () => {
    const res = evaluateCartPricing(
      [
        {
          productId: "p1",
          quantity: 3,
          priceBaht: 56.25,
          wholesalePriceBaht: 45,
          bulkPriceBaht: null,
          bulkMinQty: 0,
        },
      ],
      { isWholesaleRole: false, wholesaleMinPacks: 10 }
    );
    expect(res.pricingTier).toBe("RETAIL");
    expect(res.subtotalBaht).toBe(168.75);
    expect(res.tierSavingsBaht).toBe(0);
    expect(res.packsToWholesale).toBe(7);
  });

  it("unlocks wholesale tier automatically when total mixed packs reach wholesaleMinPacks", () => {
    const res = evaluateCartPricing(
      [
        {
          productId: "p1",
          quantity: 6,
          priceBaht: 67.5,
          wholesalePriceBaht: 54,
          bulkPriceBaht: 49,
          bulkMinQty: 10,
        },
        {
          productId: "p2",
          quantity: 4,
          priceBaht: 56.25,
          wholesalePriceBaht: 45,
          bulkPriceBaht: null,
          bulkMinQty: 0,
        },
      ],
      { isWholesaleRole: false, wholesaleMinPacks: 10 }
    );
    expect(res.pricingTier).toBe("WHOLESALE");
    expect(res.subtotalBaht).toBe(6 * 54 + 4 * 45);
    expect(res.retailSubtotalBaht).toBe(6 * 67.5 + 4 * 56.25);
    expect(res.tierSavingsBaht).toBe(126);
    expect(res.packsToWholesale).toBe(0);
  });

  it("applies wholesale immediately for WHOLESALE role and bulk price when SKU hits bulkMinQty", () => {
    const res = evaluateCartPricing(
      [
        {
          productId: "tbone-pm",
          quantity: 5,
          priceBaht: 325,
          wholesalePriceBaht: 260,
          bulkPriceBaht: 235,
          bulkMinQty: 5,
        },
        {
          productId: "saba",
          quantity: 1,
          priceBaht: 95,
          wholesalePriceBaht: 76,
          bulkPriceBaht: null,
          bulkMinQty: 0,
        },
      ],
      { isWholesaleRole: true, wholesaleMinPacks: 10 }
    );
    expect(res.lines[0]?.appliedTier).toBe("BULK");
    expect(res.lines[0]?.unitPriceBaht).toBe(235);
    expect(res.lines[1]?.appliedTier).toBe("WHOLESALE");
    expect(res.lines[1]?.unitPriceBaht).toBe(76);
    expect(res.subtotalBaht).toBe(5 * 235 + 76);
  });

  it("evaluates coupons and gross margins cleanly with decimals", () => {
    const res = evaluateCoupon(fixedCoupon, 356.25, new Date("2026-11-21T00:00:00Z"));
    expect(res.valid).toBe(true);
    expect(res.discountBaht).toBe(50);

    const m = calculateGrossMargin(1000, 580);
    expect(m.grossProfitBaht).toBe(420);
    expect(m.marginPercent).toBe(42);
  });
});
