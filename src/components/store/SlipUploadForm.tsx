"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import {
  formatFileSize,
  resizeSlipImageToDataUrl,
} from "@/lib/client-image-resize";

export function SlipUploadForm({
  orderNo,
  onStatusChange,
}: {
  orderNo: string;
  onStatusChange: (status: string) => void;
}) {
  const [slipBase64, setSlipBase64] = useState<string | null>(null);
  const [sizeInfo, setSizeInfo] = useState<string | null>(null);
  const [resizing, setResizing] = useState(false);
  const [transRef, setTransRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setResizing(true);
    setFeedback(null);
    setSizeInfo(null);
    try {
      const resized = await resizeSlipImageToDataUrl(file);
      setSlipBase64(resized.dataUrl);
      setSizeInfo(
        resized.originalBytes > resized.resizedBytes
          ? `ย่อรูปสลิปแล้ว ${formatFileSize(resized.resizedBytes)} (จาก ${formatFileSize(resized.originalBytes)})`
          : `ขนาดไฟล์สลิป ${formatFileSize(resized.resizedBytes)}`
      );
    } catch {
      setFeedback({ ok: false, msg: "ไม่สามารถอ่านหรือย่อไฟล์รูปสลิปนี้ได้" });
    } finally {
      setResizing(false);
    }
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
          transRef: transRef.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        orderStatus?: string;
        reason?: string;
        error?: string;
      };
      if (!res.ok) {
        setFeedback({ ok: false, msg: data.error || "ส่งสลิปไม่สำเร็จ" });
        return;
      }

      if (data.orderStatus) onStatusChange(data.orderStatus);
      if (data.orderStatus === "PAID") {
        setFeedback({
          ok: true,
          msg: "ตรวจสอบสลิปผ่านเรียบร้อย! ระบบยืนยันการชำระเงินและตัดสต็อกให้คุณแล้วครับ",
        });
      } else if (data.orderStatus === "PENDING_PAYMENT") {
        setFeedback({
          ok: false,
          msg: data.reason || "สลิปไม่ผ่านการตรวจสอบ กรุณาตรวจสอบยอดโอน/บัญชีผู้รับแล้วแนบใหม่อีกครั้ง",
        });
      } else {
        setFeedback({
          ok: true,
          msg: data.reason || "ได้รับสลิปเรียบร้อยแล้ว แอดมินจะตรวจสอบยอดและยืนยันตัดสต็อกให้เร็วที่สุดครับ",
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
      <div>
        <h2 className="font-display font-bold text-xl">แนบสลิปการโอนเงิน</h2>
        <p className="text-xs text-sb-mute mt-0.5">
          ระบบจะตรวจสอบยอดโอนและบัญชีผู้รับ ก่อนยืนยันออเดอร์และตัดสต็อกให้ทันที
        </p>
      </div>

      <label className="block border-2 border-dashed border-sb-line rounded-2xl p-5 text-center cursor-pointer hover:border-sb-pink transition">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
        />
        {resizing ? (
          <Loader2 className="w-7 h-7 mx-auto text-sb-pink mb-2 animate-spin" />
        ) : (
          <Upload className="w-7 h-7 mx-auto text-sb-pink mb-2" />
        )}
        <span className="text-sm font-semibold block">
          {resizing
            ? "กำลังย่อรูปสลิป..."
            : slipBase64
              ? "เลือกรูปสลิปแล้ว (คลิกเพื่อเปลี่ยน)"
              : "แตะเพื่อเลือกรูปสลิป"}
        </span>
        {sizeInfo && <span className="text-xs text-sb-ok block mt-1">{sizeInfo}</span>}
        {slipBase64 && (
          <img src={slipBase64} alt="ตัวอย่างสลิป" className="mt-3 max-h-40 mx-auto rounded-lg" />
        )}
      </label>

      <label className="block space-y-1 text-xs font-semibold">
        <span>เลขอ้างอิงสลิป (ไม่บังคับ)</span>
        <input
          value={transRef}
          onChange={(e) => setTransRef(e.target.value)}
          placeholder="เช่น 20261128XXXXXX"
          className="sb-input min-h-[40px] text-sm"
        />
      </label>

      {feedback && (
        <p
          className={`text-sm rounded-xl p-3 ${
            feedback.ok ? "bg-emerald-950 text-emerald-200" : "bg-red-950 text-red-200"
          }`}
        >
          {feedback.msg}
        </p>
      )}

      <button type="submit" disabled={!slipBase64 || busy || resizing} className="sb-btn w-full">
        {busy ? "กำลังตรวจสอบสลิป..." : "ยืนยันการส่งสลิป"}
      </button>
    </form>
  );
}
