"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { multiplyBaht } from "@/domain/money";
import { formatBaht } from "@/lib/format";
import type { PoProductOption } from "./po-ui-helpers";

export interface PoDraftLine {
  productId: string;
  sku: string;
  name: string;
  orderedQty: number;
  unitCostBaht: number;
}

export function PoLineItemsEditor({
  productOptions,
  lines,
  onChange,
}: {
  productOptions: PoProductOption[];
  lines: PoDraftLine[];
  onChange: (next: PoDraftLine[]) => void;
}) {
  const [skuSearch, setSkuSearch] = useState("");
  const selectedIds = useMemo(() => new Set(lines.map((l) => l.productId)), [lines]);

  const matchedProducts = useMemo(() => {
    const q = skuSearch.trim().toLowerCase();
    return productOptions
      .filter((p) => !selectedIds.has(p.id))
      .filter((p) => !q || `${p.sku} ${p.name}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [productOptions, selectedIds, skuSearch]);

  function addProduct(prod: PoProductOption) {
    onChange([
      ...lines,
      {
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        orderedQty: 20,
        unitCostBaht: prod.costBaht ?? 0,
      },
    ]);
    setSkuSearch("");
  }

  function updateLine(
    productId: string,
    patch: Partial<Pick<PoDraftLine, "orderedQty" | "unitCostBaht">>
  ) {
    onChange(lines.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="block text-xs font-semibold">
          เพิ่มสินค้าเข้าใบ PO (ค้นหาจาก SKU หรือชื่อสินค้า · เฉพาะสินค้าเดี่ยว)
        </label>
        <input
          type="search"
          value={skuSearch}
          onChange={(e) => setSkuSearch(e.target.value)}
          placeholder="พิมพ์รหัส SKU เช่น SB-RM- หรือชื่อสินค้าเพื่อเลือกเพิ่ม..."
          className="sb-input text-sm"
        />
        {matchedProducts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1 rounded-xl bg-sb-bgDeep border border-sb-line">
            {matchedProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProduct(p)}
                className="text-left px-2.5 py-2 rounded-lg hover:bg-sb-panel2 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-mono text-sb-pink2 font-bold">{p.sku}</span>
                  <p className="truncate text-sb-ink">{p.name}</p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 text-sb-ok font-semibold">
                  <Plus className="w-3.5 h-3.5" /> เพิ่ม
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-sb-line overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-sb-bgDeep text-sb-mute">
            <tr>
              <th className="text-left p-2.5">SKU</th>
              <th className="text-left p-2.5">สินค้า</th>
              <th className="text-right p-2.5 w-24">จำนวนสั่ง</th>
              <th className="text-right p-2.5 w-28">ต้นทุน/หน่วย</th>
              <th className="text-right p-2.5">รวม</th>
              <th className="p-2.5 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sb-line">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sb-mute">
                  ยังไม่ได้เลือกรายการสินค้า
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.productId}>
                  <td className="p-2.5 font-mono text-sb-pink2 whitespace-nowrap">{line.sku}</td>
                  <td className="p-2.5 font-semibold">{line.name}</td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min={1}
                      required
                      value={line.orderedQty}
                      onChange={(e) =>
                        updateLine(line.productId, { orderedQty: Number(e.target.value) })
                      }
                      className="sb-input text-right text-xs py-1"
                    />
                  </td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={line.unitCostBaht}
                      onChange={(e) =>
                        updateLine(line.productId, { unitCostBaht: Number(e.target.value) })
                      }
                      className="sb-input text-right text-xs py-1"
                    />
                  </td>
                  <td className="p-2.5 text-right font-bold whitespace-nowrap">
                    {formatBaht(multiplyBaht(line.unitCostBaht || 0, line.orderedQty || 0))}
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => onChange(lines.filter((x) => x.productId !== line.productId))}
                      className="text-sb-orange hover:opacity-80"
                      aria-label={`ลบ ${line.sku}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
