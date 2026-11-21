export type CouponType = "FIXED" | "PERCENT" | "FREE_SHIP";

export interface CouponRecord {
  code: string;
  type: CouponType;
  value: number;
  minSubtotal: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: Date | null;
  isActive: boolean;
}

export interface CouponEvaluation {
  valid: boolean;
  discountBaht: number;
  freeShipping: boolean;
  reason?: string;
}

export function evaluateCoupon(
  coupon: CouponRecord | null,
  subtotalBaht: number,
  now: Date = new Date()
): CouponEvaluation {
  if (!coupon || !coupon.isActive) {
    return { valid: false, discountBaht: 0, freeShipping: false, reason: "ไม่พบโค้ดส่วนลดหรือโค้ดถูกปิดใช้งาน" };
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < now.getTime()) {
    return { valid: false, discountBaht: 0, freeShipping: false, reason: "โค้ดส่วนลดหมดอายุแล้ว" };
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, discountBaht: 0, freeShipping: false, reason: "โค้ดส่วนลดถูกใช้ครบสิทธิ์แล้ว" };
  }
  if (subtotalBaht < coupon.minSubtotal) {
    return {
      valid: false,
      discountBaht: 0,
      freeShipping: false,
      reason: `ยอดสินค้าขั้นต่ำ ${coupon.minSubtotal.toLocaleString("th-TH")} บาท`,
    };
  }

  if (coupon.type === "FREE_SHIP") {
    return { valid: true, discountBaht: 0, freeShipping: true };
  }
  if (coupon.type === "PERCENT") {
    const raw = Math.round((subtotalBaht * Math.min(100, Math.max(0, coupon.value))) / 100);
    return { valid: true, discountBaht: Math.min(subtotalBaht, raw), freeShipping: false };
  }
  return {
    valid: true,
    discountBaht: Math.min(subtotalBaht, Math.max(0, coupon.value)),
    freeShipping: false,
  };
}

export interface MarginResult {
  grossProfitBaht: number;
  marginPercent: number;
}

export function calculateGrossMargin(
  revenueBaht: number,
  costBaht: number
): MarginResult {
  const grossProfitBaht = revenueBaht - costBaht;
  const marginPercent =
    revenueBaht > 0
      ? Math.round((grossProfitBaht / revenueBaht) * 1000) / 10
      : 0;
  return { grossProfitBaht, marginPercent };
}
