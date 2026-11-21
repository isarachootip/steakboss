"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { formatBaht } from "@/lib/format";

interface ReportPayload {
  summary: {
    totalOrders: number;
    liveOrders: number;
    cancelledOrders: number;
    grossRevenueBaht: number;
    aovBaht: number;
    uniqueCustomers: number;
    repeatCustomers: number;
    repeatRatePercent: number;
    totalCostBaht?: number;
    grossProfitBaht?: number;
    marginPercent?: number;
  };
  channels: { webRevenueBaht: number; lineRevenueBaht: number };
  reconciliation: {
    promptpayVerifiedBaht: number;
    promptpayPendingBaht: number;
    codPendingSettlementBaht: number;
    codSettledBaht: number;
  };
  dailySales: Array<{ date: string; revenueBaht: number; orders: number }>;
  topProducts: Array<{ productName: string; qty: number; revenueBaht: number }>;
  lowStockAlerts: Array<{ id: string; name: string; sku: string; stockQty: number }>;
}

export function ReportsDashboard() {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [report, setReport] = useState<ReportPayload | null>(null);

  useEffect(() => {
    fetch(`/api/admin/reports/overview?range=${range}`)
      .then((r) => r.json())
      .then((d: { report?: ReportPayload }) => {
        if (d.report) setReport(d.report);
      })
      .catch(() => {});
  }, [range]);

  const maxProductRev = Math.max(1, ...(report?.topProducts.map((p) => p.revenueBaht) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-3xl">รายงานยอดขาย กำไร & กระทบยอด</h1>
          <p className="text-sm text-sb-mute">วิเคราะห์ยอดขายตามช่องทาง ต้นทุน COGS และการกระทบยอด PromptPay / COD</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["7d", "30d", "90d", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold border ${
                range === r ? "bg-sb-ink text-sb-bg border-sb-ink" : "border-sb-line"
              }`}
            >
              {r === "all" ? "ทั้งหมด" : `${r}`}
            </button>
          ))}
          <a href="/api/admin/reports/export" className="sb-btn min-h-[38px] px-4 text-xs">
            <Download className="w-4 h-4" /> Export CSV (Excel)
          </a>
        </div>
      </div>

      {!report ? (
        <div className="sb-panel text-center text-sb-mute py-10">กำลังคำนวณรายงาน...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sb-panel">
              <p className="text-xs text-sb-mute">ยอดขายสุทธิ</p>
              <p className="font-display font-extrabold text-2xl mt-1">{formatBaht(report.summary.grossRevenueBaht)}</p>
              <p className="text-xs text-sb-mute mt-0.5">{report.summary.liveOrders} ออเดอร์ (ยกเลิก {report.summary.cancelledOrders})</p>
            </div>
            <div className="sb-panel">
              <p className="text-xs text-sb-mute">ยอดเฉลี่ยต่อบิล (AOV)</p>
              <p className="font-display font-extrabold text-2xl mt-1">{formatBaht(report.summary.aovBaht)}</p>
            </div>
            <div className="sb-panel">
              <p className="text-xs text-sb-mute">อัตราซื้อซ้ำ (Repeat Rate)</p>
              <p className="font-display font-extrabold text-2xl mt-1">{report.summary.repeatRatePercent}%</p>
              <p className="text-xs text-sb-mute mt-0.5">{report.summary.repeatCustomers}/{report.summary.uniqueCustomers} ราย</p>
            </div>
            {report.summary.grossProfitBaht !== undefined ? (
              <div className="sb-panel border-emerald-700/40 bg-emerald-950/25">
                <p className="text-xs text-emerald-300">กำไรขั้นต้น (COGS)</p>
                <p className="font-display font-extrabold text-2xl text-emerald-200 mt-1">
                  {formatBaht(report.summary.grossProfitBaht)}
                </p>
                <p className="text-xs text-emerald-300/80 mt-0.5">Margin {report.summary.marginPercent}%</p>
              </div>
            ) : (
              <div className="sb-panel">
                <p className="text-xs text-sb-mute">ช่องทางขาย</p>
                <p className="text-sm font-bold mt-1">Web: {formatBaht(report.channels.webRevenueBaht)}</p>
                <p className="text-sm font-bold text-[#06C755]">LINE: {formatBaht(report.channels.lineRevenueBaht)}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="sb-panel space-y-3">
              <h2 className="font-display font-bold text-lg">กระทบยอดการเงิน (PromptPay vs COD)</h2>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-sb-line">
                  <tr><td className="py-2.5 text-sb-mute">PromptPay ตรวจรับยอดแล้ว</td><td className="py-2.5 text-right font-bold text-sb-ok">{formatBaht(report.reconciliation.promptpayVerifiedBaht)}</td></tr>
                  <tr><td className="py-2.5 text-sb-mute">PromptPay รอโอน / รอตรวจสลิป</td><td className="py-2.5 text-right font-bold text-amber-300">{formatBaht(report.reconciliation.promptpayPendingBaht)}</td></tr>
                  <tr><td className="py-2.5 text-sb-mute">COD รอขนส่งโอนคืน</td><td className="py-2.5 text-right font-bold text-sb-orange">{formatBaht(report.reconciliation.codPendingSettlementBaht)}</td></tr>
                  <tr><td className="py-2.5 text-sb-mute">COD กระทบยอดรับเงินแล้ว</td><td className="py-2.5 text-right font-bold">{formatBaht(report.reconciliation.codSettledBaht)}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="sb-panel space-y-3">
              <h2 className="font-display font-bold text-lg">สินค้าขายดีตามยอดขาย</h2>
              {report.topProducts.length === 0 ? (
                <p className="text-sm text-sb-mute py-6 text-center">ยังไม่มียอดขายในช่วงเวลานี้</p>
              ) : (
                <div className="space-y-3">
                  {report.topProducts.map((p) => (
                    <div key={p.productName} className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>{p.productName} ({p.qty} ชิ้น)</span>
                        <span className="font-bold">{formatBaht(p.revenueBaht)}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-sb-panel2 overflow-hidden">
                        <div
                          className="h-full bg-sb-pink rounded-full"
                          style={{ width: `${Math.round((p.revenueBaht / maxProductRev) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
