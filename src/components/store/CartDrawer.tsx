"use client";

import Link from "next/link";
import { X, Minus, Plus } from "lucide-react";
import { useCart } from "./CartProvider";
import { formatBaht } from "@/lib/format";

export function CartDrawer({ freeShipThreshold }: { freeShipThreshold: number }) {
  const {
    items,
    subtotalBaht,
    tierSavingsBaht,
    qualifiesWholesale,
    packsToWholesale,
    wholesaleMinPacks,
    resolvedLines,
    drawerOpen,
    setDrawerOpen,
    setQty,
  } = useCart();
  const remaining = Math.max(0, freeShipThreshold - subtotalBaht);

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/65"
        onClick={() => setDrawerOpen(false)}
      />
      <aside className="relative z-10 w-full max-w-md bg-sb-panel border-l border-sb-line flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sb-line">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-xl">ตะกร้าของคุณ</h3>
            {qualifiesWholesale && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sb-ok/20 text-sb-ok border border-sb-ok/40">
                เรตราคาส่ง
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="w-10 h-10 rounded-full bg-sb-panel2 grid place-items-center"
            aria-label="ปิดตะกร้า"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sb-mute border border-dashed border-sb-line rounded-2xl">
              <p>ตะกร้ายังว่างอยู่</p>
              <Link
                href="/#menu"
                onClick={() => setDrawerOpen(false)}
                className="inline-block mt-3 text-sb-pink2 underline"
              >
                ไปเลือกเมนูสเต็กเลย
              </Link>
            </div>
          ) : (
            items.map((item) => {
              const line = resolvedLines[item.productId];
              const unitBaht = line?.unitPriceBaht ?? item.priceBaht;
              const lineBaht = line?.lineTotalBaht ?? item.priceBaht * item.quantity;
              const tier = line?.appliedTier ?? "RETAIL";
              return (
                <div
                  key={item.productId}
                  className="grid grid-cols-[68px_1fr_auto] gap-3 items-center"
                >
                  <img
                    src={item.imgUrl}
                    alt={item.name}
                    className="w-[68px] h-[68px] rounded-xl object-cover bg-black"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-xs text-sb-mute flex items-center gap-1.5 flex-wrap">
                      <span className="text-sb-ink font-semibold">{formatBaht(unitBaht)}</span>
                      {unitBaht < item.priceBaht && (
                        <span className="line-through opacity-60">{formatBaht(item.priceBaht)}</span>
                      )}
                      {tier !== "RETAIL" && (
                        <span className="px-1.5 py-0.2 rounded bg-sb-pink/20 text-sb-pink2 text-[10px] font-bold">
                          {tier === "BULK" ? "โปรยกลัง" : "ราคาส่ง"}
                        </span>
                      )}
                      <span>· {item.weightGrams}g</span>
                    </p>
                    <div className="inline-flex items-center border border-sb-line rounded-full mt-1.5">
                      <button
                        type="button"
                        onClick={() => setQty(item.productId, item.quantity - 1)}
                        className="w-8 h-8 grid place-items-center"
                        aria-label="ลดจำนวน"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="min-w-[26px] text-center text-sm font-bold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(item.productId, item.quantity + 1)}
                        className="w-8 h-8 grid place-items-center"
                        aria-label="เพิ่มจำนวน"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="font-display font-bold text-base whitespace-nowrap">
                    {formatBaht(lineBaht)}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="p-5 border-t border-sb-line space-y-2.5">
            {wholesaleMinPacks > 0 && (
              <div className="rounded-xl bg-sb-panel2 border border-sb-line px-3.5 py-2 text-xs">
                {packsToWholesale > 0 ? (
                  <span>
                    หยิบเพิ่มอีก <b className="text-sb-pink2">{packsToWholesale} แพ็ค</b> (คละได้) รับ <b>ราคาส่ง</b> ทั้งตะกร้า!
                  </span>
                ) : (
                  <span className="text-sb-ok font-semibold">
                    ปลดล็อกเรตราคาส่งทั้งตะกร้าแล้ว · ประหยัด {formatBaht(tierSavingsBaht)}
                  </span>
                )}
              </div>
            )}
            <div className="rounded-xl bg-sb-panel2 px-3.5 py-2 text-xs">
              {remaining > 0 ? (
                <span>
                  ซื้อเพิ่มอีก <b className="text-sb-pink2">{formatBaht(remaining)}</b> รับส่งรถเย็นฟรี!
                </span>
              ) : (
                <span className="text-sb-ok font-semibold">
                  ยอดนี้ได้รับสิทธิ์ส่งรถเย็นฟรี
                </span>
              )}
            </div>
            <div className="flex justify-between items-baseline pt-1">
              <span className="text-sb-mute text-sm">ยอดสินค้าสุทธิ</span>
              <span className="font-display font-bold text-xl">
                {formatBaht(subtotalBaht)}
              </span>
            </div>
            <Link
              href="/checkout"
              onClick={() => setDrawerOpen(false)}
              className="sb-btn w-full"
            >
              ดำเนินการชำระเงิน
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
