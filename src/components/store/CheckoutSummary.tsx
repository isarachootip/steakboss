"use client";

import type { CartItem } from "./CartProvider";
import { formatBaht } from "@/lib/format";
import { ZONE_LABELS, type ShippingZone } from "@/domain/shipping";

export interface QuoteSummary {
  subtotalBaht: number;
  discountBaht: number;
  couponApplied: string | null;
  couponError?: string;
  zone: ShippingZone | null;
  shippingBaht: number | null;
  codFeeBaht: number;
  totalBaht: number | null;
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
  return (
    <aside className="sb-panel bg-sb-panel2 space-y-4">
      <h2 className="font-display font-bold text-xl">สรุปคำสั่งซื้อ</h2>
      <div className="space-y-2.5 text-sm">
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between gap-2">
            <span className="text-sb-ink/90">
              {item.name} × {item.quantity}
            </span>
            <span className="font-semibold whitespace-nowrap">
              {formatBaht(item.priceBaht * item.quantity)}
            </span>
          </div>
        ))}
      </div>
      <hr className="border-sb-line" />
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-sb-mute">ยอดสินค้า</span>
          <span>{formatBaht(quote?.subtotalBaht ?? subtotalBaht)}</span>
        </div>
        {(quote?.discountBaht ?? 0) > 0 && (
          <div className="flex justify-between text-sb-ok">
            <span>ส่วนลด ({quote?.couponApplied})</span>
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
        {(quote?.codFeeBaht ?? 0) > 0 && (
          <div className="flex justify-between">
            <span className="text-sb-mute">ค่าเก็บเงินปลายทาง</span>
            <span>+{formatBaht(quote!.codFeeBaht)}</span>
          </div>
        )}
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
