"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, Snowflake, ShieldCheck } from "lucide-react";
import type { EnrichedProduct } from "@/services/product.service";
import { useCart } from "./CartProvider";
import { formatBaht } from "@/lib/format";
import { multiplyBaht } from "@/domain/money";
import { ProductGallery } from "./ProductGallery";

export function ProductDetailView({
  product,
  related,
}: {
  product: EnrichedProduct;
  related: EnrichedProduct[];
}) {
  const gallery = [
    { label: "จานปรุงสุก", src: product.platedImgUrl },
    { label: "แพ็คเกจซอง", src: product.packImgUrl },
    ...(product.wideImgUrl ? [{ label: "ภาพเต็มจาน", src: product.wideImgUrl }] : []),
  ];
  const [qty, setQty] = useState(1);
  const { addItem, setDrawerOpen, qualifiesWholesale, wholesaleMinPacks } = useCart();
  const soldOut = product.availableStock <= 0;

  let previewUnit = product.priceBaht;
  if ((qualifiesWholesale || (wholesaleMinPacks > 0 && qty >= wholesaleMinPacks)) && product.wholesalePriceBaht > 0) {
    previewUnit = product.wholesalePriceBaht;
  }
  if (product.bulkPriceBaht !== null && product.bulkMinQty > 0 && qty >= product.bulkMinQty) {
    previewUnit = Math.min(previewUnit, product.bulkPriceBaht);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-14">
      <nav className="text-sm text-sb-mute flex gap-2">
        <Link href="/" className="hover:text-sb-ink">หน้าแรก</Link>
        <span>/</span>
        <Link href="/#menu" className="hover:text-sb-ink">{product.categoryName}</Link>
        <span>/</span>
        <span className="text-sb-ink">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <ProductGallery name={product.name} images={gallery} />

        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {product.isNew && (
              <span className="px-3 py-1 rounded-full text-xs font-display font-bold bg-sb-pink text-[#2a0618]">
                สินค้าใหม่
              </span>
            )}
            {product.tag && (
              <span className="px-3 py-1 rounded-full text-xs font-display font-bold bg-sb-orange text-[#2b1000]">
                {product.tag}
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sb-panel2 text-sb-ink">
              {product.categoryName} · SKU {product.sku}
            </span>
          </div>

          <div>
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl">{product.name}</h1>
            <p className="text-sb-mute mt-1">
              {product.subtitle} · น้ำหนักรวม {product.weightGrams} กรัม · แช่แข็ง -18°C
            </p>
          </div>

          <p className="leading-relaxed text-sb-ink/90">{product.description}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-sm">
            <div className="rounded-xl border border-sb-line bg-sb-panel p-3">
              <p className="text-xs text-sb-mute">ราคาปลีกแช่แข็ง</p>
              <p className="font-display font-extrabold text-xl mt-0.5">{formatBaht(product.priceBaht)}</p>
            </div>
            {product.wholesalePriceBaht > 0 && (
              <div className="rounded-xl border border-sb-pink/40 bg-sb-panel2 p-3">
                <p className="text-xs text-sb-pink2">ราคาส่ง ({wholesaleMinPacks}+ แพ็คคละได้)</p>
                <p className="font-display font-extrabold text-xl text-sb-pink2 mt-0.5">
                  {formatBaht(product.wholesalePriceBaht)}
                </p>
              </div>
            )}
            {product.bulkPriceBaht !== null && product.bulkMinQty > 0 && (
              <div className="rounded-xl border border-sb-ok/40 bg-sb-ok/10 p-3">
                <p className="text-xs text-sb-ok">โปรยกลัง ({product.bulkMinQty}+ แพ็ค)</p>
                <p className="font-display font-extrabold text-xl text-sb-ok mt-0.5">
                  {formatBaht(product.bulkPriceBaht)}
                </p>
              </div>
            )}
          </div>

          {product.isBundle && product.components.length > 0 && (
            <div className="sb-panel space-y-2">
              <p className="font-display font-bold text-sm text-sb-pink2">
                สินค้าในเซ็ตนี้ (ตัดสต็อกจริงอัตโนมัติ)
              </p>
              <ul className="space-y-1 text-sm">
                {product.components.map((c) => (
                  <li key={c.childProductId} className="flex justify-between">
                    <Link href={`/products/${c.childSlug}`} className="hover:underline">
                      • {c.childName} × {c.quantity}
                    </Link>
                    <span className="text-sb-mute">{formatBaht(c.childPriceBaht)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-baseline gap-3">
            <span className="font-display font-extrabold text-4xl">
              {formatBaht(previewUnit)}
            </span>
            <span className="text-sm text-sb-mute">
              {soldOut ? "สินค้าหมดชั่วคราว" : `พร้อมส่ง ${product.availableStock} แพ็ค`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center border border-sb-line rounded-full">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-11 h-11 grid place-items-center" aria-label="ลดจำนวน">
                <Minus className="w-4 h-4" />
              </button>
              <span className="min-w-[36px] text-center font-bold">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(Math.max(1, product.availableStock), q + 1))} className="w-11 h-11 grid place-items-center" aria-label="เพิ่มจำนวน">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              disabled={soldOut}
              onClick={() => {
                addItem(
                  {
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    priceBaht: product.priceBaht,
                    wholesalePriceBaht: product.wholesalePriceBaht,
                    bulkPriceBaht: product.bulkPriceBaht,
                    bulkMinQty: product.bulkMinQty,
                    packSize: product.packSize,
                    weightGrams: product.weightGrams,
                    imgUrl: product.platedImgUrl,
                  },
                  qty
                );
                setDrawerOpen(true);
              }}
              className="sb-btn flex-1 min-w-[200px]"
            >
              {soldOut ? "สินค้าหมดชั่วคราว" : `ใส่ตะกร้า (${formatBaht(multiplyBaht(previewUnit, qty))})`}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-sm text-sb-mute">
            <div className="flex items-center gap-2 bg-sb-panel rounded-xl p-3 border border-sb-line">
              <Snowflake className="w-4 h-4 text-sb-pink shrink-0" />
              <span>ส่งรถควบคุมอุณหภูมิ -18°C</span>
            </div>
            <div className="flex items-center gap-2 bg-sb-panel rounded-xl p-3 border border-sb-line">
              <ShieldCheck className="w-4 h-4 text-sb-ok shrink-0" />
              <span>ผลิตตรงจากโรงงาน อ่างทอง</span>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display font-bold text-2xl">เมนูแนะนำสั่งคู่กัน</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {related.map((p) => (
              <Link key={p.id} href={`/products/${p.slug}`} className="sb-panel p-3 flex items-center gap-3 hover:border-sb-pink transition">
                <img src={p.platedImgUrl} alt={p.name} className="w-16 h-16 rounded-xl object-cover" />
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm truncate">{p.name}</p>
                  <p className="text-xs text-sb-mute">{p.weightGrams}g · ส่ง {formatBaht(p.wholesalePriceBaht)}</p>
                  <p className="font-display font-bold text-sb-pink2">{formatBaht(p.priceBaht)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
