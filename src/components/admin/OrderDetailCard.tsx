"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { formatBaht, formatDateTimeTH, STATUS_BADGE_STYLE } from "@/lib/format";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/domain/order";

export interface AdminOrderRow {
  orderNo: string;
  status: OrderStatus;
  channel: string;
  customerName: string;
  customerPhone: string;
  addressText: string;
  postalCode: string;
  deliveryMethod: string;
  paymentMethod: string;
  totalBaht: number;
  carrier: string;
  trackingNo: string;
  codSettled: boolean;
  note: string;
  createdAt: string;
  items: Array<{ productName: string; quantity: number; lineTotalBaht: number }>;
  payments: Array<{
    id: string;
    status: string;
    slipUrl: string | null;
    provider: string;
    rejectReason: string | null;
  }>;
}

const SLIP_GATED_STATUSES: readonly OrderStatus[] = ["PAID", "CONFIRMED", "PACKING", "SHIPPED", "DELIVERED"];

export function OrderDetailCard({
  order: o,
  userRole,
  onSave,
  onReviewSlip,
}: {
  order: AdminOrderRow;
  userRole: string;
  onSave: (orderNo: string, formEl: HTMLFormElement) => Promise<void>;
  onReviewSlip: (orderNo: string, paymentId: string, decision: "APPROVE" | "REJECT") => Promise<void>;
}) {
  const pendingSlip = o.payments.find((p) => p.status === "PENDING");
  const hasVerifiedSlip = o.payments.some((p) => p.status === "VERIFIED");
  const requiresSlipBeforeConfirm = o.paymentMethod === "PROMPTPAY" && !hasVerifiedSlip;

  return (
    <details className="sb-panel">
      <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-display font-bold text-lg text-sb-pink2">
            {o.orderNo}
          </span>
          <span className="text-xs text-sb-mute ml-2">
            {formatDateTimeTH(o.createdAt)} · {o.channel}
          </span>
          <p className="text-sm">
            {o.customerName} ({o.customerPhone})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-lg">
            {formatBaht(o.totalBaht)}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE_STYLE[o.status] ?? ""}`}
          >
            {ORDER_STATUS_LABELS[o.status]}
          </span>
        </div>
      </summary>

      <div className="mt-4 pt-4 border-t border-sb-line grid grid-cols-1 lg:grid-cols-3 gap-5 text-sm">
        <div className="space-y-2">
          <p className="font-display font-bold">สินค้า & ที่อยู่จัดส่ง</p>
          {o.items.map((it, idx) => (
            <div key={idx} className="flex justify-between text-sb-mute">
              <span>
                {it.productName} × {it.quantity}
              </span>
              <span>{formatBaht(it.lineTotalBaht)}</span>
            </div>
          ))}
          <p className="text-xs text-sb-mute pt-2">
            {o.deliveryMethod === "FACTORY_PICKUP"
              ? "รับเองที่โรงงาน อ.ป่าโมก จ.อ่างทอง"
              : `${o.addressText} ${o.postalCode}`}
          </p>
          {o.note && (
            <p className="text-xs bg-sb-panel2 rounded-lg p-2">หมายเหตุ: {o.note}</p>
          )}
          <Link
            href={`/admin/orders/${o.orderNo}/print`}
            target="_blank"
            className="sb-btn-dark text-xs mt-2"
          >
            <Printer className="w-3.5 h-3.5" /> พิมพ์ใบปะหน้า & ใบจัดสินค้า
          </Link>
        </div>

        <div className="space-y-2">
          <p className="font-display font-bold">การชำระเงิน ({o.paymentMethod})</p>
          {pendingSlip && userRole !== "PACKER" ? (
            <div className="space-y-2 bg-sb-panel2 rounded-xl p-3">
              <p className="text-xs text-amber-300 font-bold">มีสลิปรอแอดมินตรวจสอบ</p>
              {pendingSlip.slipUrl && (
                <img src={pendingSlip.slipUrl} alt="สลิป" className="max-h-40 rounded-lg" />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onReviewSlip(o.orderNo, pendingSlip.id, "APPROVE")}
                  className="sb-btn min-h-[34px] px-3 text-xs flex-1"
                >
                  อนุมัติ
                </button>
                <button
                  type="button"
                  onClick={() => onReviewSlip(o.orderNo, pendingSlip.id, "REJECT")}
                  className="sb-btn-ghost min-h-[34px] px-3 text-xs flex-1"
                >
                  ปฏิเสธ
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-sb-mute">
              {o.payments.length > 0
                ? `สถานะสลิปล่าสุด: ${o.payments[0]!.status}`
                : "ยังไม่มีการแนบสลิป"}
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(o.orderNo, e.currentTarget);
          }}
          className="space-y-2.5"
        >
          <label className="block text-xs font-semibold">
            สถานะคำสั่งซื้อ
            <select name="status" defaultValue={o.status} className="sb-input min-h-[38px] text-xs mt-1">
              {ORDER_STATUSES.map((s) => (
                <option
                  key={s}
                  value={s}
                  disabled={requiresSlipBeforeConfirm && s !== o.status && SLIP_GATED_STATUSES.includes(s)}
                >
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {requiresSlipBeforeConfirm && (
              <span className="block text-[11px] text-amber-300 mt-1 font-normal">
                ต้องมีสลิปแนบและกดอนุมัติสลิปก่อนยืนยันเป็นชำระเงินแล้ว
              </span>
            )}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input name="carrier" defaultValue={o.carrier} placeholder="ขนส่ง (เช่น Inter)" className="sb-input min-h-[38px] text-xs" />
            <input name="trackingNo" defaultValue={o.trackingNo} placeholder="เลขพัสดุ" className="sb-input min-h-[38px] text-xs" />
          </div>
          {o.paymentMethod === "COD" && userRole !== "PACKER" && (
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                name="codSettled"
                defaultChecked={o.codSettled}
                className="accent-sb-pink"
              />
              <span>ขนส่งโอนเงิน COD คืนร้านแล้ว</span>
            </label>
          )}
          <button type="submit" className="sb-btn min-h-[38px] w-full text-xs">
            บันทึกการเปลี่ยนแปลง
          </button>
        </form>
      </div>
    </details>
  );
}
