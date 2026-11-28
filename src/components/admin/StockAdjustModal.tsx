"use client";

import Link from "next/link";
import { useState } from "react";
import { ClipboardList } from "lucide-react";
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
  const [reduceQty, setReduceQty] = useState(1);
  const [reason, setReason] = useState("ตัดของเสีย / ชำรุด / ปรับยอดตรวจนับ");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reduceQty <= 0) return;
    setSaving(true);
    const res = await fetch(`/api/admin/products/${product.id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deltaQty: -Math.abs(Math.floor(reduceQty)),
        type: "ADJUST",
        reason,
      }),
    });
    const data = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      await onDone(data.error || "ปรับลดสต็อกไม่สำเร็จ");
      return;
    }
    onClose();
    await onDone(`ปรับลดสต็อก ${product.sku} (-${reduceQty}) และบันทึก StockMovement แล้ว`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4">
      <form onSubmit={onSubmit} className="sb-panel w-full max-w-md space-y-4">
        <div>
          <h2 className="font-display font-bold text-xl">ปรับลดสต็อก: {product.name}</h2>
          <p className="text-xs text-sb-mute mt-1">
            SKU: <span className="font-mono text-sb-pink2">{product.sku}</span> · คงเหลือปัจจุบัน:{" "}
            <span className="font-bold text-sb-ink">{product.stockQty}</span> ซอง
          </p>
        </div>

        <div className="rounded-xl bg-sb-panel2 border border-sb-pink/30 p-3 text-xs text-sb-mute space-y-2">
          <p>
            ปุ่มนี้รองรับเฉพาะการ <strong className="text-sb-ink">ปรับลดสต็อก (ของเสีย/ชำรุด/ตรวจนับ)</strong>{" "}
            หากต้องการ <strong className="text-sb-pink2">รับสินค้าเข้าคลัง</strong> กรุณาดำเนินการผ่านใบสั่งซื้อ (PO)
          </p>
          <Link
            href="/admin/purchase-orders"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-sb-pink2 font-semibold hover:underline"
          >
            <ClipboardList className="w-3.5 h-3.5" /> ไปหน้าสั่งซื้อ & รับเข้า (PO)
          </Link>
        </div>

        <label className="block space-y-1 text-sm font-semibold">
          <span>จำนวนที่ปรับลด (ซอง)</span>
          <input
            type="number"
            min={1}
            max={Math.max(1, product.stockQty)}
            required
            value={reduceQty}
            onChange={(e) => setReduceQty(Number(e.target.value))}
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
          <button
            type="submit"
            disabled={saving || product.stockQty <= 0}
            className="sb-btn text-sm disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "ยืนยันปรับลดสต็อก"}
          </button>
        </div>
      </form>
    </div>
  );
}
