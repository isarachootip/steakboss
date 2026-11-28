import { describe, expect, it } from "vitest";
import {
  isSlipAmountMatched,
  isSlipReceiverMatched,
} from "@/domain/slip-verifier";

describe("slip-verifier domain", () => {
  const expected = {
    promptpayId: "0932896292",
    promptpayName: "วรัป เจริญโพธิ์",
  };

  it("matches exact and satang amounts within 0.01 baht", () => {
    expect(isSlipAmountMatched(368, 368)).toBe(true);
    expect(isSlipAmountMatched(168.75, 168.75)).toBe(true);
    expect(isSlipAmountMatched(367.9, 368)).toBe(false);
    expect(isSlipAmountMatched(undefined, 368)).toBe(false);
  });

  it("matches full PromptPay ID, Thai masked PromptPay IDs, and Thai account name", () => {
    expect(isSlipReceiverMatched({ proxyValue: "0932896292" }, expected)).toBe(true);
    expect(isSlipReceiverMatched({ proxyValue: "093-xxx-6292" }, expected)).toBe(true);
    expect(isSlipReceiverMatched({ proxyValue: "xxx-xxx-6292" }, expected)).toBe(true);
    expect(
      isSlipReceiverMatched({ displayName: "นาย วรัป เจริญโพธิ์" }, expected)
    ).toBe(true);
  });

  it("rejects mismatched receiver accounts or missing receiver info", () => {
    expect(isSlipReceiverMatched({ proxyValue: "081-xxx-9999" }, expected)).toBe(false);
    expect(isSlipReceiverMatched({ proxyValue: "089-xxx-6292" }, expected)).toBe(false);
    expect(
      isSlipReceiverMatched({ displayName: "นาย สมชาย ใจดี" }, expected)
    ).toBe(false);
    expect(isSlipReceiverMatched({}, expected)).toBe(false);
  });
});
