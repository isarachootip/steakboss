"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PO_STATUS_LABELS } from "@/domain/purchase-order";
import type { PurchaseOrderSummaryDto } from "@/services/purchase-order-mapper";
import { formatBaht } from "@/lib/format";
import {
  formatDateTH,
  isOverduePo,
  PO_STATUS_BADGE_STYLE,
} from "./po-ui-helpers";

export function PurchaseOrdersTable({
  orders,
  includeCost,
}: {
  orders: PurchaseOrderSummaryDto[];
  includeCost: boolean;
}) {
  return (
    <div className="sb-panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-sb-line text-sb-mute font-display">
            <th className="text-left py-2.5 pr-3">เลขที่ PO</th>
            <th className="text-left py-2.5 pr-3">ผู้ขาย / แหล่งผลิต</th>
            <th className="text-left py-2.5 pr-3">กำหนดส่ง</th>
            <th className="text-left py-2.5 pr-3">รายการ SKU</th>
            <th className="text-right py-2.5 pr-3">รับแล้ว / สั่ง</th>
            {includeCost && <th className="text-right py-2.5 pr-3">มูลค่ารวม</th>}
            <th className="text-center py-2.5 pr-3">สถานะ</th>
            <th className="text-right py-2.5">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-sb-line">
          {orders.length === 0 ? (
            <tr>
              <td colSpan={includeCost ? 8 : 7} className="py-10 text-center text-sb-mute">
                ยังไม่มีใบสั่งซื้อที่ตรงกับเงื่อนไข
              </td>
            </tr>
          ) : (
            orders.map((po) => {
              const overdue = isOverduePo(po.status, po.expectedDate);
              return (
                <tr key={po.id}>
                  <td className="py-3 pr-3 font-mono font-bold text-sb-pink2 whitespace-nowrap">
                    {po.poNo}
                  </td>
                  <td className="py-3 pr-3 font-semibold">{po.supplierName}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <span className={overdue ? "text-sb-orange font-bold" : ""}>
                      {formatDateTH(po.expectedDate)}
                    </span>
                    {overdue && <span className="block text-[11px] text-sb-orange">เลยกำหนด</span>}
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex flex-wrap gap-1 max-w-[220px]">
                      {po.skuList.slice(0, 3).map((sku) => (
                        <span
                          key={sku}
                          className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-sb-panel2 border border-sb-line"
                        >
                          {sku}
                        </span>
                      ))}
                      {po.skuList.length > 3 && (
                        <span className="text-[11px] text-sb-mute">
                          +{po.skuList.length - 3} SKU
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right font-bold whitespace-nowrap">
                    <span className="text-sb-ok">{po.totalReceivedQty}</span> / {po.totalOrderedQty}
                  </td>
                  {includeCost && (
                    <td className="py-3 pr-3 text-right font-semibold whitespace-nowrap">
                      {formatBaht(po.totalCostBaht ?? 0)}
                    </td>
                  )}
                  <td className="py-3 pr-3 text-center whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${PO_STATUS_BADGE_STYLE[po.status]}`}>
                      {PO_STATUS_LABELS[po.status]}
                    </span>
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/purchase-orders/${po.id}`}
                      className="sb-btn-dark text-xs px-3 inline-flex items-center gap-1"
                    >
                      เปิดดู / รับเข้า <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
