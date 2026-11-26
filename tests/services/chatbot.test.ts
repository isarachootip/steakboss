import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { verifyLineSignature } from "@/services/adapters/line.adapter";
import { handleIncomingChatMessage } from "@/services/chatbot.service";

describe("LINE & BossBot chat service", () => {
  it("verifies LINE HMAC-SHA256 signature accurately", () => {
    const secret = "test-channel-secret";
    const body = JSON.stringify({ events: [] });
    const sig = crypto.createHmac("sha256", secret).update(body).digest("base64");
    expect(verifyLineSignature(body, sig, secret)).toBe(true);
    expect(verifyLineSignature(body, "invalid-sig", secret)).toBe(false);
  });

  it("answers shipping queries and hands off to human admin on request", async () => {
    const externalId = `test-line-${Date.now()}`;
    const q1 = await handleIncomingChatMessage({
      channel: "LINE",
      externalId,
      content: "ค่าส่งรหัส 10110 เท่าไหร่",
    });
    expect(q1.mode).toBe("BOT");
    expect(q1.reply).toContain("60");

    const q2 = await handleIncomingChatMessage({
      channel: "LINE",
      externalId,
      content: "ขอคุยแอดมินหน่อยครับ",
    });
    expect(q2.mode).toBe("HUMAN");
    expect(q2.reply).toContain("แอดมิน");

    const q3 = await handleIncomingChatMessage({
      channel: "LINE",
      externalId,
      content: "ยังมีอยู่ไหม",
    });
    expect(q3.mode).toBe("HUMAN");
    expect(q3.reply).toBeNull();

    await db.chatThread.delete({ where: { id: q1.threadId } });
  });

  it("answers air-fryer cooking questions dynamically from published CookingGuide with share link", async () => {
    const externalId = `test-cook-${Date.now()}`;
    const q = await handleIncomingChatMessage({
      channel: "WEB",
      externalId,
      content: "ใช้หม้อทอดไร้น้ำมัน กี่องศา กี่นาทีครับ",
    });
    expect(q.mode).toBe("BOT");
    expect(q.reply).toContain("180°C");
    expect(q.reply).toContain("/guides/air-fryer");

    await db.chatThread.delete({ where: { id: q.threadId } });
  });
});
