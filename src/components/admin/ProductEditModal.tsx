"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { EnrichedProduct } from "@/services/product.service";
import { ProductMediaFields } from "./ProductMediaFields";

interface CategoryOption {
  id: string;
  name: string;
}

export function ProductEditModal({
  target,
  categories,
  includeCost,
  onClose,
  onSaved,
}: {
  target: EnrichedProduct | null;
  categories: CategoryOption[];
  includeCost: boolean;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const isEdit = Boolean(target);
  const [form, setForm] = useState({
    name: target?.name ?? "",
    slug: target?.slug ?? "",
    sku: target?.sku ?? "",
    subtitle: target?.subtitle ?? "หมักพริกไทยดำ",
    description: target?.description ?? "",
    categoryId: target?.categoryId ?? categories[0]?.id ?? "",
    weightGrams: target?.weightGrams ?? 180,
    packSize: target?.packSize ?? 1,
    priceBaht: target?.priceBaht ?? 65,
    wholesalePriceBaht: target?.wholesalePriceBaht ?? 52,
    bulkPriceBaht: target?.bulkPriceBaht !== null && target?.bulkPriceBaht !== undefined ? String(target.bulkPriceBaht) : "",
    bulkMinQty: target?.bulkMinQty ?? 0,
    costBaht: target?.costBaht ?? 0,
    stockQty: target?.stockQty ?? 50,
    tag: target?.tag ?? "",
    platedImgUrl: target?.platedImgUrl ?? "/images/products/kp-plated.jpg",
    packImgUrl: target?.packImgUrl ?? "/images/products/kp-pack.jpg",
    wideImgUrl: target?.wideImgUrl ?? "",
    isNew: target?.isNew ?? false,
  });
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);

    const payload = {
      ...form,
      bulkPriceBaht: form.bulkPriceBaht.trim() ? Number(form.bulkPriceBaht) : null,
      bulkMinQty: form.bulkPriceBaht.trim() ? Math.max(1, form.bulkMinQty || 10) : 0,
      wideImgUrl: form.wideImgUrl.trim() ? form.wideImgUrl.trim() : null,
    };

    const url = isEdit ? `/api/admin/products/${target!.id}` : "/api/admin/products";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setErr(data.error || "บันทึกข้อมูลสินค้าไม่สำเร็จ");
      setSaving(false);
      return;
    }
    await onSaved(isEdit ? `อัปเดต "${form.name}" เรียบร้อย` : `เพิ่ม "${form.name}" สำเร็จ`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 overflow-y-auto">
      <form onSubmit={submitForm} className="sb-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-xl">
            {isEdit ? "แก้ไขสินค้าและเรตราคา" : "เพิ่มสินค้าใหม่"}
          </h2>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-sb-panel2 grid place-items-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <label className="sm:col-span-2 space-y-1 font-semibold">
            <span>ชื่อสินค้า *</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="sb-input text-sm" />
          </label>
          <label className="space-y-1 font-semibold">
            <span>หมวดหมู่</span>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="sb-input text-sm">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 font-semibold">
            <span>Slug *</span>
            <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="sb-input text-sm" />
          </label>
          <label className="space-y-1 font-semibold">
            <span>SKU *</span>
            <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="sb-input text-sm" />
          </label>
          <label className="space-y-1 font-semibold">
            <span>ป้ายกำกับ (Tag)</span>
            <input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="เช่น สินค้าเด่นขายดี" className="sb-input text-sm" />
          </label>
          <label className="space-y-1 font-semibold">
            <span>ราคาปลีกแช่แข็ง (บาท) *</span>
            <input required type="number" step="0.01" value={form.priceBaht} onChange={(e) => setForm({ ...form, priceBaht: Number(e.target.value) })} className="sb-input text-sm" />
          </label>
          <label className="space-y-1 font-semibold">
            <span>ราคาส่ง (บาท) *</span>
            <input required type="number" step="0.01" value={form.wholesalePriceBaht} onChange={(e) => setForm({ ...form, wholesalePriceBaht: Number(e.target.value) })} className="sb-input text-sm" />
          </label>
          <label className="space-y-1 font-semibold">
            <span>ราคาโปรยกลัง (เว้นว่างถ้าไม่มี)</span>
            <input type="number" step="0.01" value={form.bulkPriceBaht} onChange={(e) => setForm({ ...form, bulkPriceBaht: e.target.value })} placeholder="เช่น 50" className="sb-input text-sm" />
          </label>
          <label className="space-y-1 font-semibold">
            <span>จำนวนขั้นต่ำโปรยกลัง (แพ็ค)</span>
            <input type="number" min={0} value={form.bulkMinQty} onChange={(e) => setForm({ ...form, bulkMinQty: Number(e.target.value) })} className="sb-input text-sm" />
          </label>
          <label className="space-y-1 font-semibold">
            <span>น้ำหนักรวมต่อแพ็ค (กรัม)</span>
            <input type="number" min={1} value={form.weightGrams} onChange={(e) => setForm({ ...form, weightGrams: Number(e.target.value) })} className="sb-input text-sm" />
          </label>
          <label className="space-y-1 font-semibold">
            <span>จำนวนชิ้นในถุง (packSize)</span>
            <input type="number" min={1} value={form.packSize} onChange={(e) => setForm({ ...form, packSize: Number(e.target.value) })} className="sb-input text-sm" />
          </label>
          {includeCost && (
            <label className="space-y-1 font-semibold">
              <span>ราคาทุนโรงงาน (บาท)</span>
              <input type="number" step="0.01" value={form.costBaht} onChange={(e) => setForm({ ...form, costBaht: Number(e.target.value) })} className="sb-input text-sm" />
            </label>
          )}
          {!isEdit && (
            <label className="space-y-1 font-semibold">
              <span>สต็อกเริ่มต้น (แพ็ค)</span>
              <input type="number" min={0} value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })} className="sb-input text-sm" />
            </label>
          )}
          <label className="sm:col-span-3 space-y-1 font-semibold">
            <span>คำอธิบายย่อย (Subtitle)</span>
            <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="sb-input text-sm" />
          </label>
        </div>

        <ProductMediaFields
          value={{
            platedImgUrl: form.platedImgUrl,
            packImgUrl: form.packImgUrl,
            wideImgUrl: form.wideImgUrl,
            description: form.description,
            isNew: form.isNew,
          }}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        />

        {err && <p className="text-xs text-red-400">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="sb-btn-ghost text-sm">ยกเลิก</button>
          <button type="submit" disabled={saving} className="sb-btn text-sm">
            {saving ? "กำลังบันทึก..." : "บันทึกสินค้า"}
          </button>
        </div>
      </form>
    </div>
  );
}
