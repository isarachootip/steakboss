import { fromSatang, multiplyBaht, roundBaht, toSatang } from "./money";

export type CouponType = "FIXED" | "PERCENT" | "FREE_SHIP";
export type PricingTier = "RETAIL" | "WHOLESALE" | "BULK";

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

export interface CartPriceLineInput {
  productId: string;
  quantity: number;
  priceBaht: number;
  wholesalePriceBaht: number;
  bulkPriceBaht: number | null;
  bulkMinQty: number;
}

export interface CartPricingContext {
  isWholesaleRole: boolean;
  wholesaleMinPacks: number;
}

export interface ResolvedCartPriceLine {
  productId: string;
  quantity: number;
  retailUnitBaht: number;
  unitPriceBaht: number;
  lineTotalBaht: number;
  retailLineTotalBaht: number;
  appliedTier: PricingTier;
}

export interface CartPricingEvaluation {
  pricingTier: PricingTier;
  qualifiesWholesale: boolean;
  totalPacks: number;
  packsToWholesale: number;
  subtotalBaht: number;
  retailSubtotalBaht: number;
  tierSavingsBaht: number;
  lines: ResolvedCartPriceLine[];
}

export function evaluateCartPricing(
  items: CartPriceLineInput[],
  ctx: CartPricingContext
): CartPricingEvaluation {
  const totalPacks = items.reduce((sum, i) => sum + Math.max(0, i.quantity), 0);
  const minPacks = Math.max(0, ctx.wholesaleMinPacks);
  const qualifiesWholesale = ctx.isWholesaleRole || (minPacks > 0 && totalPacks >= minPacks);
  const packsToWholesale = qualifiesWholesale ? 0 : minPacks > 0 ? Math.max(0, minPacks - totalPacks) : 0;

  let subtotalSatang = 0;
  let retailSubtotalSatang = 0;
  let hasBulkLine = false;
  let hasWholesaleLine = false;

  const lines: ResolvedCartPriceLine[] = items.map((item) => {
    const qty = Math.max(0, item.quantity);
    const retailUnit = roundBaht(item.priceBaht);
    let bestUnit = retailUnit;
    let appliedTier: PricingTier = "RETAIL";

    if (qualifiesWholesale && item.wholesalePriceBaht > 0 && item.wholesalePriceBaht < bestUnit) {
      bestUnit = roundBaht(item.wholesalePriceBaht);
      appliedTier = "WHOLESALE";
    }
    if (
      item.bulkPriceBaht !== null &&
      item.bulkPriceBaht > 0 &&
      item.bulkMinQty > 0 &&
      qty >= item.bulkMinQty &&
      item.bulkPriceBaht <= bestUnit
    ) {
      bestUnit = roundBaht(item.bulkPriceBaht);
      appliedTier = "BULK";
    }

    if (appliedTier === "BULK") hasBulkLine = true;
    if (appliedTier === "WHOLESALE") hasWholesaleLine = true;

    const lineTotalBaht = multiplyBaht(bestUnit, qty);
    const retailLineTotalBaht = multiplyBaht(retailUnit, qty);
    subtotalSatang += toSatang(lineTotalBaht);
    retailSubtotalSatang += toSatang(retailLineTotalBaht);

    return {
      productId: item.productId,
      quantity: qty,
      retailUnitBaht: retailUnit,
      unitPriceBaht: bestUnit,
      lineTotalBaht,
      retailLineTotalBaht,
      appliedTier,
    };
  });

  const pricingTier: PricingTier =
    qualifiesWholesale || hasWholesaleLine ? "WHOLESALE" : hasBulkLine ? "BULK" : "RETAIL";

  return {
    pricingTier,
    qualifiesWholesale,
    totalPacks,
    packsToWholesale,
    subtotalBaht: fromSatang(subtotalSatang),
    retailSubtotalBaht: fromSatang(retailSubtotalSatang),
    tierSavingsBaht: fromSatang(Math.max(0, retailSubtotalSatang - subtotalSatang)),
    lines,
  };
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
  if (toSatang(subtotalBaht) < toSatang(coupon.minSubtotal)) {
    return { valid: false, discountBaht: 0, freeShipping: false, reason: `ยอดสินค้าขั้นต่ำ ${coupon.minSubtotal.toLocaleString("th-TH")} บาท` };
  }
  if (coupon.type === "FREE_SHIP") return { valid: true, discountBaht: 0, freeShipping: true };
  if (coupon.type === "PERCENT") {
    const pct = Math.min(100, Math.max(0, coupon.value));
    const rawSatang = Math.round((toSatang(subtotalBaht) * pct) / 100);
    return { valid: true, discountBaht: fromSatang(Math.min(toSatang(subtotalBaht), rawSatang)), freeShipping: false };
  }
  return { valid: true, discountBaht: roundBaht(Math.min(subtotalBaht, Math.max(0, coupon.value))), freeShipping: false };
}

export interface MarginResult {
  grossProfitBaht: number;
  marginPercent: number;
}

export function calculateGrossMargin(revenueBaht: number, costBaht: number): MarginResult {
  const grossProfitBaht = roundBaht(revenueBaht - costBaht);
  const marginPercent = revenueBaht > 0 ? Math.round((grossProfitBaht / revenueBaht) * 1000) / 10 : 0;
  return { grossProfitBaht, marginPercent };
}
