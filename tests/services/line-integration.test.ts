import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  getLineBotInfo,
  getLineUserProfile,
  pushLineMessage,
} from "@/services/adapters/line.adapter";
import {
  getAdminLineStatus,
  sendAdminLineTestPush,
  syncStoreLineFromBot,
} from "@/services/line-admin.service";

describe("LINE OA integration & admin service", () => {
  it("guards against live HTTP calls during test runs unless fetchFn is injected", async () => {
    const res = await pushLineMessage("U4705c60091e36513849ba962929e0254", [
      { type: "text", text: "should stay in sandbox during vitest" },
    ]);
    expect(res.mode).toBe("sandbox");
    expect(res.ok).toBe(true);
  });

  it("fetches and validates bot info and customer profile via injected fetchFn", async () => {
    const mockFetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("/v2/bot/info")) {
        return new Response(
          JSON.stringify({
            userId: "Ubot123",
            basicId: "@831uzirg",
            displayName: "steakboss",
            chatMode: "bot",
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          userId: "Ucust999",
          displayName: "คุณสมชาย สายเนื้อ",
          pictureUrl: "https://example.com/pic.jpg",
        }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const bot = await getLineBotInfo({ token: "test-token", fetchFn: mockFetch });
    expect(bot.ok).toBe(true);
    expect(bot.bot?.basicId).toBe("@831uzirg");
    expect(bot.bot?.displayName).toBe("steakboss");

    const profile = await getLineUserProfile("Ucust999", {
      token: "test-token",
      fetchFn: mockFetch,
    });
    expect(profile?.displayName).toBe("คุณสมชาย สายเนื้อ");
  });

  it("syncs StoreSetting lineId and lineOaUrl from LINE Bot basicId", async () => {
    const before = await db.storeSetting.findUnique({ where: { id: "default" } });
    const mockFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          userId: "Ubot123",
          basicId: "@831uzirg",
          displayName: "steakboss",
          chatMode: "bot",
        }),
        { status: 200 }
      )
    ) as unknown as typeof fetch;

    const synced = await syncStoreLineFromBot({
      token: "test-token",
      fetchFn: mockFetch,
    });
    expect(synced.ok).toBe(true);
    expect(synced.settings?.lineId).toBe("@831uzirg");
    expect(synced.settings?.lineOaUrl).toBe("https://line.me/R/ti/p/@831uzirg");

    const status = await getAdminLineStatus({
      token: "test-token",
      channelId: "2012832385",
      channelSecret: "secret",
      staffTargetId: "U4705c60091e36513849ba962929e0254",
      fetchFn: mockFetch,
    });
    expect(status.isLive).toBe(true);
    expect(status.staffTargetPreview).toBe("U4705c...0254");
    expect(status.bot?.basicId).toBe("@831uzirg");

    const pushMock = vi.fn(async () => new Response("{}", { status: 200 })) as unknown as typeof fetch;
    const pushed = await sendAdminLineTestPush({
      token: "test-token",
      to: "U4705c60091e36513849ba962929e0254",
      fetchFn: pushMock,
    });
    expect(pushed.ok).toBe(true);
    expect(pushed.mode).toBe("live");

    if (before) {
      await db.storeSetting.update({
        where: { id: "default" },
        data: { lineId: before.lineId, lineOaUrl: before.lineOaUrl },
      });
    }
  });
});
