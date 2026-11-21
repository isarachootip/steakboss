"use client";

import { useState } from "react";
import type { EnrichedProduct } from "@/services/product.service";

export function StockAdjustModal({
  product,
  onClose,
  onDone,
}: {
  product: EnrichedProduct;
  onClose: () => void;
  onDone: (msg: string) => Promise<void>;
}) {
  const [deltaQty, setDeltaQty] = useState(20);
  const [reason, setReason] = useState("รับเข้าจากไลน์ผลิตอ่างทอง");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/admin/products/${product.id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deltaQty: Number(deltaQty),
        type: deltaQty > 0 ? "RESTOCK" : "ADJUST",
        reason,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      await onDone(data.error || "ปรับสต็อกไม่สำเร็จ");
      return;
    }
    onClose();
    await onDone("อัปเดตสต็อกและบันทึก StockMovement แล้ว");
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4">
      <form onSubmit={onSubmit} className="sb-panel w-full max-w-md space-y-4">
        <h2 className="font-display font-bold text-xl">
          ปรับสต็อก: {product.name}
        </h2>
        <p className="text-sm text-sb-mute">
          คงเหลือปัจจุบัน: {product.stockQty} ซอง
        </p>
        <label className="block space-y-1 text-sm font-semibold">
          <span>จำนวนที่เพิ่ม (+) หรือลด (-)</span>
          <input
            type="number"
            required
            value={deltaQty}
            onChange={(e) => setDeltaQty(Number(e.target.value))}
            className="sb-input"
          />
        </label>
        <label className="block space-y-1 text-sm font-semibold">
          <span>เหตุผล</span>
          <input
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="sb-input"
          />
        </label>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="sb-btn-ghost text-sm">
            ยกเลิก
          </button>
          <button type="submit" className="sb-btn text-sm">
            ยืนยันปรับสต็อก
          </button>
        </div>
      </form>
    </div>
  );
}
