import { describe, expect, it } from "vitest";
import {
  canTransitionOrder,
  generateOrderNo,
  isPaymentMethodAllowedForChannel,
  normalizePhone,
} from "@/domain/order";

describe("order domain", () => {
  it("enforces valid order state machine transitions", () => {
    expect(canTransitionOrder("PENDING_PAYMENT", "SLIP_SUBMITTED")).toBe(true);
    expect(canTransitionOrder("PENDING_PAYMENT", "PAID")).toBe(false);
    expect(canTransitionOrder("SLIP_SUBMITTED", "PAID")).toBe(true);
    expect(canTransitionOrder("PAID", "PACKING")).toBe(true);
    expect(canTransitionOrder("PACKING", "SHIPPED")).toBe(true);
    expect(canTransitionOrder("SHIPPED", "DELIVERED")).toBe(true);

    expect(canTransitionOrder("DELIVERED", "CANCELLED")).toBe(false);
    expect(canTransitionOrder("CANCELLED", "PAID")).toBe(false);
    expect(canTransitionOrder("PENDING_PAYMENT", "SHIPPED")).toBe(false);
  });

  it("restricts LINE channel orders to PromptPay QR only while keeping COD on Web", () => {
    expect(isPaymentMethodAllowedForChannel("LINE", "PROMPTPAY")).toBe(true);
    expect(isPaymentMethodAllowedForChannel("LINE", "COD")).toBe(false);
    expect(isPaymentMethodAllowedForChannel("WEB", "PROMPTPAY")).toBe(true);
    expect(isPaymentMethodAllowedForChannel("WEB", "COD")).toBe(true);
  });

  it("generates order number with SBYYMMDD-XXXX format", () => {
    const no = generateOrderNo(new Date("2026-11-21T10:00:00Z"));
    expect(no).toMatch(/^SB261121-[A-Z0-9]{4}$/);
  });

  it("normalizes Thai phone formats", () => {
    expect(normalizePhone("081-234-5678")).toBe("0812345678");
    expect(normalizePhone("+66 81 234 5678")).toBe("0812345678");
  });
});
