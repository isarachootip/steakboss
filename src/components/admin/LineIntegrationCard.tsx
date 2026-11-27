"use client";

import { useEffect, useState } from "react";
import type { AdminLineStatus } from "@/services/line-admin.service";

interface Props {
  initialStatus: AdminLineStatus;
  isOwner: boolean;
  onLineSettingsSynced: (lineId: string, lineOaUrl: string) => void;
}

export function LineIntegrationCard({
  initialStatus,
  isOwner,
  onLineSettingsSynced,
}: Props) {
  const [status] = useState(initialStatus);
  const [origin, setOrigin] = useState("");
  const [busyAction, setBusyAction] = useState<"test" | "sync" | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const webhookUrl = `${origin || ""}${status.webhookPath}`;

  async function handleTestPush() {
    setBusyAction("test");
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/line/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_push" }),
      });
      const data = (await res.json()) as {
        error?: string;
        result?: { mode?: string };
      };
      if (res.ok) {
        setFeedback({
          ok: true,
          text:
            data.result?.mode === "live"
              ? "ส่งข้อความทดสอบเข้า LINE แอดมินสำเร็จแล้ว!"
              : "ทำงานในโหมด Sandbox (ยังไม่ได้ตั้งค่า Access Token)",
        });
      } else {
        setFeedback({ ok: false, text: data.error || "ส่งข้อความทดสอบไม่สำเร็จ" });
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSyncStoreLine() {
    setBusyAction("sync");
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/line/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync_store_line" }),
      });
      const data = (await res.json()) as {
        error?: string;
        settings?: { lineId: string; lineOaUrl: string };
      };
      if (res.ok && data.settings) {
        onLineSettingsSynced(data.settings.lineId, data.settings.lineOaUrl);
        setFeedback({
          ok: true,
          text: `ซิงก์ LINE ID ร้านเป็น ${data.settings.lineId} เรียบร้อยแล้ว`,
        });
      } else {
        setFeedback({ ok: false, text: data.error || "ซิงก์ LINE OA ไม่สำเร็จ" });
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function copyWebhook() {
    await navigator.clipboard.writeText(webhookUrl);
    setFeedback({ ok: true, text: "คัดลอก Webhook URL แล้ว นำไปวางใน LINE Developers Console ได้เลย" });
  }

  return (
    <div className="sb-panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-lg">
            สถานะการเชื่อมต่อ LINE Official Account (Messaging API)
          </h2>
          <p className="text-xs text-sb-mute mt-0.5">
            เชื่อมบอสบอท ตอบแชทจาก Inbox และแจ้งเตือนออเดอร์/สลิปเข้า LINE แอดมินอัตโนมัติ
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${
            status.isLive
              ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300"
              : "bg-sb-panel2 border-sb-line text-sb-mute"
          }`}
        >
          {status.isLive ? "● เชื่อมต่อ LINE OA จริงแล้ว (Live)" : "○ โหมดจำลอง (Sandbox)"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-sb-panel2 border border-sb-line p-3">
          <div className="text-xs text-sb-mute">บัญชีบอท LINE OA</div>
          <div className="font-bold mt-1">
            {status.bot ? `${status.bot.displayName} (${status.bot.basicId || "-"})` : status.botError || "ยังไม่พบ Token"}
          </div>
          {status.channelIdPreview && (
            <div className="text-xs text-sb-mute mt-0.5">Channel ID: {status.channelIdPreview}</div>
          )}
        </div>

        <div className="rounded-xl bg-sb-panel2 border border-sb-line p-3">
          <div className="text-xs text-sb-mute">ผู้รับแจ้งเตือนแอดมิน (LINE_STAFF_GROUP_ID)</div>
          <div className="font-bold mt-1">
            {status.staffTargetPreview || "ยังไม่ได้ระบุ"}
          </div>
          <div className="text-xs text-sb-mute mt-0.5">
            รับแจ้งเตือนออเดอร์ใหม่ / แนบสลิป / ลูกค้าเรียกแอดมิน
          </div>
        </div>

        <div className="rounded-xl bg-sb-panel2 border border-sb-line p-3">
          <div className="text-xs text-sb-mute">Webhook URL (สำหรับตั้งใน LINE Console)</div>
          <div className="font-mono text-xs break-all mt-1 text-sb-pink2">{webhookUrl}</div>
          <button
            type="button"
            onClick={copyWebhook}
            className="text-xs underline text-sb-mute hover:text-sb-ink mt-1"
          >
            คัดลอกลิงก์ Webhook
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-4 py-2.5 text-sm border ${
            feedback.ok
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : "bg-red-950/40 border-red-500/40 text-red-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {isOwner && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleTestPush}
            className="sb-btn text-sm"
          >
            {busyAction === "test" ? "กำลังส่ง..." : "ส่งข้อความทดสอบเข้า LINE แอดมิน"}
          </button>
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={handleSyncStoreLine}
            className="px-4 py-2 rounded-xl border border-sb-line bg-sb-panel2 hover:border-sb-pink/50 text-sm font-semibold transition"
          >
            {busyAction === "sync" ? "กำลังซิงก์..." : "ซิงก์ @LINE ID & ลิงก์ร้านอัตโนมัติ"}
          </button>
        </div>
      )}
    </div>
  );
}
