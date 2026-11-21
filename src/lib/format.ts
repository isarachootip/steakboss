export function formatBaht(amount: number): string {
  return `฿${Number(amount || 0).toLocaleString("th-TH")}`;
}

export function formatDateTimeTH(value: string | Date): string {
  return new Date(value).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STATUS_BADGE_STYLE: Record<string, string> = {
  PENDING_PAYMENT: "bg-orange-950 text-orange-200 border border-orange-700/50",
  SLIP_SUBMITTED: "bg-amber-950 text-amber-200 border border-amber-700/50",
  CONFIRMED: "bg-sky-950 text-sky-200 border border-sky-700/50",
  PAID: "bg-blue-950 text-blue-200 border border-blue-700/50",
  PACKING: "bg-yellow-950 text-yellow-200 border border-yellow-700/50",
  SHIPPED: "bg-purple-950 text-purple-200 border border-purple-700/50",
  DELIVERED: "bg-emerald-950 text-emerald-200 border border-emerald-700/50",
  CANCELLED: "bg-neutral-800 text-neutral-300 border border-neutral-700",
};
