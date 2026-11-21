import { describe, expect, it } from "vitest";
import { calculateGrossMargin, evaluateCoupon } from "@/domain/pricing";

describe("pricing & coupon domain", () => {
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

  it("applies valid fixed coupon when subtotal meets minimum", () => {
    const res = evaluateCoupon(fixedCoupon, 350, new Date("2026-11-21T00:00:00Z"));
    expect(res.valid).toBe(true);
    expect(res.discountBaht).toBe(50);
  });

  it("rejects coupon below minimum subtotal", () => {
    const res = evaluateCoupon(fixedCoupon, 250, new Date("2026-11-21T00:00:00Z"));
    expect(res.valid).toBe(false);
    expect(res.discountBaht).toBe(0);
  });

  it("rejects expired or exhausted coupon", () => {
    const expired = evaluateCoupon(fixedCoupon, 500, new Date("2029-01-01T00:00:00Z"));
    expect(expired.valid).toBe(false);

    const exhausted = evaluateCoupon({ ...fixedCoupon, usedCount: 100 }, 500, new Date("2026-11-21T00:00:00Z"));
    expect(exhausted.valid).toBe(false);
  });

  it("calculates gross profit and margin percentage", () => {
    const m = calculateGrossMargin(1000, 580);
    expect(m.grossProfitBaht).toBe(420);
    expect(m.marginPercent).toBe(42);
  });
});
