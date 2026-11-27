"use client";

import Link from "next/link";
import type { EnrichedProduct } from "@/services/product.service";
import { useCart } from "./CartProvider";
import { formatBaht } from "@/lib/format";

export function NewProductSpotlight({ product }: { product: EnrichedProduct }) {
  const { addItem } = useCart();
  const soldOut = product.availableStock <= 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-8 items-center">
      <div className="relative rounded-3xl overflow-hidden aspect-[16/10] bg-black">
        <img
          src={product.wideImgUrl || product.platedImgUrl}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        <img
          src={product.packImgUrl}
          alt={`แพ็คเกจ ${product.name}`}
          className="absolute left-4 bottom-4 w-24 sm:w-32 aspect-square object-cover rounded-xl border-4 border-white shadow-2xl"
        />
      </div>

      <div className="space-y-4">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-display font-bold bg-sb-pink text-[#2a0618]">
          สินค้าใหม่แนะนำ
        </span>
        <h2 className="font-display font-extrabold text-3xl sm:text-4xl">
          {product.name}
        </h2>
        <p className="text-sb-mute">
          {product.subtitle} · {product.weightGrams} กรัม · แช่แข็ง -18°C
        </p>
        <p className="leading-relaxed text-sb-ink/90">{product.description}</p>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-display font-extrabold text-4xl">
            {formatBaht(product.priceBaht)}
          </span>
          {product.wholesalePriceBaht > 0 && (
            <span className="px-3 py-1 rounded-full text-sm font-bold bg-sb-panel2 border border-sb-line text-sb-pink2">
              ราคาส่ง {formatBaht(product.wholesalePriceBaht)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
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
            className="sb-btn"
          >
            {soldOut ? "สินค้าหมดชั่วคราว" : "ใส่ตะกร้าเลย"}
          </button>
          <Link href={`/products/${product.slug}`} className="sb-btn-ghost">
            ดูรายละเอียดสินค้า
          </Link>
        </div>
      </div>
    </div>
  );
}
