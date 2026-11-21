import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { buildExecutiveReport } from "@/services/report.service";
import { formatBaht, formatDateTimeTH, STATUS_BADGE_STYLE } from "@/lib/format";
import { ORDER_STATUS_LABELS, isOrderStatus } from "@/domain/order";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const session = await getSession();
  const isOwner = session?.role === "OWNER";

  const [report, recentOrders, humanThreads] = await Promise.all([
    buildExecutiveReport("30d", isOwner),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.chatThread.count({ where: { mode: "HUMAN" } }),
  ]);

  const pendingOps = recentOrders.filter((o) =>
    ["SLIP_SUBMITTED", "CONFIRMED", "PAID", "PACKING"].includes(o.status)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-3xl">ภาพรวมร้าน Steakboss</h1>
          <p className="text-sm text-sb-mute">สรุปผลงาน 30 วันล่าสุด · สิทธิ์ {session?.role}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/orders" className="sb-btn text-sm">จัดการออเดอร์</Link>
          <Link href="/admin/products" className="sb-btn-ghost text-sm">สต็อกสินค้า</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="sb-panel">
          <p className="text-xs text-sb-mute">ยอดขาย 30 วัน</p>
          <p className="font-display font-extrabold text-2xl sm:text-3xl mt-1">
            {formatBaht(report.summary.grossRevenueBaht)}
          </p>
        </div>
        <div className="sb-panel">
          <p className="text-xs text-sb-mute">ออเดอร์ทั้งหมด</p>
          <p className="font-display font-extrabold text-2xl sm:text-3xl mt-1">
            {report.summary.liveOrders}
          </p>
        </div>
        <div className="sb-panel">
          <p className="text-xs text-sb-mute">รอตรวจสลิป / รอแพ็ค</p>
          <p className="font-display font-extrabold text-2xl sm:text-3xl mt-1 text-sb-orange">
            {pendingOps}
          </p>
        </div>
        <div className="sb-panel">
          <p className="text-xs text-sb-mute">แชทรอแอดมินตอบ</p>
          <p className="font-display font-extrabold text-2xl sm:text-3xl mt-1 text-sb-pink2">
            {humanThreads}
          </p>
        </div>
      </div>

      {isOwner && report.summary.grossProfitBaht !== undefined && (
        <div className="sb-panel bg-emerald-950/30 border-emerald-800/40 flex flex-wrap justify-between gap-4">
          <div>
            <p className="text-xs text-emerald-300">กำไรขั้นต้น (เฉพาะ OWNER)</p>
            <p className="font-display font-extrabold text-2xl text-emerald-200">
              {formatBaht(report.summary.grossProfitBaht)} ({report.summary.marginPercent}%)
            </p>
          </div>
          <Link href="/admin/reports" className="sb-btn-dark text-sm self-center">
            ดูรายงานฉบับเต็ม →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="sb-panel space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-display font-bold text-lg">คำสั่งซื้อล่าสุด</h2>
            <Link href="/admin/orders" className="text-xs text-sb-pink2 hover:underline">
              ดูทั้งหมด
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-sb-mute py-6 text-center">ยังไม่มีคำสั่งซื้อ</p>
          ) : (
            <div className="divide-y divide-sb-line">
              {recentOrders.map((o) => (
                <div key={o.orderNo} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-display font-bold">{o.orderNo}</p>
                    <p className="text-xs text-sb-mute">
                      {o.customerName} · {formatDateTimeTH(o.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatBaht(o.totalBaht)}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_BADGE_STYLE[o.status] ?? ""}`}>
                      {isOrderStatus(o.status) ? ORDER_STATUS_LABELS[o.status] : o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sb-panel space-y-3">
          <h2 className="font-display font-bold text-lg">แจ้งเตือนสต็อกต่ำ</h2>
          {report.lowStockAlerts.length === 0 ? (
            <p className="text-sm text-sb-ok py-6 text-center">สต็อกสินค้าทุก SKU อยู่ในระดับปกติ</p>
          ) : (
            <div className="divide-y divide-sb-line">
              {report.lowStockAlerts.map((p) => (
                <div key={p.id} className="py-2.5 flex justify-between text-sm">
                  <span>{p.name} ({p.sku})</span>
                  <span className="font-bold text-sb-orange">เหลือ {p.stockQty} ซอง</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
