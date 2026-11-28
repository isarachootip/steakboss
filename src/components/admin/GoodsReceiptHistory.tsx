"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { formatDateTimeTH } from "@/lib/format";
import type {
  GoodsReceiptDto,
  PurchaseOrderDetailDto,
} from "@/services/purchase-order-mapper";

export function GoodsReceiptHistory({
  purchaseOrderId,
  receipts,
  canManage,
  onVoided,
}: {
  purchaseOrderId: string;
  receipts: GoodsReceiptDto[];
  canManage: boolean;
  onVoided: (updated: PurchaseOrderDetailDto, msg: string) => void;
}) {
  const [voidTargetId, setVoidTargetId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function confirmVoid(receipt: GoodsReceiptDto) {
    setErr(null);
    if (voidReason.trim().length < 2) {
      setErr("กรุณาระบุเหตุผลการยกเลิกใบรับอย่างน้อย 2 ตัวอักษร");
      return;
    }
    setSubmitting(true);
    const res = await fetch(
      `/api/admin/purchase-orders/${purchaseOrderId}/receipts/${receipt.id}/void`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReason.trim() }),
      }
    );
    const data = (await res.json()) as {
      purchaseOrder?: PurchaseOrderDetailDto;
      error?: string;
    };
    setSubmitting(false);
    if (!res.ok || !data.purchaseOrder) {
      setErr(data.error || "ยกเลิกใบรับสินค้าไม่สำเร็จ");
      return;
    }
    setVoidTargetId(null);
    setVoidReason("");
    onVoided(
      data.purchaseOrder,
      `ยกเลิกใบรับ ${receipt.receiptNo} และคืนยอดสต็อกเรียบร้อยแล้ว`
    );
  }

  return (
    <section className="sb-panel space-y-4">
      <h2 className="font-display font-bold text-lg">
        ประวัติการรับสินค้าเข้า (GRN · {receipts.length} รอบ)
      </h2>

      {receipts.length === 0 ? (
        <p className="text-sm text-sb-mute">ยังไม่มีการบันทึกรับสินค้าสำหรับใบสั่งซื้อนี้</p>
      ) : (
        <div className="space-y-3">
          {receipts.map((rec) => {
            const isVoided = rec.status === "VOIDED";
            return (
              <div
                key={rec.id}
                className={`rounded-xl border p-3.5 space-y-2.5 ${
                  isVoided
                    ? "border-neutral-700 bg-neutral-900/40 opacity-75"
                    : "border-sb-line bg-sb-bgDeep"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-sm text-sb-pink2">{rec.receiptNo}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        isVoided
                          ? "bg-neutral-800 text-neutral-300"
                          : "bg-emerald-950 text-emerald-200 border border-emerald-700/50"
                      }`}
                    >
                      {isVoided ? "ยกเลิกแล้ว (VOID)" : "รับเข้าแล้ว"}
                    </span>
                    <span className="text-sb-mute">{formatDateTimeTH(rec.receivedAt)}</span>
                    {rec.deliveryNoteNo && (
                      <span className="text-sb-ink">· ใบส่งของ: {rec.deliveryNoteNo}</span>
                    )}
                  </div>
                  {canManage && !isVoided && voidTargetId !== rec.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setVoidTargetId(rec.id);
                        setVoidReason("");
                        setErr(null);
                      }}
                      className="no-print sb-btn-dark text-xs px-2.5 text-sb-orange"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> ยกเลิกใบรับ (Void)
                    </button>
                  )}
                </div>

                {rec.note && <p className="text-xs text-sb-mute">หมายเหตุ: {rec.note}</p>}

                <div className="flex flex-wrap gap-2">
                  {rec.items.map((ri) => (
                    <span
                      key={ri.id}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-sb-panel2 border border-sb-line"
                    >
                      <span className="font-mono text-sb-pink2">{ri.skuSnapshot}</span>
                      <span className="font-bold text-sb-ok">+{ri.receivedQty}</span>
                    </span>
                  ))}
                </div>

                {isVoided && rec.voidReason && (
                  <p className="text-xs text-sb-orange">
                    เหตุผลการยกเลิก: {rec.voidReason}
                    {rec.voidedAt ? ` (${formatDateTimeTH(rec.voidedAt)})` : ""}
                  </p>
                )}

                {voidTargetId === rec.id && (
                  <div className="no-print pt-2 border-t border-sb-line space-y-2">
                    <p className="text-xs text-sb-orange font-semibold">
                      ยืนยันยกเลิกใบรับ {rec.receiptNo} (ระบบจะหักสต็อกคืนและเปิดยอดค้างรับใน PO อัตโนมัติ)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={voidReason}
                        onChange={(e) => setVoidReason(e.target.value)}
                        placeholder="ระบุเหตุผลการยกเลิก เช่น คีย์จำนวนผิด..."
                        className="sb-input text-xs flex-1 min-w-[200px]"
                      />
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => confirmVoid(rec)}
                        className="sb-btn text-xs"
                      >
                        {submitting ? "กำลังยกเลิก..." : "ยืนยัน Void"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoidTargetId(null)}
                        className="sb-btn-ghost text-xs"
                      >
                        ปิด
                      </button>
                    </div>
                    {err && <p className="text-xs text-sb-orange">{err}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
