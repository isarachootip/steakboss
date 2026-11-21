"use client";

import { useState } from "react";
import { Plus, PackagePlus } from "lucide-react";
import type { EnrichedProduct } from "@/services/product.service";
import { formatBaht } from "@/lib/format";
import { StockAdjustModal } from "./StockAdjustModal";

interface CategoryItem {
  id: string;
  slug: string;
  name: string;
}

export function ProductsManager({
  initialProducts,
  categories,
  includeCost,
  canEdit,
}: {
  initialProducts: EnrichedProduct[];
  categories: CategoryItem[];
  includeCost: boolean;
  canEdit: boolean;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [stockTarget, setStockTarget] = useState<EnrichedProduct | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: "",
    sku: "",
    name: "",
    subtitle: "หมักพริกไทยดำ",
    description: "",
    categoryId: categories[0]?.id ?? "",
    weightGrams: 180,
    priceBaht: 79,
    costBaht: 45,
    stockQty: 50,
    platedImgUrl: "/images/products/kp-plated.jpg",
    packImgUrl: "/images/products/kp-pack.jpg",
  });

  async function refresh() {
    const res = await fetch("/api/admin/products");
    if (res.ok) {
      const data = (await res.json()) as { products: EnrichedProduct[] };
      setProducts(data.products);
    }
  }

  async function quickPatch(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setMsg("บันทึกข้อมูลสินค้าแล้ว");
      await refresh();
    }
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMsg(data.error || "เพิ่มสินค้าไม่สำเร็จ");
      return;
    }
    setShowCreate(false);
    setMsg("เพิ่มสินค้าใหม่เรียบร้อย");
    await refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-3xl">
            จัดการสินค้าและสต็อก (product_backend)
          </h1>
          <p className="text-sm text-sb-mute">
            สต็อกสินค้าเซ็ต (Bundle) คำนวณจากสินค้าลูกอัตโนมัติแบบ Real-time
          </p>
        </div>
        {canEdit && (
          <button type="button" onClick={() => setShowCreate((v) => !v)} className="sb-btn text-sm">
            <Plus className="w-4 h-4" /> เพิ่มสินค้าใหม่
          </button>
        )}
      </div>

      {msg && (
        <div className="rounded-xl bg-sb-panel2 border border-sb-pink/40 px-4 py-2.5 text-sm text-sb-pink2">
          {msg}
        </div>
      )}

      {showCreate && (
        <form onSubmit={submitCreate} className="sb-panel grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input required placeholder="ชื่อสินค้า" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="sb-input text-sm" />
          <input required placeholder="slug (เช่น spicy-chicken)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="sb-input text-sm" />
          <input required placeholder="SKU (เช่น SB-SPC-180)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="sb-input text-sm" />
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="sb-input text-sm">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="number" placeholder="ราคาขาย (บาท)" value={form.priceBaht} onChange={(e) => setForm({ ...form, priceBaht: Number(e.target.value) })} className="sb-input text-sm" />
          <input type="number" placeholder="สต็อกเริ่มต้น" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })} className="sb-input text-sm" />
          <input placeholder="คำอธิบายสั้น" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="sb-input text-sm sm:col-span-2" />
          <button type="submit" className="sb-btn text-sm">บันทึกสินค้าใหม่</button>
        </form>
      )}

      <div className="sb-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sb-line text-sb-mute font-display">
              <th className="text-left py-2.5">สินค้า</th>
              <th className="text-right py-2.5">ราคาขาย</th>
              {includeCost && <th className="text-right py-2.5">ราคาทุน</th>}
              <th className="text-right py-2.5">สต็อกพร้อมขาย</th>
              <th className="text-center py-2.5">เปิดขาย</th>
              <th className="text-right py-2.5">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sb-line">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-3">
                    <img src={p.platedImgUrl} alt={p.name} className="w-11 h-11 rounded-lg object-cover" />
                    <div>
                      <p className="font-bold">{p.name}</p>
                      <p className="text-xs text-sb-mute">
                        {p.sku} · {p.categoryName} · {p.weightGrams}g {p.isBundle ? "· BUNDLE" : ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 text-right font-bold">{formatBaht(p.priceBaht)}</td>
                {includeCost && (
                  <td className="py-3 text-right text-sb-mute">{formatBaht(p.costBaht ?? 0)}</td>
                )}
                <td className="py-3 text-right">
                  <span className={`font-bold ${p.isLowStock ? "text-sb-orange" : "text-sb-ok"}`}>
                    {p.availableStock}
                  </span>
                  {p.isBundle && <span className="block text-[11px] text-sb-mute">จากสินค้าลูก</span>}
                </td>
                <td className="py-3 text-center">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={p.isActive}
                    onChange={(e) => quickPatch(p.id, { isActive: e.target.checked })}
                    className="w-5 h-5 accent-sb-pink"
                  />
                </td>
                <td className="py-3 text-right">
                  {!p.isBundle && (
                    <button type="button" onClick={() => setStockTarget(p)} className="sb-btn-dark text-xs">
                      <PackagePlus className="w-3.5 h-3.5" /> ปรับสต็อก
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stockTarget && (
        <StockAdjustModal
          product={stockTarget}
          onClose={() => setStockTarget(null)}
          onDone={async (m) => {
            setMsg(m);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
