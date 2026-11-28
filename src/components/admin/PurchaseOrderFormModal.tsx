"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { multiplyBaht, roundBaht } from "@/domain/money";
import { formatBaht } from "@/lib/format";
import type { PurchaseOrderDetailDto } from "@/services/purchase-order-mapper";
import { toDateInputValue, type PoProductOption } from "./po-ui-helpers";
import { PoLineItemsEditor, type PoDraftLine } from "./PoLineItemsEditor";

export function PurchaseOrderFormModal({
  target,
  productOptions,
  onClose,
  onSaved,
}: {
  target: PurchaseOrderDetailDto | null;
  productOptions: PoProductOption[];
  onClose: () => void;
  onSaved: (poId: string, poNo: string) => Promise<void>;
}) {
  const isEdit = Boolean(target);
  const [poNo, setPoNo] = useState(target?.poNo ?? "");
  const [supplierName, setSupplierName] = useState(target?.supplierName ?? "โรงงานอ่างทอง");
  const [expectedDate, setExpectedDate] = useState(toDateInputValue(target?.expectedDate));
  const [note, setNote] = useState(target?.note ?? "");
  const [lines, setLines] = useState<PoDraftLine[]>(
    target
      ? target.items.map((item) => ({
          productId: item.productId,
          sku: item.skuSnapshot,
          name: item.productNameSnapshot,
          orderedQty: item.orderedQty,
          unitCostBaht: item.unitCostBaht ?? 0,
        }))
      : []
  );
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const grandTotal = useMemo(
    () =>
      roundBaht(
        lines.reduce((s, l) => s + multiplyBaht(l.unitCostBaht || 0, l.orderedQty || 0), 0)
      ),
    [lines]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (lines.length === 0) {
      setErr("กรุณาเลือกสินค้า SKU อย่างน้อย 1 รายการ");
      return;
    }
    setSaving(true);
    const items = lines.map((l) => ({
      productId: l.productId,
      orderedQty: Number(l.orderedQty),
      unitCostBaht: Number(l.unitCostBaht),
    }));
    const url = isEdit ? `/api/admin/purchase-orders/${target!.id}` : "/api/admin/purchase-orders";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit
          ? { action: "UPDATE", supplierName, expectedDate, note, items }
          : { poNo: poNo.trim() || undefined, supplierName, expectedDate, note, items }
      ),
    });
    const data = (await res.json()) as {
      purchaseOrder?: PurchaseOrderDetailDto;
      error?: string;
    };
    setSaving(false);
    if (!res.ok || !data.purchaseOrder) {
      setErr(data.error || "บันทึกใบสั่งซื้อไม่สำเร็จ");
      return;
    }
    await onSaved(data.purchaseOrder.id, data.purchaseOrder.poNo);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 grid place-items-center p-4 overflow-y-auto">
      <form
        onSubmit={onSubmit}
        className="sb-panel w-full max-w-3xl max-h-[92vh] overflow-y-auto space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-xl">
            {isEdit ? `แก้ไขใบสั่งซื้อ ${target!.poNo}` : "เปิดใบสั่งซื้อใหม่ (PO)"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-sb-panel2 grid place-items-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <label className="space-y-1 font-semibold">
            <span>เลขที่ PO {isEdit ? "" : "(เว้นว่างให้ระบบรันอัตโนมัติ)"}</span>
            <input
              disabled={isEdit}
              value={poNo}
              onChange={(e) => setPoNo(e.target.value)}
              placeholder="เช่น PO-202611-0001"
              className="sb-input text-sm font-mono uppercase disabled:opacity-60"
            />
          </label>
          <label className="space-y-1 font-semibold">
            <span>ผู้ขาย / โรงงาน *</span>
            <input
              required
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="sb-input text-sm"
            />
          </label>
          <label className="space-y-1 font-semibold">
            <span>กำหนดส่งสินค้า *</span>
            <input
              required
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="sb-input text-sm"
            />
          </label>
        </div>

        <PoLineItemsEditor
          productOptions={productOptions}
          lines={lines}
          onChange={setLines}
        />

        <label className="block space-y-1 text-xs font-semibold">
          <span>หมายเหตุใบสั่งซื้อ</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className="sb-input text-sm" />
        </label>

        {err && <p className="text-sm text-sb-orange font-semibold">{err}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-sb-line">
          <p className="text-sm">
            มูลค่าใบสั่งซื้อรวม:{" "}
            <strong className="font-display text-lg text-sb-pink2">{formatBaht(grandTotal)}</strong>
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="sb-btn-ghost text-sm">
              ยกเลิก
            </button>
            <button type="submit" disabled={saving} className="sb-btn text-sm">
              {saving ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข PO" : "ยืนยันเปิดใบ PO"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
