"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Flame, Sparkles, Video } from "lucide-react";
import type { CookingGuideDto } from "@/schemas/content.schema";

export function CookingGuidesTabs({
  guides,
}: {
  guides: CookingGuideDto[];
}) {
  const [activeId, setActiveId] = useState<string>(guides[0]?.id ?? "");
  const active = guides.find((g) => g.id === activeId) ?? guides[0];

  if (!active) {
    return null;
  }

  return (
    <section id="cook" className="py-16 sm:py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-display font-bold bg-sb-pink/15 text-sb-pink2 mb-2">
            คู่มือความอร่อย Steakboss
          </span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl">
            ย่าง ทอด หรือหม้อทอด ก็ฉ่ำเหมือนทานที่ร้าน
          </h2>
          <p className="text-sb-mute mt-1">
            ทุกซองหมักเข้าเนื้อมาให้แล้ว เลือกดูวิธีทำตามอุปกรณ์ที่คุณมีที่บ้านได้เลย
          </p>
        </div>
        <Link href="/guides" className="sb-btn-ghost text-sm min-h-[40px]">
          ดูคู่มือแนะนำทั้งหมด <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {guides.map((g) => {
          const isSelected = g.id === active.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setActiveId(g.id)}
              className={`shrink-0 px-4 py-2.5 rounded-full font-display font-bold text-sm transition ${
                isSelected
                  ? "bg-sb-pink text-[#2a0618] shadow-lg"
                  : "bg-sb-panel border border-sb-line text-sb-ink hover:bg-sb-panel2"
              }`}
            >
              {g.equipmentLabel}
            </button>
          );
        })}
      </div>

      <div className="sb-panel space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-sb-line pb-5">
          <div className="space-y-1.5">
            <h3 className="font-display font-extrabold text-2xl">
              {active.title}
            </h3>
            <p className="text-sm text-sb-mute max-w-2xl">{active.summary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {active.tempLabel && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sb-panel2 border border-sb-line text-sm font-semibold">
                <Flame className="w-4 h-4 text-sb-pink" /> {active.tempLabel}
              </span>
            )}
            {active.durationLabel && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sb-panel2 border border-sb-line text-sm font-semibold">
                <Clock className="w-4 h-4 text-sb-pink" /> {active.durationLabel}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {active.steps.map((step, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-[#120f0e] border border-sb-line p-4 space-y-2"
            >
              <p className="font-display font-extrabold text-3xl text-sb-pink">
                {idx + 1}
              </p>
              <h4 className="font-display font-bold text-base">{step.title}</h4>
              <p className="text-sm text-sb-mute leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          {active.tips[0] ? (
            <p className="text-xs sm:text-sm text-sb-pink2 inline-flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-sb-pink" />
              <span>เคล็ดลับ: {active.tips[0]}</span>
            </p>
          ) : (
            <span />
          )}

          <Link
            href={`/guides/${active.slug}`}
            className="sb-btn-dark shrink-0 text-xs sm:text-sm"
          >
            {active.videoUrl && <Video className="w-4 h-4 text-sb-pink" />}
            อ่านคู่มือเต็ม & แชร์ลิงก์ <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
