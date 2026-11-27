"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

interface ChatMsg {
  id?: string;
  sender: "CUSTOMER" | "BOT" | "ADMIN";
  content: string;
}

const QUICK_REPLIES = [
  "แนะนำเมนูหน่อย",
  "ค่าส่งเท่าไหร่",
  "วิธีปรุง",
  "สายคลีนกินอะไรดี",
  "คุยแอดมิน",
];

export function BossBotWidget({ lineOaUrl }: { lineOaUrl: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"BOT" | "HUMAN">("BOT");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      sender: "BOT",
      content:
        "สวัสดีครับ ผมบอสบอท ผู้ช่วยร้าน Steakboss\nถามเรื่องเมนู ค่าส่ง ติดตามพัสดุ หรือพิมพ์ \"คุยแอดมิน\" เพื่อติดต่อทีมงานได้เลยครับ",
    },
  ]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let id = localStorage.getItem("sb-chat-sid");
    if (!id) {
      id = `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("sb-chat-sid", id);
    }
    setSessionId(id);
  }, []);

  useEffect(() => {
    if (!open || !sessionId) return;
    fetch(`/api/chat/web?sessionId=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((data: { mode?: "BOT" | "HUMAN"; messages?: ChatMsg[] }) => {
        if (data.mode) setMode(data.mode);
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});
  }, [open, sessionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function sendText(text: string) {
    const clean = text.trim();
    if (!clean || busy || !sessionId) return;
    setBusy(true);
    setInput("");
    setMessages((prev) => [...prev, { sender: "CUSTOMER", content: clean }]);

    try {
      const res = await fetch("/api/chat/web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: clean }),
      });
      const data = (await res.json()) as { mode?: "BOT" | "HUMAN"; reply?: string | null };
      if (data.mode) setMode(data.mode);
      if (data.reply) {
        setMessages((prev) => [...prev, { sender: "BOT", content: data.reply! }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "BOT", content: "ขออภัย ระบบเชื่อมต่อขัดข้องชั่วคราวครับ" },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-5 bottom-5 z-40 w-14 h-14 rounded-full bg-sb-pink text-[#1a1205] shadow-2xl grid place-items-center hover:brightness-110 transition"
        aria-label="แชทกับบอสบอท"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {open && (
        <section className="fixed right-4 bottom-24 z-40 w-[min(380px,calc(100vw-2rem))] h-[min(540px,calc(100dvh-8rem))] bg-sb-panel border border-sb-line rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-sb-line bg-sb-panel2">
            <div className="w-9 h-9 rounded-full bg-sb-pink text-[#1a1205] font-display font-extrabold text-sm grid place-items-center">
              SB
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-sm leading-tight">บอสบอท · Steakboss</p>
              <p className="text-xs text-sb-mute">
                {mode === "HUMAN" ? "โหมดแอดมินดูแลต่อ" : "ผู้ช่วยอัตโนมัติ + เชื่อม LINE OA"}
              </p>
            </div>
            {lineOaUrl && (
              <a
                href={lineOaUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#06C755] text-white"
              >
                LINE OA
              </a>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
            {messages.map((m, idx) => (
              <div
                key={m.id ?? idx}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                  m.sender === "CUSTOMER"
                    ? "ml-auto bg-sb-pink text-[#1a1205] rounded-br-sm"
                    : m.sender === "ADMIN"
                      ? "bg-emerald-950 border border-emerald-700/50 text-emerald-100 rounded-bl-sm"
                      : "bg-sb-panel2 text-sb-ink rounded-bl-sm"
                }`}
              >
                {m.sender === "ADMIN" && (
                  <span className="block text-[11px] font-bold text-emerald-400 mb-0.5">
                    แอดมินร้าน
                  </span>
                )}
                {m.content}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendText(q)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-sb-line hover:bg-sb-panel2"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendText(input);
            }}
            className="flex gap-2 p-2.5 border-t border-sb-line"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์ถามเมนู / ค่าส่ง / เลขพัสดุ..."
              className="sb-input min-h-[40px] py-2 text-sm"
            />
            <button type="submit" disabled={busy} className="sb-btn min-h-[40px] px-3.5">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
