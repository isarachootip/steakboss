"use client";

import Link from "next/link";
import { RotateCcw, Truck } from "lucide-react";
import { formatBaht, formatDateTimeTH, STATUS_BADGE_STYLE } from "@/lib/format";
import { ORDER_STATUS_LABELS, isOrderStatus } from "@/domain/order";

export interface AccountOrderRow {
  orderNo: string;
  status: string;
  totalBaht: number;
  createdAt: string;
  carrier: string;
  trackingNo: string;
  items: Array<{
    productId: string;
    productName: string;
    unitPriceBaht: number;
    quantity: number;
  }>;
}

export function AccountOrderCard({
  order,
  onReorder,
}: {
  order: AccountOrderRow;
  onReorder: (order: AccountOrderRow) => void;
}) {
  return (
    <div className="sb-panel space-y-3">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div>
          <span className="font-display font-bold text-lg text-sb-pink2">{order.orderNo}</span>
          <span className="text-xs text-sb-mute ml-2">{formatDateTimeTH(order.createdAt)}</span>
        </div>
        <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE_STYLE[order.status] ?? ""}`}>
          {isOrderStatus(order.status) ? ORDER_STATUS_LABELS[order.status] : order.status}
        </span>
      </div>
      <div className="text-sm text-sb-mute space-y-0.5">
        {order.items.map((it, idx) => (
          <p key={idx}>• {it.productName} × {it.quantity}</p>
        ))}
      </div>
      {order.trackingNo && (
        <p className="text-xs text-sb-pink2">
          ขนส่ง: {order.carrier || "รถเย็น"} · เลขพัสดุ: <b className="font-mono">{order.trackingNo}</b>
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-sb-line">
        <span className="font-display font-bold text-lg">{formatBaht(order.totalBaht)}</span>
        <div className="flex flex-wrap gap-2">
          {order.status === "PENDING_PAYMENT" && (
            <Link href={`/orders/${order.orderNo}/pay`} className="sb-btn min-h-[36px] px-4 text-xs">
              ชำระเงิน / แนบสลิป
            </Link>
          )}
          <Link href={`/track?orderNo=${order.orderNo}`} className="sb-btn-dark text-xs inline-flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" /> ติดตามพัสดุ
          </Link>
          <button type="button" onClick={() => onReorder(order)} className="sb-btn-dark text-xs">
            <RotateCcw className="w-3.5 h-3.5" /> สั่งซ้ำ
          </button>
        </div>
      </div>
    </div>
  );
}
