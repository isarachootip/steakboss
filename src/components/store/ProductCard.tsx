"use client";

import { useState } from "react";
import Link from "next/link";
import type { EnrichedProduct } from "@/services/product.service";
import { useCart } from "./CartProvider";
import { formatBaht } from "@/lib/format";

export function ProductCard({ product }: { product: EnrichedProduct }) {
  const [showPack, setShowPack] = useState(false);
  const { addItem, qualifiesWholesale } = useCart();
  const soldOut = product.availableStock <= 0;
  const activePrice =
    qualifiesWholesale && product.wholesalePriceBaht > 0
      ? product.wholesalePriceBaht
      : product.priceBaht;

  return (
    <article className="bg-sb-panel border border-sb-line rounded-2xl overflow-hidden flex flex-col transition hover:-translate-y-1 hover:border-sb-gold/50">
      <div className="relative aspect-square bg-[#0d0b0a] overflow-hidden">
        <Link href={`/products/${product.slug}`} className="block w-full h-full">
          <img
            src={showPack ? product.packImgUrl : product.platedImgUrl}
            alt={product.name}
            className="w-full h-full object-cover transition duration-300"
            loading="lazy"
          />
        </Link>

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {product.isNew && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-display font-bold bg-sb-pink text-[#1a1205]">
              ใหม่
            </span>
          )}
          {product.tag && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-display font-bold bg-sb-orange text-[#2b1000]">
              {product.tag}
            </span>
          )}
          {product.bundleSavingsBaht > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-display font-bold bg-sb-orange text-[#2b1000]">
              ประหยัด {formatBaht(product.bundleSavingsBaht)}
            </span>
          )}
          {soldOut && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-display font-bold bg-neutral-700 text-neutral-200">
              สินค้าหมด
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowPack((v) => !v)}
          className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full bg-black/80 text-white text-xs font-semibold hover:bg-black"
        >
          <img
            src={showPack ? product.platedImgUrl : product.packImgUrl}
            alt=""
            className="w-7 h-7 rounded-full object-cover"
          />
          <span>{showPack ? "ดูจาน" : "ดูซอง"}</span>
        </button>
      </div>

      <div className="p-4 flex-1 space-y-1">
        <p className="text-xs text-sb-mute">
          {product.categoryName} · {product.weightGrams} กรัม
          {!soldOut && product.availableStock <= 10 && (
            <span className="text-sb-orange ml-1.5">
              (เหลือ {product.availableStock})
            </span>
          )}
        </p>
        <h3 className="font-display font-bold text-lg leading-snug">
          <Link href={`/products/${product.slug}`} className="hover:text-sb-pink2">
            {product.name}
          </Link>
        </h3>
        <p className="text-xs text-sb-mute line-clamp-2">{product.subtitle}</p>
        <div className="flex flex-wrap gap-1.5 pt-1.5">
          {product.wholesalePriceBaht > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-sb-panel2 border border-sb-line text-[11px] font-semibold text-sb-pink2">
              ส่ง {formatBaht(product.wholesalePriceBaht)}
            </span>
          )}
          {product.bulkPriceBaht !== null && product.bulkMinQty > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-sb-ok/15 border border-sb-ok/30 text-[11px] font-semibold text-sb-ok">
              {product.bulkMinQty}+ แพ็ค {formatBaht(product.bulkPriceBaht)}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 flex items-center justify-between gap-2">
        <div>
          <span className="font-display font-extrabold text-2xl">
            {formatBaht(activePrice)}
          </span>
          {activePrice < product.priceBaht && (
            <span className="text-xs text-sb-mute line-through ml-1.5">
              {formatBaht(product.priceBaht)}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={soldOut}
          onClick={() =>
            addItem({
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
            })
          }
          className="sb-btn min-h-[38px] px-4 text-sm"
        >
          {soldOut ? "หมด" : "+ ใส่ตะกร้า"}
        </button>
      </div>
    </article>
  );
}
