"use client";

import { useState } from "react";
import { Flame, Images, Sparkles } from "lucide-react";
import type { CookingGuideDto } from "@/schemas/content.schema";
import type { EventPopupDto, HeroSlideDto } from "@/schemas/promo.schema";
import { HeroSlidesManager } from "./HeroSlidesManager";
import { EventPopupEditor } from "./EventPopupEditor";
import { GuidesManager } from "./GuidesManager";

type ActiveTab = "slides" | "popup" | "guides";

export function ContentWorkspace({
  initialSlides,
  initialPopup,
  initialGuides,
}: {
  initialSlides: HeroSlideDto[];
  initialPopup: EventPopupDto;
  initialGuides: CookingGuideDto[];
}) {
  const [tab, setTab] = useState<ActiveTab>("slides");
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-3xl">
          จัดการเนื้อหาหน้าร้าน, สไลด์ & อีเวนต์
        </h1>
        <p className="text-sm text-sb-mute mt-1">
          เพิ่ม/เรียงลำดับสไลด์แบนเนอร์ Hero หน้าแรก ตั้งค่าป๊อปอัปอีเวนต์ และจัดการคู่มือการปรุง
        </p>
      </div>

      {notice && (
        <div className="rounded-xl bg-sb-panel2 border border-sb-pink/40 px-4 py-2.5 text-sm text-sb-pink2">
          {notice}
        </div>
      )}

      <div className="inline-flex flex-wrap gap-2 p-1.5 rounded-2xl bg-sb-panel border border-sb-line">
        <button
          type="button"
          onClick={() => setTab("slides")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-display font-bold transition ${
            tab === "slides"
              ? "bg-sb-pink text-[#1a1205]"
              : "text-sb-ink hover:bg-sb-panel2"
          }`}
        >
          <Images className="w-4 h-4" />
          สไลด์ Hero หน้าแรก
        </button>
        <button
          type="button"
          onClick={() => setTab("popup")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-display font-bold transition ${
            tab === "popup"
              ? "bg-sb-pink text-[#1a1205]"
              : "text-sb-ink hover:bg-sb-panel2"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          ป๊อปอัปอีเวนต์
        </button>
        <button
          type="button"
          onClick={() => setTab("guides")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-display font-bold transition ${
            tab === "guides"
              ? "bg-sb-pink text-[#1a1205]"
              : "text-sb-ink hover:bg-sb-panel2"
          }`}
        >
          <Flame className="w-4 h-4" />
          คู่มือการทอด & คำแนะนำ
        </button>
      </div>

      {tab === "slides" && (
        <HeroSlidesManager initialSlides={initialSlides} onNotify={setNotice} />
      )}
      {tab === "popup" && (
        <EventPopupEditor initialPopup={initialPopup} onNotify={setNotice} />
      )}
      {tab === "guides" && (
        <GuidesManager initialGuides={initialGuides} onNotify={setNotice} />
      )}
    </div>
  );
}
