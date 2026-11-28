"use client";

import { PO_STATUS_LABELS } from "@/domain/purchase-order";
import type { PurchaseOrderDetailDto } from "@/services/purchase-order-mapper";
import { formatBaht, formatDateTimeTH } from "@/lib/format";
import {
  formatDateTH,
  isOverduePo,
  PO_STATUS_BADGE_STYLE,
} from "./po-ui-helpers";

export function PurchaseOrderDocumentCard({
  order,
  includeCost,
}: {
  order: PurchaseOrderDetailDto;
  includeCost: boolean;
}) {
  const overdue = isOverduePo(order.status, order.expectedDate);

  return (
    <section className="sb-panel space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sb-line pb-4">
        <div>
          <p className="text-xs text-sb-mute uppercase tracking-wider">
            Purchase Order · ใบสั่งซื้อสินค้า
          </p>
          <h1 className="font-mono font-extrabold text-3xl text-sb-pink2 mt-1">
            {order.poNo}
          </h1>
          <p className="text-sm mt-1">
            ผู้ขาย / โรงงาน: <strong className="text-sb-ink">{order.supplierName}</strong>
          </p>
        </div>
        <div className="text-right space-y-1">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${PO_STATUS_BADGE_STYLE[order.status]}`}
          >
            {PO_STATUS_LABELS[order.status]}
          </span>
          <p className={`text-sm ${overdue ? "text-sb-orange font-bold" : "text-sb-mute"}`}>
            กำหนดส่ง: {formatDateTH(order.expectedDate)} {overdue ? "(เลยกำหนด)" : ""}
          </p>
          <p className="text-xs text-sb-mute">สร้างเมื่อ: {formatDateTimeTH(order.createdAt)}</p>
        </div>
      </div>

      {order.note && (
        <p className="text-xs text-sb-mute whitespace-pre-line bg-sb-bgDeep rounded-lg p-3 border border-sb-line">
          หมายเหตุ: {order.note}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sb-line text-sb-mute font-display">
              <th className="text-left py-2.5 pr-3">SKU</th>
              <th className="text-left py-2.5 pr-3">รายการสินค้า</th>
              <th className="text-right py-2.5 pr-3">สั่งซื้อ</th>
              <th className="text-right py-2.5 pr-3">รับแล้ว</th>
              <th className="text-right py-2.5 pr-3">ค้างรับ</th>
              <th className="text-right py-2.5 pr-3">สต็อกปัจจุบัน</th>
              {includeCost && <th className="text-right py-2.5 pr-3">ทุน/หน่วย</th>}
              {includeCost && <th className="text-right py-2.5">รวม</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-sb-line">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-3 pr-3">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-sb-panel2 border border-sb-line text-sb-pink2 whitespace-nowrap">
                    {item.skuSnapshot}
                  </span>
                </td>
                <td className="py-3 pr-3 font-semibold">{item.productNameSnapshot}</td>
                <td className="py-3 pr-3 text-right font-bold">{item.orderedQty}</td>
                <td className="py-3 pr-3 text-right font-bold text-sb-ok">{item.receivedQty}</td>
                <td className="py-3 pr-3 text-right font-bold text-amber-300">{item.remainingQty}</td>
                <td className="py-3 pr-3 text-right text-sb-mute">{item.currentStockQty ?? "–"}</td>
                {includeCost && (
                  <td className="py-3 pr-3 text-right text-sb-mute">
                    {formatBaht(item.unitCostBaht ?? 0)}
                  </td>
                )}
                {includeCost && (
                  <td className="py-3 text-right font-bold">
                    {formatBaht(item.lineTotalBaht ?? 0)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-sb-line font-bold">
              <td colSpan={2} className="pt-3 text-sb-mute">
                รวมทั้งหมด ({order.lineCount} รายการ SKU)
              </td>
              <td className="pt-3 pr-3 text-right">{order.totalOrderedQty}</td>
              <td className="pt-3 pr-3 text-right text-sb-ok">{order.totalReceivedQty}</td>
              <td className="pt-3 pr-3 text-right text-amber-300">
                {Math.max(0, order.totalOrderedQty - order.totalReceivedQty)}
              </td>
              <td />
              {includeCost && <td />}
              {includeCost && (
                <td className="pt-3 text-right font-display text-lg text-sb-pink2">
                  {formatBaht(order.totalCostBaht ?? 0)}
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
