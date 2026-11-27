"use client";

import { useState } from "react";
import { Upload, X } from "lucide-react";

interface ImportSummary {
  totalParsed: number;
  createdCount: number;
  updatedCount: number;
  inactiveCount: number;
}

export function CsvPriceImportModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const [csvText, setCsvText] = useState("");
  const [defaultStockQty, setDefaultStockQty] = useState(50);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(file, "utf-8");
  }

  async function submitImport(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, defaultStockQty }),
      });
      const data = (await res.json()) as {
        summary?: ImportSummary;
        error?: string;
      };
      if (!res.ok || !data.summary) {
        setErr(data.error || "นำเข้าไฟล์ CSV ไม่สำเร็จ");
        setLoading(false);
        return;
      }
      const s = data.summary;
      await onDone(
        `นำเข้าใบราคาสำเร็จ ${s.totalParsed} รายการ (เพิ่มใหม่ ${s.createdCount} · อัปเดต ${s.updatedCount} · ปิดขายชั่วคราว ${s.inactiveCount})`
      );
      onClose();
    } catch {
      setErr("การเชื่อมต่อขัดข้อง กรุณาลองใหม่");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <form
        onSubmit={submitImport}
        className="sb-panel w-full max-w-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl">
              นำเข้าใบราคาโรงงาน (CSV)
            </h2>
            <p className="text-xs text-sb-mute mt-0.5">
              อัปเดตราคาปลีก / ราคาส่ง / โปรยกลัง โดยไม่ทับสต็อกหรือราคาทุนเดิม
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-sb-panel2 grid place-items-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold space-y-1">
            <span>เลือกไฟล์ .csv จาก Excel</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="sb-input text-xs py-2"
            />
          </label>
          <label className="text-xs font-semibold space-y-1">
            <span>สต็อกเริ่มต้น (เฉพาะสินค้าที่สร้างใหม่)</span>
            <input
              type="number"
              min={0}
              max={10000}
              value={defaultStockQty}
              onChange={(e) => setDefaultStockQty(Number(e.target.value))}
              className="sb-input text-sm"
            />
          </label>
        </div>

        <label className="block text-xs font-semibold space-y-1">
          <span>หรือวางข้อมูล CSV ใบราคาโดยตรง</span>
          <textarea
            required
            rows={8}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="ใบราคา สเต๊กบอสส์ เริ่ม...&#10;รายการ,ราคาปลีกแช่แข็ง,,ราคาส่ง,โปร10ชิ้นขึ้นไป,นน.ชุด"
            className="sb-input text-xs font-mono"
          />
        </label>

        {err && (
          <p className="text-xs text-red-400 bg-red-950/50 border border-red-800/50 rounded-xl px-3 py-2">
            {err}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="sb-btn-ghost text-sm">
            ยกเลิก
          </button>
          <button type="submit" disabled={loading} className="sb-btn text-sm">
            <Upload className="w-4 h-4" />
            {loading ? "กำลังประมวลผล..." : "นำเข้าและอัปเดตราคา"}
          </button>
        </div>
      </form>
    </div>
  );
}
