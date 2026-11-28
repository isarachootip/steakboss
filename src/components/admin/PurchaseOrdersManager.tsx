"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { PO_STATUS_LABELS, type PurchaseOrderStatus } from "@/domain/purchase-order";
import type { PurchaseOrderSummaryDto } from "@/services/purchase-order-mapper";
import { isOverduePo, type PoProductOption } from "./po-ui-helpers";
import { PurchaseOrdersTable } from "./PurchaseOrdersTable";
import { PurchaseOrderFormModal } from "./PurchaseOrderFormModal";

const STATUS_OPTIONS: readonly (PurchaseOrderStatus | "ALL")[] = [
  "ALL",
  "OPEN",
  "PARTIAL",
  "RECEIVED",
  "SHORT_CLOSED",
  "CANCELLED",
];

export function PurchaseOrdersManager({
  initialOrders,
  productOptions,
  includeCost,
  canManage,
}: {
  initialOrders: PurchaseOrderSummaryDto[];
  productOptions: PoProductOption[];
  includeCost: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/admin/purchase-orders");
    if (res.ok) {
      const data = (await res.json()) as { purchaseOrders: PurchaseOrderSummaryDto[] };
      setOrders(data.purchaseOrders);
    }
  }

  const stats = useMemo(
    () => ({
      open: orders.filter((o) => o.status === "OPEN").length,
      partial: orders.filter((o) => o.status === "PARTIAL").length,
      overdue: orders.filter((o) => isOverduePo(o.status, o.expectedDate)).length,
      received: orders.filter((o) => o.status === "RECEIVED").length,
    }),
    [orders]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((po) => {
      if (statusFilter !== "ALL" && po.status !== statusFilter) return false;
      if (!q) return true;
      return `${po.poNo} ${po.supplierName} ${po.skuList.join(" ")}`.toLowerCase().includes(q);
    });
  }, [orders, statusFilter, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-3xl">
            ใบสั่งซื้อ & รับสินค้าเข้า (PO)
          </h1>
          <p className="text-sm text-sb-mute">
            ควบคุมการสั่งซื้อตาม SKU, กำหนดส่ง, ทยอยรับสินค้าเข้าคลัง และตรวจสอบย้อนหลัง
          </p>
        </div>
        {canManage && (
          <button type="button" onClick={() => setShowCreate(true)} className="sb-btn text-sm">
            <Plus className="w-4 h-4" /> เปิดใบสั่งซื้อ (PO)
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="sb-panel py-3">
          <p className="text-xs text-sb-mute">รอรับสินค้า (OPEN)</p>
          <p className="font-display font-extrabold text-2xl text-sky-300 mt-1">{stats.open}</p>
        </div>
        <div className="sb-panel py-3">
          <p className="text-xs text-sb-mute">รับบางส่วน (PARTIAL)</p>
          <p className="font-display font-extrabold text-2xl text-amber-300 mt-1">{stats.partial}</p>
        </div>
        <div className="sb-panel py-3">
          <p className="text-xs text-sb-mute">เลยกำหนดส่ง</p>
          <p className="font-display font-extrabold text-2xl text-sb-orange mt-1">{stats.overdue}</p>
        </div>
        <div className="sb-panel py-3">
          <p className="text-xs text-sb-mute">รับครบแล้ว (RECEIVED)</p>
          <p className="font-display font-extrabold text-2xl text-sb-ok mt-1">{stats.received}</p>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl bg-sb-panel2 border border-sb-pink/40 px-4 py-2.5 text-sm text-sb-pink2">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาเลขที่ PO, ชื่อผู้ขาย หรือรหัส SKU..."
          className="sb-input max-w-sm text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sb-input max-w-[220px] text-sm"
        >
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {st === "ALL" ? `ทุกสถานะ (${orders.length})` : PO_STATUS_LABELS[st]}
            </option>
          ))}
        </select>
      </div>

      <PurchaseOrdersTable orders={filtered} includeCost={includeCost} />

      {showCreate && (
        <PurchaseOrderFormModal
          target={null}
          productOptions={productOptions}
          onClose={() => setShowCreate(false)}
          onSaved={async (poId, poNo) => {
            setShowCreate(false);
            setMsg(`เปิดใบสั่งซื้อ ${poNo} เรียบร้อยแล้ว`);
            await refresh();
            router.push(`/admin/purchase-orders/${poId}`);
          }}
        />
      )}
    </div>
  );
}
