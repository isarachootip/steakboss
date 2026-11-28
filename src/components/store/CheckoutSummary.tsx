"use client";

import type { CartItem } from "./CartProvider";
import { formatBaht } from "@/lib/format";
import { ZONE_LABELS, type ShippingZone } from "@/domain/shipping";
import type { PricingTier } from "@/domain/pricing";

export interface QuoteSummary {
  pricingTier?: PricingTier;
  tierSavingsBaht?: number;
  subtotalBaht: number;
  discountBaht: number;
  couponApplied: string | null;
  couponError?: string;
  zone: ShippingZone | null;
  shippingBaht: number | null;
  codFeeBaht: number;
  totalBaht: number | null;
  lines?: Array<{
    productId: string;
    quantity: number;
    unitPriceBaht: number;
    lineTotalBaht: number;
    appliedTier: PricingTier;
  }>;
}

export function CheckoutSummary({
  items,
  subtotalBaht,
  quote,
}: {
  items: CartItem[];
  subtotalBaht: number;
  quote: QuoteSummary | null;
}) {
  const lineMap = new Map(quote?.lines?.map((l) => [l.productId, l]) ?? []);

  return (
    <aside className="sb-panel bg-sb-panel2 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-bold text-xl">สรุปคำสั่งซื้อ</h2>
        {quote?.pricingTier && quote.pricingTier !== "RETAIL" && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sb-ok/20 text-sb-ok border border-sb-ok/40">
            {quote.pricingTier === "BULK" ? "เรตโปรยกลัง" : "เรตราคาส่ง"}
          </span>
        )}
      </div>
      <div className="space-y-2.5 text-sm">
        {items.map((item) => {
          const ql = lineMap.get(item.productId);
          const lineTotal = ql?.lineTotalBaht ?? item.priceBaht * item.quantity;
          return (
            <div key={item.productId} className="flex justify-between gap-2">
              <span className="text-sb-ink/90">
                {item.name} × {item.quantity}
              </span>
              <span className="font-semibold whitespace-nowrap">
                {formatBaht(lineTotal)}
              </span>
            </div>
          );
        })}
      </div>
      <hr className="border-sb-line" />
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-sb-mute">ยอดสินค้า</span>
          <span>{formatBaht(quote?.subtotalBaht ?? subtotalBaht)}</span>
        </div>
        {(quote?.tierSavingsBaht ?? 0) > 0 && (
          <div className="flex justify-between text-sb-ok text-xs">
            <span>ประหยัดจากราคาส่ง/โปรยกลังแล้ว</span>
            <span>{formatBaht(quote!.tierSavingsBaht!)}</span>
          </div>
        )}
        {(quote?.discountBaht ?? 0) > 0 && (
          <div className="flex justify-between text-sb-ok">
            <span>ส่วนลดคูปอง ({quote?.couponApplied})</span>
            <span>-{formatBaht(quote!.discountBaht)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-sb-mute">
            ค่าจัดส่ง{quote?.zone ? ` (${ZONE_LABELS[quote.zone]})` : ""}
          </span>
          <span>
            {quote?.shippingBaht === null || quote === null
              ? "กรอกรหัสไปรษณีย์"
              : quote.shippingBaht === 0
                ? "ฟรี"
                : formatBaht(quote.shippingBaht)}
          </span>
        </div>
      </div>
      <hr className="border-sb-line" />
      <div className="flex justify-between items-baseline">
        <span className="font-display font-bold text-lg">ยอดสุทธิ</span>
        <span className="font-display font-extrabold text-3xl text-sb-pink2">
          {quote?.totalBaht != null ? formatBaht(quote.totalBaht) : "–"}
        </span>
      </div>
    </aside>
  );
}
