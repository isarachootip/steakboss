"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Ban, CheckCircle2, PackageCheck, Pencil, Printer } from "lucide-react";
import { canReceivePurchaseOrder } from "@/domain/purchase-order";
import type { PurchaseOrderDetailDto } from "@/services/purchase-order-mapper";
import type { PoProductOption } from "./po-ui-helpers";
import { PurchaseOrderDocumentCard } from "./PurchaseOrderDocumentCard";
import { PurchaseOrderFormModal } from "./PurchaseOrderFormModal";
import { GoodsReceiptModal } from "./GoodsReceiptModal";
import { GoodsReceiptHistory } from "./GoodsReceiptHistory";

export function PurchaseOrderDetailView({
  initialOrder,
  productOptions,
  includeCost,
  canManage,
}: {
  initialOrder: PurchaseOrderDetailDto;
  productOptions: PoProductOption[];
  includeCost: boolean;
  canManage: boolean;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [showReceive, setShowReceive] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const canReceive = canReceivePurchaseOrder(order.status);
  const canEdit = canManage && order.status === "OPEN" && order.receiptCount === 0;
  const canCancel = canManage && order.status === "OPEN" && order.totalReceivedQty === 0;
  const canShortClose = canManage && (order.status === "OPEN" || order.status === "PARTIAL");

  async function reloadOrder() {
    const res = await fetch(`/api/admin/purchase-orders/${order.id}`);
    if (res.ok) {
      const data = (await res.json()) as { purchaseOrder: PurchaseOrderDetailDto };
      setOrder(data.purchaseOrder);
    }
  }

  async function runStatusAction(action: "SHORT_CLOSE" | "CANCEL") {
    const label =
      action === "SHORT_CLOSE" ? "ปิดยอดค้าง (Short-close)" : "ยกเลิกใบสั่งซื้อ (Cancel)";
    const reason = window.prompt(`ระบุหมายเหตุสำหรับ ${label} (ไม่บังคับ):`, "");
    if (reason === null) return;

    setErr(null);
    setMsg(null);
    setBusyAction(true);
    const res = await fetch(`/api/admin/purchase-orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const data = (await res.json()) as {
      purchaseOrder?: PurchaseOrderDetailDto;
      error?: string;
    };
    setBusyAction(false);
    if (!res.ok || !data.purchaseOrder) {
      setErr(data.error || `${label} ไม่สำเร็จ`);
      return;
    }
    setOrder(data.purchaseOrder);
    setMsg(`ดำเนินการ ${label} สำหรับ ${order.poNo} เรียบร้อยแล้ว`);
  }

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/purchase-orders"
          className="inline-flex items-center gap-1.5 text-sm text-sb-mute hover:text-sb-ink"
        >
          <ArrowLeft className="w-4 h-4" /> กลับไปรายการใบสั่งซื้อ (PO)
        </Link>

        <div className="flex flex-wrap gap-2">
          {canReceive && (
            <button type="button" onClick={() => setShowReceive(true)} className="sb-btn text-sm">
              <PackageCheck className="w-4 h-4" /> บันทึกรับสินค้าเข้า
            </button>
          )}
          <button type="button" onClick={() => window.print()} className="sb-btn-dark text-sm">
            <Printer className="w-4 h-4" /> พิมพ์ใบ PO
          </button>
          {canEdit && (
            <button type="button" onClick={() => setShowEdit(true)} className="sb-btn-dark text-sm">
              <Pencil className="w-4 h-4" /> แก้ไข PO
            </button>
          )}
          {canShortClose && (
            <button
              type="button"
              disabled={busyAction}
              onClick={() => runStatusAction("SHORT_CLOSE")}
              className="sb-btn-dark text-sm text-purple-300"
            >
              <CheckCircle2 className="w-4 h-4" /> ปิดยอดค้าง
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={busyAction}
              onClick={() => runStatusAction("CANCEL")}
              className="sb-btn-dark text-sm text-sb-orange"
            >
              <Ban className="w-4 h-4" /> ยกเลิก PO
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className="no-print rounded-xl bg-sb-panel2 border border-sb-pink/40 px-4 py-2.5 text-sm text-sb-pink2">
          {msg}
        </div>
      )}
      {err && (
        <div className="no-print rounded-xl bg-red-950/50 border border-sb-orange/50 px-4 py-2.5 text-sm text-sb-orange">
          {err}
        </div>
      )}

      <PurchaseOrderDocumentCard order={order} includeCost={includeCost} />

      <GoodsReceiptHistory
        purchaseOrderId={order.id}
        receipts={order.receipts}
        canManage={canManage}
        onVoided={(updated, m) => {
          setOrder(updated);
          setMsg(m);
        }}
      />

      {showReceive && (
        <GoodsReceiptModal
          order={order}
          onClose={() => setShowReceive(false)}
          onReceived={(updated, m) => {
            setShowReceive(false);
            setOrder(updated);
            setMsg(m);
          }}
        />
      )}

      {showEdit && (
        <PurchaseOrderFormModal
          target={order}
          productOptions={productOptions}
          onClose={() => setShowEdit(false)}
          onSaved={async (_id, poNo) => {
            setShowEdit(false);
            setMsg(`อัปเดตใบสั่งซื้อ ${poNo} เรียบร้อยแล้ว`);
            await reloadOrder();
          }}
        />
      )}
    </div>
  );
}
