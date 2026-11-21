import { describe, expect, it } from "vitest";
import { buildPromptPayPayload, crc16Ccitt } from "@/domain/promptpay";

describe("promptpay EMVCo QR domain", () => {
  it("builds valid dynamic PromptPay payload for mobile number and amount", () => {
    const payload = buildPromptPayPayload("081-234-5678", 259);
    expect(payload).toContain("A000000677010111");
    expect(payload).toContain("0066812345678");
    expect(payload).toContain("5406259.00");
    expect(payload).toContain("5303764");
    expect(payload).toContain("5802TH");
    const body = payload.slice(0, -4);
    const crc = payload.slice(-4);
    expect(crc).toBe(crc16Ccitt(body));
  });

  it("builds valid payload for 13-digit tax/national ID", () => {
    const payload = buildPromptPayPayload("1234567890123", 990);
    expect(payload).toContain("02131234567890123");
  });

  it("throws on invalid PromptPay identifier", () => {
    expect(() => buildPromptPayPayload("12345", 100)).toThrow();
  });
});
