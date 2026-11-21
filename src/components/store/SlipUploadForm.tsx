"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

export function SlipUploadForm({
  orderNo,
  onStatusChange,
}: {
  orderNo: string;
  onStatusChange: (status: string) => void;
}) {
  const [slipBase64, setSlipBase64] = useState<string | null>(null);
  const [transRef, setTransRef] = useState("");
  const [autoVerifyDemo, setAutoVerifyDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setSlipBase64(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function submitSlip(e: React.FormEvent) {
    e.preventDefault();
    if (!slipBase64) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/store/orders/${orderNo}/slip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slipBase64,
          transRef: transRef || undefined,
          autoVerifyDemo,
        }),
      });
      const data = (await res.json()) as { orderStatus?: string; error?: string };
      if (!res.ok) {
        setFeedback({ ok: false, msg: data.error || "ส่งสลิปไม่สำเร็จ" });
      } else {
        if (data.orderStatus) onStatusChange(data.orderStatus);
        setFeedback({
          ok: true,
          msg:
            data.orderStatus === "PAID"
              ? "ตรวจสอบสลิปสำเร็จ! ระบบยืนยันการชำระเงินแล้ว"
              : "ได้รับสลิปเรียบร้อย รอแอดมินตรวจสอบสักครู่ครับ",
        });
      }
    } catch {
      setFeedback({ ok: false, msg: "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submitSlip} className="sb-panel space-y-4">
      <h2 className="font-display font-bold text-xl">แนบสลิปการโอนเงิน</h2>
      <label className="block border-2 border-dashed border-sb-line rounded-2xl p-5 text-center cursor-pointer hover:border-sb-pink transition">
        <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" />
        <Upload className="w-7 h-7 mx-auto text-sb-pink mb-2" />
        <span className="text-sm font-semibold block">
          {slipBase64 ? "เลือกรูปสลิปแล้ว (คลิกเพื่อเปลี่ยน)" : "แตะเพื่อเลือกรูปสลิป"}
        </span>
        {slipBase64 && (
          <img src={slipBase64} alt="ตัวอย่างสลิป" className="mt-3 max-h-40 mx-auto rounded-lg" />
        )}
      </label>

      <label className="block space-y-1 text-xs font-semibold">
        <span>เลขอ้างอิงสลิป (ไม่บังคับ)</span>
        <input value={transRef} onChange={(e) => setTransRef(e.target.value)} placeholder="เช่น 20261121XXXXXX" className="sb-input min-h-[40px] text-sm" />
      </label>

      <label className="flex items-center gap-2 text-xs text-sb-mute">
        <input type="checkbox" checked={autoVerifyDemo} onChange={(e) => setAutoVerifyDemo(e.target.checked)} className="accent-sb-pink" />
        <span>โหมด Sandbox: จำลองตรวจสลิปผ่านอัตโนมัติทันที</span>
      </label>

      {feedback && (
        <p className={`text-sm rounded-xl p-3 ${feedback.ok ? "bg-emerald-950 text-emerald-200" : "bg-red-950 text-red-200"}`}>
          {feedback.msg}
        </p>
      )}

      <button type="submit" disabled={!slipBase64 || busy} className="sb-btn w-full">
        {busy ? "กำลังตรวจสอบสลิป..." : "ยืนยันการส่งสลิป"}
      </button>
    </form>
  );
}
