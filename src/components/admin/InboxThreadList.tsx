"use client";

export interface ThreadSummary {
  id: string;
  channel: string;
  externalId: string;
  customerName: string;
  mode: "BOT" | "HUMAN";
  lastMessageAt: string;
  lastMessage: string;
}

export function InboxThreadList({
  threads,
  activeId,
  onSelect,
}: {
  threads: ThreadSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="sb-panel p-2 space-y-1 overflow-y-auto max-h-[70vh]">
      {threads.length === 0 ? (
        <p className="text-xs text-sb-mute text-center py-8">
          ยังไม่มีห้องแชท ลองกดปุ่มจำลอง LINE OA ด้านบน
        </p>
      ) : (
        threads.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={`w-full text-left p-3 rounded-xl transition ${
              activeId === t.id
                ? "bg-sb-panel2 border border-sb-pink/60"
                : "hover:bg-sb-panel2/60"
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-sm truncate">{t.customerName}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  t.channel === "LINE"
                    ? "bg-[#06C755]/20 text-[#06C755]"
                    : "bg-sb-pink/20 text-sb-pink2"
                }`}
              >
                {t.channel}
              </span>
            </div>
            <p className="text-xs text-sb-mute truncate mt-1">{t.lastMessage}</p>
            <span
              className={`inline-block mt-1 text-[10px] font-bold ${
                t.mode === "HUMAN" ? "text-sb-orange" : "text-sb-ok"
              }`}
            >
              {t.mode === "HUMAN" ? "● รอแอดมินดูแล" : "● บอสบอทดูแล"}
            </span>
          </button>
        ))
      )}
    </div>
  );
}
