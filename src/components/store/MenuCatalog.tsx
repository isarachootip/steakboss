"use client";

import { useMemo, useState } from "react";
import type { EnrichedProduct } from "@/services/product.service";
import { ProductCard } from "./ProductCard";

interface CategoryTab {
  slug: string;
  name: string;
}

export function MenuCatalog({
  products,
  categories,
}: {
  products: EnrichedProduct[];
  categories: CategoryTab[];
}) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("pop");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = products.filter((p) => {
      if (cat !== "all" && p.categorySlug !== cat) return false;
      if (!query) return true;
      return `${p.name} ${p.subtitle} ${p.categoryName}`.toLowerCase().includes(query);
    });
    if (sort === "low") return [...list].sort((a, b) => a.priceBaht - b.priceBaht);
    if (sort === "high") return [...list].sort((a, b) => b.priceBaht - a.priceBaht);
    if (sort === "new") return [...list].sort((a, b) => Number(b.isNew) - Number(a.isNew));
    return list;
  }, [products, cat, q, sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl">
            เมนูทั้งหมด
          </h2>
          <p className="text-sb-mute mt-1">
            แตะปุ่ม &ldquo;ดูซอง&rdquo; ที่มุมการ์ด เพื่อดูแพ็คเกจจริงที่จะได้รับ
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCat("all")}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
              cat === "all"
                ? "bg-sb-ink text-sb-bg border-sb-ink"
                : "border-sb-line text-sb-ink hover:bg-sb-panel2"
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCat(c.slug)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
                cat === c.slug
                  ? "bg-sb-ink text-sb-bg border-sb-ink"
                  : "border-sb-line text-sb-ink hover:bg-sb-panel2"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาเมนู เช่น ไก่, พริกไทย, คลีน..."
          className="sb-input max-w-xs"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="sb-input max-w-[200px]"
          aria-label="เรียงลำดับ"
        >
          <option value="pop">ยอดนิยม</option>
          <option value="low">ราคาต่ำ → สูง</option>
          <option value="high">ราคาสูง → ต่ำ</option>
          <option value="new">สินค้าใหม่ก่อน</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center text-sb-mute border border-dashed border-sb-line rounded-2xl">
          ไม่พบเมนูที่ค้นหา ลองคำอื่นหรือเลือก &ldquo;ทั้งหมด&rdquo;
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
