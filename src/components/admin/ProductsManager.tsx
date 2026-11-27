"use client";

import { useMemo, useState } from "react";
import { Plus, Upload } from "lucide-react";
import type { EnrichedProduct } from "@/services/product.service";
import { StockAdjustModal } from "./StockAdjustModal";
import { CsvPriceImportModal } from "./CsvPriceImportModal";
import { ProductEditModal } from "./ProductEditModal";
import { ProductsTable } from "./ProductsTable";

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
  const [editTarget, setEditTarget] = useState<EnrichedProduct | "CREATE" | null>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

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
      setMsg("บันทึกสถานะสินค้าแล้ว");
      await refresh();
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (catFilter !== "all" && p.categorySlug !== catFilter) return false;
      if (!q) return true;
      return `${p.name} ${p.sku} ${p.subtitle}`.toLowerCase().includes(q);
    });
  }, [products, catFilter, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-3xl">
            จัดการสินค้าและใบราคา ({products.length} รายการ)
          </h1>
          <p className="text-sm text-sb-mute">
            รองรับราคาปลีกแช่แข็ง · ราคาส่ง · โปรยกลัง และการนำเข้าใบราคา CSV
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowCsvModal(true)} className="sb-btn-ghost text-sm">
              <Upload className="w-4 h-4" /> นำเข้าใบราคา CSV
            </button>
            <button type="button" onClick={() => setEditTarget("CREATE")} className="sb-btn text-sm">
              <Plus className="w-4 h-4" /> เพิ่มสินค้าใหม่
            </button>
          </div>
        )}
      </div>

      {msg && (
        <div className="rounded-xl bg-sb-panel2 border border-sb-pink/40 px-4 py-2.5 text-sm text-sb-pink2">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อสินค้า หรือรหัส SKU..."
          className="sb-input max-w-xs text-sm"
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="sb-input max-w-[240px] text-sm"
        >
          <option value="all">ทุกหมวดหมู่ ({products.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      <ProductsTable
        products={filtered}
        includeCost={includeCost}
        canEdit={canEdit}
        onToggleActive={(id, isActive) => quickPatch(id, { isActive })}
        onEdit={(p) => setEditTarget(p)}
        onAdjustStock={(p) => setStockTarget(p)}
      />

      {stockTarget && (
        <StockAdjustModal
          product={stockTarget}
          onClose={() => setStockTarget(null)}
          onDone={async (m) => { setMsg(m); await refresh(); }}
        />
      )}
      {editTarget && (
        <ProductEditModal
          target={editTarget === "CREATE" ? null : editTarget}
          categories={categories}
          includeCost={includeCost}
          onClose={() => setEditTarget(null)}
          onSaved={async (m) => { setMsg(m); await refresh(); }}
        />
      )}
      {showCsvModal && (
        <CsvPriceImportModal
          onClose={() => setShowCsvModal(false)}
          onDone={async (m) => { setMsg(m); await refresh(); }}
        />
      )}
    </div>
  );
}
