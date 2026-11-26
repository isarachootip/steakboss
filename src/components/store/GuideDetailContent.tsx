"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import type { CookingGuideDto } from "@/schemas/content.schema";
import { resolveVideoEmbed } from "@/domain/content-defaults";

export function GuideDetailContent({ guide }: { guide: CookingGuideDto }) {
  const [copied, setCopied] = useState(false);
  const video = resolveVideoEmbed(guide.videoUrl);

  async function handleCopyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <article className="space-y-10">
      <nav className="text-sm text-sb-mute flex flex-wrap gap-2">
        <Link href="/" className="hover:text-sb-ink">หน้าแรก</Link>
        <span>/</span>
        <Link href="/guides" className="hover:text-sb-ink">คู่มือการปรุง</Link>
        <span>/</span>
        <span className="text-sb-ink">{guide.equipmentLabel}</span>
      </nav>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="px-3.5 py-1 rounded-full text-xs font-display font-bold bg-sb-pink text-[#2a0618]">
            {guide.equipmentLabel}
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="sb-btn-dark text-xs"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-sb-ok" /> คัดลอกลิงก์แล้ว!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> คัดลอกลิงก์คู่มือนี้
              </>
            )}
          </button>
        </div>

        <h1 className="font-display font-extrabold text-3xl sm:text-5xl leading-tight">
          {guide.title}
        </h1>
        <p className="text-base sm:text-lg text-sb-mute max-w-3xl">
          {guide.summary}
        </p>

        <div className="flex flex-wrap gap-3 pt-1">
          {guide.tempLabel && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sb-panel border border-sb-line text-sm font-semibold">
              <Flame className="w-4 h-4 text-sb-pink" />
              <span>ไฟ / อุณหภูมิ: {guide.tempLabel}</span>
            </div>
          )}
          {guide.durationLabel && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sb-panel border border-sb-line text-sm font-semibold">
              <Clock className="w-4 h-4 text-sb-pink" />
              <span>เวลา: {guide.durationLabel}</span>
            </div>
          )}
        </div>
      </header>

      {video?.kind === "youtube" ? (
        <div className="rounded-3xl overflow-hidden border border-sb-line aspect-video bg-black">
          <iframe
            src={video.embedUrl}
            title={guide.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {guide.coverImgUrl && (
            <div className="rounded-3xl overflow-hidden border border-sb-line aspect-[16/8] max-h-[420px] bg-black">
              <img
                src={guide.coverImgUrl}
                alt={guide.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {video?.kind === "external" && (
            <a
              href={video.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="sb-btn-ghost text-sm"
            >
              <ExternalLink className="w-4 h-4 text-sb-pink" />
              เปิดดูคลิปสาธิตบน {video.platformLabel}
            </a>
          )}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="font-display font-extrabold text-2xl">
          ขั้นตอนการทำทีละขั้น ({guide.steps.length} ขั้นตอน)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {guide.steps.map((step, idx) => (
            <div key={idx} className="sb-panel space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-sb-pink text-[#2a0618] font-display font-extrabold text-lg grid place-items-center shrink-0">
                  {idx + 1}
                </span>
                <h3 className="font-display font-bold text-lg">{step.title}</h3>
              </div>
              <p className="text-sm text-sb-mute leading-relaxed">
                {step.description}
              </p>
              {step.imageUrl && (
                <img
                  src={step.imageUrl}
                  alt={step.title}
                  className="w-full rounded-xl object-cover aspect-[16/10] border border-sb-line"
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {guide.tips.length > 0 && (
        <section className="sb-panel border-sb-pink/40 bg-sb-panel2/60 space-y-3">
          <h2 className="font-display font-bold text-lg text-sb-pink2 inline-flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sb-pink" /> เคล็ดลับความฉ่ำจากเชฟ Steakboss
          </h2>
          <ul className="space-y-2 text-sm text-sb-ink/90 list-disc list-inside">
            {guide.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="sb-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-extrabold text-xl">
            พร้อมจัดจานสเต็กร้อน ๆ ที่บ้านแล้วหรือยัง?
          </h3>
          <p className="text-sm text-sb-mute">
            เลือกหมูพอร์คชอป ไก่นุ่ม หรืออกไก่คลีน หมักเข้าเนื้อพร้อมส่งรถเย็นถึงบ้าน
          </p>
        </div>
        <Link href="/#menu" className="sb-btn shrink-0 text-sm">
          <ShoppingBag className="w-4 h-4" /> เลือกเมนูสเต็กเลย
        </Link>
      </div>
    </article>
  );
}
