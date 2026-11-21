"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, Bot, UserCheck, MessageSquarePlus } from "lucide-react";
import { formatBaht, formatDateTimeTH } from "@/lib/format";
import { InboxThreadList, type ThreadSummary } from "./InboxThreadList";

interface ThreadDetail {
  id: string;
  channel: string;
  externalId: string;
  customerName: string;
  mode: "BOT" | "HUMAN";
  messages: Array<{ id: string; sender: string; content: string; createdAt: string }>;
  user: {
    name: string;
    phone: string | null;
    orders: Array<{ orderNo: string; status: string; totalBaht: number }>;
  } | null;
}

export function InboxWorkspace() {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);

  const loadThreads = useCallback(async () => {
    const res = await fetch("/api/admin/inbox");
    if (res.ok) {
      const data = (await res.json()) as { threads: ThreadSummary[] };
      setThreads(data.threads);
      if (!activeId && data.threads[0]) setActiveId(data.threads[0].id);
    }
  }, [activeId]);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/inbox/${id}`);
    if (res.ok) {
      const data = (await res.json()) as { thread: ThreadDetail };
      setDetail(data.thread);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (activeId) loadDetail(activeId);
  }, [activeId, loadDetail]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !replyText.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/inbox/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText }),
      });
      if (res.ok) {
        setReplyText("");
        await loadDetail(activeId);
        await loadThreads();
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleMode(nextMode: "BOT" | "HUMAN") {
    if (!activeId) return;
    await fetch(`/api/admin/inbox/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: nextMode }),
    });
    await loadDetail(activeId);
    await loadThreads();
  }

  async function simulateLineMessage() {
    await fetch("/api/webhooks/line", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events: [{
          type: "message",
          replyToken: "sandbox-reply-token",
          source: { type: "user", userId: "U_DEMO_LINE_001" },
          message: { type: "text", text: "สวัสดีครับ ค่าส่งรหัส 10110 เท่าไหร่ ขอคุยแอดมินด้วยครับ" },
        }],
      }),
    });
    await loadThreads();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-3xl">Unified Inbox (LINE OA + Web Chat)</h1>
          <p className="text-sm text-sb-mute">ตอบแชทลูกค้าจากทั้ง LINE OA และหน้าเว็บในหน้าจอเดียว พร้อมสลับโหมดบอท/แอดมิน</p>
        </div>
        <button type="button" onClick={simulateLineMessage} className="sb-btn-dark text-xs">
          <MessageSquarePlus className="w-4 h-4 text-[#06C755]" /> จำลองแชทเข้าจาก LINE OA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_240px] gap-4 min-h-[65vh]">
        <InboxThreadList threads={threads} activeId={activeId} onSelect={setActiveId} />

        <div className="sb-panel flex flex-col max-h-[70vh]">
          {!detail ? (
            <div className="flex-1 grid place-items-center text-sm text-sb-mute">
              เลือกห้องแชทเพื่อดูบทสนทนา
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-sb-line gap-2">
                <div>
                  <p className="font-display font-bold">{detail.customerName}</p>
                  <p className="text-xs text-sb-mute">
                    {detail.channel} · {detail.externalId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleMode(detail.mode === "BOT" ? "HUMAN" : "BOT")}
                  className="sb-btn-dark text-xs"
                >
                  {detail.mode === "BOT" ? (
                    <><UserCheck className="w-3.5 h-3.5" /> รับช่วงต่อ</>
                  ) : (
                    <><Bot className="w-3.5 h-3.5" /> คืนให้บอสบอท</>
                  )}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-2.5">
                {detail.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                      m.sender === "CUSTOMER"
                        ? "bg-sb-panel2"
                        : m.sender === "ADMIN"
                          ? "ml-auto bg-sb-pink text-[#2a0618]"
                          : "ml-auto bg-emerald-950/70 border border-emerald-700/40"
                    }`}
                  >
                    <span className="block text-[10px] opacity-70 mb-0.5">
                      {m.sender} · {formatDateTimeTH(m.createdAt)}
                    </span>
                    {m.content}
                  </div>
                ))}
              </div>

              <form onSubmit={sendReply} className="flex gap-2 pt-3 border-t border-sb-line">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="พิมพ์ตอบลูกค้า (ส่งออก LINE OA อัตโนมัติถ้าเป็นแชท LINE)..."
                  className="sb-input min-h-[42px] text-sm"
                />
                <button type="submit" disabled={busy} className="sb-btn min-h-[42px] px-4">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>

        <div className="sb-panel space-y-3 text-sm">
          <p className="font-display font-bold">ข้อมูลลูกค้า & ออเดอร์</p>
          {detail?.user ? (
            <div className="space-y-2">
              <p className="text-xs text-sb-mute">โทร: {detail.user.phone || "-"}</p>
              {detail.user.orders.map((o) => (
                <div key={o.orderNo} className="p-2.5 rounded-xl bg-sb-panel2 text-xs">
                  <p className="font-bold text-sb-pink2">{o.orderNo}</p>
                  <p>{formatBaht(o.totalBaht)} · {o.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-sb-mute">ลูกค้ายังไม่ได้ผูกบัญชีสมาชิกกับห้องแชทนี้</p>
          )}
        </div>
      </div>
    </div>
  );
}
