import { roundBaht } from "./money";

export type DeliveryMethod = "COLD_CHAIN" | "FACTORY_PICKUP";
export type ShippingZone = "BKK" | "UPC" | "PICKUP";
export type PaymentMethod = "PROMPTPAY" | "COD";

export interface ShippingRates {
  bkkShipBaht: number;
  upcShipBaht: number;
  freeShipThreshold: number;
  codFeeBaht: number;
}

export interface ShippingQuoteInput {
  subtotalBaht: number;
  discountBaht?: number;
  freeShippingByCoupon?: boolean;
  deliveryMethod: DeliveryMethod;
  postalCode?: string;
  paymentMethod: PaymentMethod;
  rates: ShippingRates;
}

export interface ShippingQuoteResult {
  zone: ShippingZone | null;
  shippingBaht: number | null;
  codFeeBaht: number;
  totalBaht: number | null;
  amountToFreeShipping: number;
}

const BKK_PREFIXES = new Set(["10", "11", "12", "73", "74"]);

export const ZONE_LABELS: Record<ShippingZone, string> = {
  BKK: "กรุงเทพฯ และปริมณฑล",
  UPC: "ต่างจังหวัด",
  PICKUP: "รับเองที่หน้าร้าน (รามอินทรา 57 กทม.)",
};

export function resolveShippingZone(postalCode: string): "BKK" | "UPC" | null {
  const clean = postalCode.trim();
  if (!/^\d{5}$/.test(clean)) return null;
  return BKK_PREFIXES.has(clean.slice(0, 2)) ? "BKK" : "UPC";
}

export function calculateShippingQuote(
  input: ShippingQuoteInput
): ShippingQuoteResult {
  const discount = roundBaht(
    Math.max(0, Math.min(input.subtotalBaht, input.discountBaht ?? 0))
  );
  const netSubtotal = roundBaht(Math.max(0, input.subtotalBaht - discount));
  const amountToFreeShipping = roundBaht(
    Math.max(0, input.rates.freeShipThreshold - netSubtotal)
  );
  const codFeeBaht = input.paymentMethod === "COD" ? input.rates.codFeeBaht : 0;

  if (input.deliveryMethod === "FACTORY_PICKUP") {
    return {
      zone: "PICKUP",
      shippingBaht: 0,
      codFeeBaht,
      totalBaht: roundBaht(netSubtotal + codFeeBaht),
      amountToFreeShipping: 0,
    };
  }

  const zone = resolveShippingZone(input.postalCode ?? "");
  if (!zone) {
    return {
      zone: null,
      shippingBaht: null,
      codFeeBaht,
      totalBaht: null,
      amountToFreeShipping,
    };
  }

  const isFree =
    Boolean(input.freeShippingByCoupon) ||
    netSubtotal >= input.rates.freeShipThreshold;
  const baseShipping =
    zone === "BKK" ? input.rates.bkkShipBaht : input.rates.upcShipBaht;
  const shippingBaht = isFree ? 0 : baseShipping;

  return {
    zone,
    shippingBaht,
    codFeeBaht,
    totalBaht: roundBaht(netSubtotal + shippingBaht + codFeeBaht),
    amountToFreeShipping: isFree ? 0 : amountToFreeShipping,
  };
}
