export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "SLIP_SUBMITTED",
  "CONFIRMED",
  "PAID",
  "PACKING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "รอชำระเงิน",
  SLIP_SUBMITTED: "รอตรวจสอบสลิป",
  CONFIRMED: "ยืนยันออเดอร์ (ปลายทาง)",
  PAID: "ชำระเงินแล้ว",
  PACKING: "แพ็คลงกล่องเย็น",
  SHIPPED: "ส่งออกแล้ว",
  DELIVERED: "จัดส่งสำเร็จ",
  CANCELLED: "ยกเลิก",
};

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["SLIP_SUBMITTED", "CANCELLED"],
  SLIP_SUBMITTED: ["PAID", "PENDING_PAYMENT", "CANCELLED"],
  CONFIRMED: ["PACKING", "SHIPPED", "CANCELLED"],
  PAID: ["PACKING", "SHIPPED", "CANCELLED"],
  PACKING: ["SHIPPED", "DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function isPaymentMethodAllowedForChannel(
  _channel: "WEB" | "LINE",
  paymentMethod: "PROMPTPAY" | "COD"
): boolean {
  return paymentMethod === "PROMPTPAY";
}

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function shouldReleaseStockOnCancel(from: OrderStatus): boolean {
  return from !== "CANCELLED" && from !== "DELIVERED";
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("66") && digits.length === 11) {
    return "0" + digits.slice(2);
  }
  return digits;
}

export function generateOrderNo(now: Date = new Date()): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  const bytes = new Uint8Array(4);
  globalThis.crypto.getRandomValues(bytes);
  for (let i = 0; i < 4; i++) {
    suffix += alphabet[bytes[i]! % alphabet.length];
  }
  return `SB${yy}${mm}${dd}-${suffix}`;
}
