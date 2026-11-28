"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface LineLiffGlobal {
  init: (config: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  getIDToken: () => string | null;
}

declare global {
  interface Window {
    liff?: LineLiffGlobal;
  }
}

function loadLiffSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.liff) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("โหลด LINE LIFF SDK ไม่สำเร็จ"));
    document.head.appendChild(script);
  });
}

export function LiffEntryView({
  liffId,
  nextPath,
}: {
  liffId: string;
  nextPath: string;
}) {
  const router = useRouter();
  const [statusText, setStatusText] = useState("กำลังเชื่อมต่อบัญชี LINE ของคุณ...");

  useEffect(() => {
    let cancelled = false;
    try {
      localStorage.setItem("sb_order_channel", "LINE");
    } catch {
      // ignore private browsing storage error
    }

    async function bootstrap() {
      const meRes = await fetch("/api/auth/me").catch(() => null);
      if (meRes?.ok) {
        const me = (await meRes.json()) as { user?: { id: string } | null };
        if (me.user && !cancelled) {
          router.replace(nextPath);
          return;
        }
      }

      if (liffId) {
        try {
          await loadLiffSdk();
          if (window.liff) {
            await window.liff.init({ liffId });
            const idToken = window.liff.isLoggedIn() ? window.liff.getIDToken() : null;
            if (idToken) {
              setStatusText("กำลังเข้าสู่ระบบ SteakBoss ด้วย LINE...");
              const authRes = await fetch("/api/auth/line/liff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
              });
              if (authRes.ok && !cancelled) {
                router.replace(nextPath);
                return;
              }
            }
          }
        } catch {
          // Fall back to standard LINE OAuth below
        }
      }

      if (!cancelled) {
        window.location.href = `/api/auth/line?next=${encodeURIComponent(nextPath)}`;
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [liffId, nextPath, router]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="sb-panel space-y-4 py-10">
        <Loader2 className="w-8 h-8 text-[#06C755] animate-spin mx-auto" />
        <h1 className="font-display font-bold text-xl">STEAKBOSS · LINE</h1>
        <p className="text-sm text-sb-mute">{statusText}</p>
      </div>
    </div>
  );
}
