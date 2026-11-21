"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, Clock } from "lucide-react";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/domain/order";
import { OrderDetailCard, type AdminOrderRow } from "./OrderDetailCard";

export function OrdersManager({ userRole }: { userRole: string }) {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCsv, setBulkCsv] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    const params = new URLSearchParams({ status: statusFilter, q });
    const res = await fetch(`/api/admin/orders?${params.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as { orders: AdminOrderRow[] };
      setOrders(data.orders);
    }
  }, [statusFilter, q]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function saveOrder(orderNo: string, formEl: HTMLFormElement) {
    const fd = new FormData(formEl);
    const res = await fetch(`/api/admin/orders/${orderNo}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: fd.get("status"),
        carrier: String(fd.get("carrier") || ""),
        trackingNo: String(fd.get("trackingNo") || ""),
        codSettled: fd.get("codSettled") === "on",
      }),
    });
    const data = (await res.json()) as { error?: string };
    setMsg(res.ok ? `อัปเดต ${orderNo} เรียบร้อย` : data.error || "อัปเดตไม่สำเร็จ");
    if (res.ok) await loadOrders();
  }

  async function reviewSlip(orderNo: string, paymentId: string, decision: "APPROVE" | "REJECT") {
    const res = await fetch(`/api/admin/orders/${orderNo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId,
        decision,
        rejectReason: decision === "REJECT" ? "สลิปไม่ชัดเจนหรือยอดไม่ตรง" : "",
      }),
    });
    if (res.ok) {
      setMsg(decision === "APPROVE" ? `อนุมัติสลิป ${orderNo} แล้ว` : `ปฏิเสธสลิป ${orderNo} แล้ว`);
      await loadOrders();
    }
  }

  async function runBulkTracking(e: React.FormEvent) {
    e.preventDefault();
    const rows = bulkCsv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [orderNo, carrier, trackingNo] = line.split(",").map((s) => s.trim());
        return {
          orderNo: orderNo || "",
          carrier: carrier || "รถเย็น",
          trackingNo: trackingNo || "",
        };
      })
      .filter((r) => r.orderNo && r.trackingNo);

    if (rows.length === 0) return;
    const res = await fetch("/api/admin/orders/bulk-tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    const data = (await res.json()) as {
      updated?: number;
      failed?: number;
      error?: string;
    };
    setMsg(
      res.ok
        ? `อัปเดตเลขพัสดุสำเร็จ ${data.updated} รายการ (ผิดพลาด ${data.failed})`
        : data.error || "นำเข้าไม่สำเร็จ"
    );
    setBulkOpen(false);
    setBulkCsv("");
    await loadOrders();
  }

  async function cancelExpired() {
    const res = await fetch("/api/cron/cancel-expired", { method: "POST" });
    const data = (await res.json()) as { cancelledCount?: number };
    setMsg(`ยกเลิกออเดอร์ค้างโอนเกินกำหนดแล้ว ${data.cancelledCount ?? 0} รายการ`);
    await loadOrders();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-3xl">
            จัดการคำสั่งซื้อ & จัดส่งรถเย็น
          </h1>
          <p className="text-sm text-sb-mute">
            ตรวจสลิป อัปเดตสถานะ พิมพ์ใบปะหน้า และแจ้งเลขพัสดุผ่าน LINE OA
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setBulkOpen((v) => !v)} className="sb-btn-dark text-xs">
            <Upload className="w-4 h-4" /> นำเข้าเลขพัสดุ CSV
          </button>
          {userRole !== "PACKER" && (
            <button type="button" onClick={cancelExpired} className="sb-btn-ghost min-h-[40px] px-4 text-xs">
              <Clock className="w-4 h-4" /> ล้างออเดอร์ค้างโอน 24 ชม.
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className="rounded-xl bg-sb-panel2 border border-sb-pink/40 px-4 py-2.5 text-sm text-sb-pink2">
          {msg}
        </div>
      )}

      {bulkOpen && (
        <form onSubmit={runBulkTracking} className="sb-panel space-y-3">
          <p className="font-display font-bold text-sm">
            นำเข้าเลขพัสดุหลายรายการ (รูปแบบ: เลขออเดอร์,ขนส่ง,เลขพัสดุ ต่อ 1 บรรทัด)
          </p>
          <textarea
            rows={4}
            value={bulkCsv}
            onChange={(e) => setBulkCsv(e.target.value)}
            placeholder="SB261121-AB12,Inter Express,IE123456789"
            className="sb-input font-mono text-xs"
          />
          <button type="submit" className="sb-btn text-sm">
            อัปเดตและส่งแจ้งเตือนลูกค้า
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาเลขคำสั่งซื้อ / ชื่อ / เบอร์โทร..."
          className="sb-input max-w-xs text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sb-input max-w-[220px] text-sm"
        >
          <option value="all">ทุกสถานะ</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="sb-panel text-center text-sb-mute py-10">
            ไม่พบคำสั่งซื้อตามเงื่อนไข
          </div>
        ) : (
          orders.map((o) => (
            <OrderDetailCard
              key={o.orderNo}
              order={o}
              userRole={userRole}
              onSave={saveOrder}
              onReviewSlip={reviewSlip}
            />
          ))
        )}
      </div>
    </div>
  );
}
