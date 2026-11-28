"use client";

import { useState } from "react";
import { CheckCheck, X } from "lucide-react";
import type { PurchaseOrderDetailDto } from "@/services/purchase-order-mapper";

export function GoodsReceiptModal({
  order,
  onClose,
  onReceived,
}: {
  order: PurchaseOrderDetailDto;
  onClose: () => void;
  onReceived: (updated: PurchaseOrderDetailDto, msg: string) => void;
}) {
  const openItems = order.items.filter((i) => i.remainingQty > 0);
  const [qtyByLineId, setQtyByLineId] = useState<Record<string, number>>(
    Object.fromEntries(openItems.map((item) => [item.id, item.remainingQty]))
  );
  const [deliveryNoteNo, setDeliveryNoteNo] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function fillAllRemaining() {
    setQtyByLineId(Object.fromEntries(openItems.map((i) => [i.id, i.remainingQty])));
  }

  function clearAll() {
    setQtyByLineId(Object.fromEntries(openItems.map((i) => [i.id, 0])));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const payloadItems = openItems
      .map((item) => ({
        purchaseOrderItemId: item.id,
        receivedQty: Math.floor(Number(qtyByLineId[item.id] ?? 0)),
      }))
      .filter((item) => item.receivedQty > 0);

    if (payloadItems.length === 0) {
      setErr("กรุณากรอกจำนวนรับอย่างน้อย 1 รายการ (มากกว่า 0)");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/admin/purchase-orders/${order.id}/receipts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryNoteNo: deliveryNoteNo.trim(),
        note: note.trim(),
        items: payloadItems,
      }),
    });
    const data = (await res.json()) as {
      purchaseOrder?: PurchaseOrderDetailDto;
      error?: string;
    };
    setSaving(false);
    if (!res.ok || !data.purchaseOrder) {
      setErr(data.error || "บันทึกรับสินค้าไม่สำเร็จ");
      return;
    }
    const totalAdded = payloadItems.reduce((s, i) => s + i.receivedQty, 0);
    onReceived(
      data.purchaseOrder,
      `บันทึกรับสินค้าเข้าคลังแล้ว (+${totalAdded} ซอง) และอัปเดต StockMovement เรียบร้อย`
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 grid place-items-center p-4 overflow-y-auto">
      <form onSubmit={onSubmit} className="sb-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl">บันทึกรับสินค้าเข้าคลัง (GRN)</h2>
            <p className="text-xs text-sb-mute">
              อ้างอิงใบสั่งซื้อ <span className="font-mono text-sb-pink2">{order.poNo}</span> · {order.supplierName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-sb-panel2 grid place-items-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="space-y-1 font-semibold">
            <span>เลขที่ใบส่งของ (DO / Invoice)</span>
            <input
              value={deliveryNoteNo}
              onChange={(e) => setDeliveryNoteNo(e.target.value)}
              placeholder="เช่น DO-202611-088"
              className="sb-input text-sm"
            />
          </label>
          <label className="space-y-1 font-semibold">
            <span>หมายเหตุการรับสินค้า</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น สินค้าครบถ้วน อุณหภูมิปกติ"
              className="sb-input text-sm"
            />
          </label>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-sb-mute">ระบุจำนวนที่รับจริงต่อ SKU (ห้ามรับเกินยอดค้าง)</span>
          <div className="flex gap-2">
            <button type="button" onClick={clearAll} className="text-sb-mute hover:text-sb-ink">
              ล้างเป็น 0
            </button>
            <button
              type="button"
              onClick={fillAllRemaining}
              className="inline-flex items-center gap-1 text-sb-pink2 font-semibold hover:underline"
            >
              <CheckCheck className="w-3.5 h-3.5" /> เติมเต็มยอดค้างทั้งหมด
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-sb-line overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-sb-bgDeep text-sb-mute">
              <tr>
                <th className="text-left p-2.5">SKU</th>
                <th className="text-left p-2.5">สินค้า</th>
                <th className="text-right p-2.5">รับแล้ว/สั่ง</th>
                <th className="text-right p-2.5">ค้างรับ</th>
                <th className="text-right p-2.5 w-28">รับรอบนี้</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sb-line">
              {openItems.map((item) => (
                <tr key={item.id}>
                  <td className="p-2.5 font-mono text-sb-pink2 whitespace-nowrap">{item.skuSnapshot}</td>
                  <td className="p-2.5 font-semibold">{item.productNameSnapshot}</td>
                  <td className="p-2.5 text-right text-sb-mute whitespace-nowrap">
                    {item.receivedQty} / {item.orderedQty}
                  </td>
                  <td className="p-2.5 text-right font-bold text-amber-300">{item.remainingQty}</td>
                  <td className="p-2.5">
                    <input
                      type="number"
                      min={0}
                      max={item.remainingQty}
                      value={qtyByLineId[item.id] ?? 0}
                      onChange={(e) =>
                        setQtyByLineId((prev) => ({
                          ...prev,
                          [item.id]: Number(e.target.value),
                        }))
                      }
                      className="sb-input text-right text-xs py-1"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {err && <p className="text-sm text-sb-orange font-semibold">{err}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t border-sb-line">
          <button type="button" onClick={onClose} className="sb-btn-ghost text-sm">
            ยกเลิก
          </button>
          <button type="submit" disabled={saving} className="sb-btn text-sm">
            {saving ? "กำลังบันทึกรับเข้า..." : "ยืนยันรับสินค้าเข้าสต็อก"}
          </button>
        </div>
      </form>
    </div>
  );
}
