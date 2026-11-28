import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";
import { checkRateLimit, clearRateLimitBucket } from "@/lib/rate-limit";
import { loginRequestSchema } from "@/schemas/auth.schema";

describe("auth security utilities", () => {
  it("hashes and verifies passwords with scrypt", () => {
    const hash = hashPassword("boss1234");
    expect(verifyPassword("boss1234", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("signs and verifies session tokens and rejects tampering or expiry", () => {
    const now = 1_700_000_000_000;
    const token = createSessionToken(
      { userId: "u1", role: "OWNER", name: "Owner" },
      now
    );
    const verified = verifySessionToken(token, now + 1000);
    expect(verified?.userId).toBe("u1");
    expect(verified?.role).toBe("OWNER");

    const tampered = token.slice(0, -2) + "XX";
    expect(verifySessionToken(tampered, now + 1000)).toBeNull();

    const expired = verifySessionToken(token, now + 1000 * 60 * 60 * 24 * 8);
    expect(expired).toBeNull();
  });

  it("blocks unauthenticated phone-only customer login and enforces sliding-window rate limits", () => {
    const phoneOnly = loginRequestSchema.safeParse({
      mode: "customer",
      phone: "0812345678",
    });
    expect(phoneOnly.success).toBe(false);

    const key = `test-rl-${Date.now()}`;
    const t0 = 1_700_000_000_000;
    try {
      expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 }, t0).allowed).toBe(true);
      expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 }, t0 + 1000).allowed).toBe(true);

      const blocked = checkRateLimit(key, { limit: 2, windowMs: 60_000 }, t0 + 2000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);

      // Resets cleanly after window expires
      expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 }, t0 + 61_000).allowed).toBe(true);
    } finally {
      clearRateLimitBucket(key);
    }
  });
});
