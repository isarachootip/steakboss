"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { EventPopupDto } from "@/schemas/promo.schema";

const OPEN_DELAY_MS = 600;

function isExternalUrl(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

export function EventPopupModal({ popup }: { popup: EventPopupDto }) {
  const [open, setOpen] = useState(false);
  const storageKey = `sb_event_popup_v1:${popup.updatedAt}:${popup.imageUrl}`;

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Ignore storage access failures in strict privacy modes
    }
  }, [storageKey]);

  useEffect(() => {
    if (!popup.isActive || !popup.imageUrl) return;
    try {
      if (window.sessionStorage.getItem(storageKey) === "1") {
        return;
      }
    } catch {
      // Proceed even if sessionStorage is unavailable
    }

    let cancelled = false;
    let timerId: number | null = null;

    const preload = new Image();
    preload.onload = () => {
      if (cancelled) return;
      timerId = window.setTimeout(() => {
        if (!cancelled) setOpen(true);
      }, OPEN_DELAY_MS);
    };
    preload.onerror = () => {
      // Fail-silent: never display a broken or empty popup box
    };
    preload.src = popup.imageUrl;

    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [popup.isActive, popup.imageUrl, storageKey]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, dismiss]);

  if (!open) return null;

  const imageNode = (
    <img
      src={popup.imageUrl}
      alt={popup.title || "ประกาศอีเวนต์ Steakboss"}
      onError={dismiss}
      className="w-full max-h-[78vh] object-contain rounded-2xl bg-[#120e0d] select-none"
    />
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={popup.title || "โปรโมชันและอีเวนต์หน้าแรก"}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md sm:max-w-lg rounded-3xl bg-sb-panel border border-sb-line shadow-2xl p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="ปิดป๊อปอัป"
          className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-sb-panel2 hover:bg-sb-pink hover:text-[#1a1205] border border-sb-line text-white flex items-center justify-center shadow-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        {popup.linkHref ? (
          isExternalUrl(popup.linkHref) ? (
            <a
              href={popup.linkHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="block rounded-2xl overflow-hidden"
            >
              {imageNode}
            </a>
          ) : (
            <Link
              href={popup.linkHref}
              onClick={dismiss}
              className="block rounded-2xl overflow-hidden"
            >
              {imageNode}
            </Link>
          )
        ) : (
          <div className="rounded-2xl overflow-hidden">{imageNode}</div>
        )}
      </div>
    </div>
  );
}
