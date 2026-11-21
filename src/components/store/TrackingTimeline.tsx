"use client";

import { useState } from "react";
import { formatBaht, formatDateTimeTH, STATUS_BADGE_STYLE } from "@/lib/format";

interface TrackedOrder {
  orderNo: string;
  status: string;
  statusLabel: string;
  customerName: string;
  totalBaht: number;
  carrier: string;
  trackingNo: string;
  createdAt: string;
  items: Array<{ productName: string; quantity: number; lineTotalBaht: number }>;
  events: Array<{ status: string; note: string; createdAt: string }>;
}

const TIMELINE_STEPS = [
  { key: "CREATED", label: "รับคำสั่งซื้อ", match: ["PENDING_PAYMENT", "SLIP_SUBMITTED", "CONFIRMED", "PAID", "PACKING", "SHIPPED", "DELIVERED"] },
  { key: "PAID", label: "ยืนยันชำระเงิน / ออเดอร์", match: ["CONFIRMED", "PAID", "PACKING", "SHIPPED", "DELIVERED"] },
  { key: "PACKING", label: "แพ็คลงกล่องโฟมเจลเย็น", match: ["PACKING", "SHIPPED", "DELIVERED"] },
  { key: "SHIPPED", label: "ส่งออกรถเย็นแล้ว", match: ["SHIPPED", "DELIVERED"] },
  { key: "DELIVERED", label: "จัดส่งสำเร็จ", match: ["DELIVERED"] },
];

export function TrackingTimeline({ initialOrderNo = "" }: { initialOrderNo?: string }) {
  const [orderNo, setOrderNo] = useState(initialOrderNo);
  const [phoneLast4, setPhoneLast4] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch("/api/store/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo, phoneLast4 }),
      });
      const data = (await res.json()) as { order?: TrackedOrder; error?: string };
      if (!res.ok || !data.order) {
        setError(data.error || "ไม่พบคำสั่งซื้อ");
      } else {
        setOrder(data.order);
      }
    } catch {
      setError("ไม่สามารถเชื่อมต่อระบบได้");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="sb-panel grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_auto] gap-3 items-end"
      >
        <label className="space-y-1.5 text-sm font-semibold">
          <span>เลขคำสั่งซื้อ</span>
          <input
            required
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value.toUpperCase())}
            placeholder="SB261121-AB12"
            className="sb-input uppercase"
          />
        </label>
        <label className="space-y-1.5 text-sm font-semibold">
          <span>เบอร์โทร 4 ตัวท้าย</span>
          <input
            required
            maxLength={4}
            inputMode="numeric"
            value={phoneLast4}
            onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, ""))}
            placeholder="1234"
            className="sb-input"
          />
        </label>
        <button type="submit" disabled={busy} className="sb-btn">
          {busy ? "กำลังค้นหา..." : "ติดตามพัสดุ"}
        </button>
      </form>

      {error && (
        <div className="sb-panel bg-red-950/40 border-red-800/50 text-red-200 text-sm">
          {error}
        </div>
      )}

      {order && (
        <div className="sb-panel space-y-6">
          <div className="flex flex-wrap justify-between items-start gap-3">
            <div>
              <p className="font-display font-extrabold text-2xl text-sb-pink2">
                {order.orderNo}
              </p>
              <p className="text-sm text-sb-mute">
                คุณ{order.customerName} · สั่งเมื่อ {formatDateTimeTH(order.createdAt)} · ยอด{" "}
                {formatBaht(order.totalBaht)}
              </p>
            </div>
            <span className={`px-3.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE_STYLE[order.status] ?? ""}`}>
              {order.statusLabel}
            </span>
          </div>

          {order.trackingNo && (
            <div className="rounded-xl bg-sb-panel2 p-4 flex flex-wrap justify-between gap-2 text-sm">
              <span>
                ขนส่งรถเย็น: <b>{order.carrier || "รถควบคุมอุณหภูมิ"}</b>
              </span>
              <span>
                เลขพัสดุ: <b className="text-sb-pink2">{order.trackingNo}</b>
              </span>
            </div>
          )}

          {order.status === "CANCELLED" ? (
            <p className="rounded-xl bg-neutral-900 p-4 text-sm text-sb-mute">
              คำสั่งซื้อนี้ถูกยกเลิก หากมีข้อสงสัยติดต่อผ่านบอสบอทหรือ LINE OA ได้เลยครับ
            </p>
          ) : (
            <ol className="space-y-4">
              {TIMELINE_STEPS.map((step, idx) => {
                const done = step.match.includes(order.status);
                return (
                  <li key={step.key} className="flex items-start gap-3.5">
                    <div
                      className={`w-7 h-7 rounded-full shrink-0 grid place-items-center text-xs font-bold ${
                        done
                          ? "bg-sb-ok text-[#062214]"
                          : "bg-sb-panel2 border border-sb-line text-sb-mute"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <p className={`font-display font-bold ${done ? "text-sb-ink" : "text-sb-mute"}`}>
                        {step.label}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="border-t border-sb-line pt-4 space-y-1.5 text-sm">
            <p className="font-display font-bold">รายการสินค้า</p>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sb-mute">
                <span>{item.productName} × {item.quantity}</span>
                <span>{formatBaht(item.lineTotalBaht)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
