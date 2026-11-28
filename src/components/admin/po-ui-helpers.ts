import type { PurchaseOrderStatus } from "@/domain/purchase-order";

export interface PoProductOption {
  id: string;
  sku: string;
  name: string;
  stockQty: number;
  costBaht?: number;
}

export const PO_STATUS_BADGE_STYLE: Record<PurchaseOrderStatus, string> = {
  OPEN: "bg-sky-950 text-sky-200 border border-sky-700/50",
  PARTIAL: "bg-amber-950 text-amber-200 border border-amber-700/50",
  RECEIVED: "bg-emerald-950 text-emerald-200 border border-emerald-700/50",
  SHORT_CLOSED: "bg-purple-950 text-purple-200 border border-purple-700/50",
  CANCELLED: "bg-neutral-800 text-neutral-300 border border-neutral-700",
};

export function formatDateTH(value: string | Date): string {
  return new Date(value).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

export function toDateInputValue(value?: string | Date): string {
  const date = value ? new Date(value) : new Date(Date.now() + 86_400_000 * 2);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isOverduePo(status: PurchaseOrderStatus, expectedDateIso: string): boolean {
  if (status !== "OPEN" && status !== "PARTIAL") return false;
  const due = new Date(expectedDateIso);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}
