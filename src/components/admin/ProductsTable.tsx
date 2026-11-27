"use client";

import { PackagePlus, Pencil } from "lucide-react";
import type { EnrichedProduct } from "@/services/product.service";
import { formatBaht } from "@/lib/format";

export function ProductsTable({
  products,
  includeCost,
  canEdit,
  onToggleActive,
  onEdit,
  onAdjustStock,
}: {
  products: EnrichedProduct[];
  includeCost: boolean;
  canEdit: boolean;
  onToggleActive: (id: string, isActive: boolean) => void;
  onEdit: (product: EnrichedProduct) => void;
  onAdjustStock: (product: EnrichedProduct) => void;
}) {
  return (
    <div className="sb-panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-sb-line text-sb-mute font-display">
            <th className="text-left py-2.5">สินค้า</th>
            <th className="text-right py-2.5">ปลีกแช่แข็ง</th>
            <th className="text-right py-2.5">ราคาส่ง</th>
            <th className="text-right py-2.5">โปรยกลัง</th>
            {includeCost && <th className="text-right py-2.5">ทุน</th>}
            <th className="text-right py-2.5">สต็อก</th>
            <th className="text-center py-2.5">เปิดขาย</th>
            <th className="text-right py-2.5">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sb-line">
          {products.map((p) => (
            <tr key={p.id}>
              <td className="py-3 pr-3">
                <div className="flex items-center gap-3">
                  <img
                    src={p.platedImgUrl}
                    alt={p.name}
                    className="w-11 h-11 rounded-lg object-cover"
                  />
                  <div>
                    <p className="font-bold">{p.name}</p>
                    <p className="text-xs text-sb-mute">
                      {p.sku} · {p.categoryName} · {p.weightGrams}g
                      {p.packSize > 1 ? ` (${p.packSize} ชิ้น/แพ็ค)` : ""}
                      {p.isBundle ? " · BUNDLE" : ""}
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-3 text-right font-bold">{formatBaht(p.priceBaht)}</td>
              <td className="py-3 text-right font-semibold text-sb-pink2">
                {p.wholesalePriceBaht > 0 ? formatBaht(p.wholesalePriceBaht) : "–"}
              </td>
              <td className="py-3 text-right text-xs text-sb-ok">
                {p.bulkPriceBaht !== null && p.bulkMinQty > 0
                  ? `${formatBaht(p.bulkPriceBaht)} (${p.bulkMinQty}+)`
                  : "–"}
              </td>
              {includeCost && (
                <td className="py-3 text-right text-sb-mute">
                  {formatBaht(p.costBaht ?? 0)}
                </td>
              )}
              <td className="py-3 text-right">
                <span className={`font-bold ${p.isLowStock ? "text-sb-orange" : "text-sb-ok"}`}>
                  {p.availableStock}
                </span>
              </td>
              <td className="py-3 text-center">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={p.isActive}
                  onChange={(e) => onToggleActive(p.id, e.target.checked)}
                  className="w-5 h-5 accent-sb-pink"
                />
              </td>
              <td className="py-3 text-right">
                <div className="inline-flex gap-1.5">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(p)}
                      className="sb-btn-dark text-xs px-2.5"
                    >
                      <Pencil className="w-3.5 h-3.5" /> แก้ไข
                    </button>
                  )}
                  {!p.isBundle && (
                    <button
                      type="button"
                      onClick={() => onAdjustStock(p)}
                      className="sb-btn-dark text-xs px-2.5"
                    >
                      <PackagePlus className="w-3.5 h-3.5" /> สต็อก
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
