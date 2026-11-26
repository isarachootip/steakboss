"use client";

import { useState } from "react";
import { Flame, LayoutTemplate } from "lucide-react";
import type {
  CookingGuideDto,
  LandingContentInput,
} from "@/schemas/content.schema";
import { LandingHeroEditor } from "./LandingHeroEditor";
import { GuidesManager } from "./GuidesManager";

type ActiveTab = "guides" | "landing";

export function ContentWorkspace({
  initialLanding,
  initialGuides,
}: {
  initialLanding: LandingContentInput;
  initialGuides: CookingGuideDto[];
}) {
  const [tab, setTab] = useState<ActiveTab>("guides");
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-3xl">
          จัดการเนื้อหาหน้าร้าน & คู่มือการปรุง
        </h1>
        <p className="text-sm text-sb-mute mt-1">
          ปรับแต่งข้อความ/รูปหน้าแรก (Landing Hero) และจัดการคำแนะนำการใช้หม้อทอดไร้น้ำมัน การย่าง และการละลายน้ำแข็ง
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
          onClick={() => setTab("guides")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-display font-bold transition ${
            tab === "guides"
              ? "bg-sb-pink text-[#2a0618]"
              : "text-sb-ink hover:bg-sb-panel2"
          }`}
        >
          <Flame className="w-4 h-4" />
          คู่มือการทอด & คำแนะนำต่างๆ
        </button>
        <button
          type="button"
          onClick={() => setTab("landing")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-display font-bold transition ${
            tab === "landing"
              ? "bg-sb-pink text-[#2a0618]"
              : "text-sb-ink hover:bg-sb-panel2"
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          ส่วน Hero หน้าแรก (Landing)
        </button>
      </div>

      {tab === "guides" ? (
        <GuidesManager initialGuides={initialGuides} onNotify={setNotice} />
      ) : (
        <LandingHeroEditor initialLanding={initialLanding} onNotify={setNotice} />
      )}
    </div>
  );
}
