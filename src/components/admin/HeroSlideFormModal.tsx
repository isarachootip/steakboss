"use client";

import { useState } from "react";
import { Image as ImageIcon, LayoutTemplate, X } from "lucide-react";
import type {
  HeroSlideDto,
  HeroSlideMode,
  UpsertHeroSlideInput,
} from "@/schemas/promo.schema";
import { ImageUploadField } from "./ImageUploadField";
import { HeroSlideOverlayFields } from "./HeroSlideOverlayFields";
import { ScheduleFields } from "./ScheduleFields";

function toInitialForm(
  slide: HeroSlideDto | null,
  nextSortOrder: number
): UpsertHeroSlideInput {
  if (slide) {
    const { id: _id, updatedAt: _updatedAt, ...rest } = slide;
    return { ...rest, badges: [...slide.badges] };
  }
  return {
    mode: "IMAGE_BANNER", title: "", imageUrl: "", eyebrow: "", headline: "",
    subheadline: "", packCardImgUrl: "", packCardCaption: "", badges: [],
    primaryCtaLabel: "เลือกเมนูเลย", primaryCtaHref: "#menu",
    secondaryCtaLabel: "", secondaryCtaHref: "", linkHref: "#menu",
    sortOrder: nextSortOrder, isActive: true, startsAt: null, endsAt: null,
  };
}

export function HeroSlideFormModal({
  slide,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  slide: HeroSlideDto | null;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: (saved: HeroSlideDto, isNew: boolean) => void;
}) {
  const [form, setForm] = useState<UpsertHeroSlideInput>(() =>
    toInitialForm(slide, nextSortOrder)
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setMode = (mode: HeroSlideMode) => setForm((prev) => ({ ...prev, mode }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const url = slide
        ? `/api/admin/content/slides/${slide.id}`
        : "/api/admin/content/slides";
      const res = await fetch(url, {
        method: slide ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { slide?: HeroSlideDto; error?: string };
      if (!res.ok || !data.slide) {
        setErr(data.error || "บันทึกสไลด์ไม่สำเร็จ");
        return;
      }
      onSaved(data.slide, !slide);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-sb-panel border border-sb-line p-5 sm:p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display font-extrabold text-xl">
            {slide ? "แก้ไขสไลด์ Hero" : "เพิ่มสไลด์ Hero ใหม่"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="sb-btn-dark px-2.5 py-2"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-sb-bgDeep border border-sb-line">
            <button
              type="button"
              onClick={() => setMode("IMAGE_BANNER")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-display font-bold transition ${
                form.mode === "IMAGE_BANNER"
                  ? "bg-sb-pink text-[#1a1205]"
                  : "text-sb-ink hover:bg-sb-panel2"
              }`}
            >
              <ImageIcon className="w-4 h-4" /> แบนเนอร์รูปเต็มใบ
            </button>
            <button
              type="button"
              onClick={() => setMode("TEXT_OVERLAY")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-display font-bold transition ${
                form.mode === "TEXT_OVERLAY"
                  ? "bg-sb-pink text-[#1a1205]"
                  : "text-sb-ink hover:bg-sb-panel2"
              }`}
            >
              <LayoutTemplate className="w-4 h-4" /> รูป + ข้อความทับ
            </button>
          </div>

          <label className="block text-sm">
            <span className="text-xs font-semibold text-sb-mute">
              ชื่อสไลด์ / คำอธิบายรูป (Alt Text)
            </span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="เช่น โปรสเต็กส่งฟรีปลายเดือน"
              className="sb-input mt-1 text-sm"
            />
          </label>

          <ImageUploadField
            label="รูปแบนเนอร์หลัก (แนะนำแนวนอน 16:9 ความละเอียดสูง)"
            value={form.imageUrl}
            onChange={(url) => setForm({ ...form, imageUrl: url })}
          />

          {form.mode === "IMAGE_BANNER" ? (
            <label className="block text-sm">
              <span className="text-xs font-semibold text-sb-mute">
                ลิงก์ปลายทางเมื่อคลิกแบนเนอร์ (ไม่บังคับ เช่น #menu, /guides หรือ https://...)
              </span>
              <input
                value={form.linkHref}
                onChange={(e) => setForm({ ...form, linkHref: e.target.value })}
                placeholder="#menu"
                className="sb-input mt-1 text-sm"
              />
            </label>
          ) : (
            <HeroSlideOverlayFields form={form} onChange={setForm} />
          )}

          <ScheduleFields
            startsAt={form.startsAt}
            endsAt={form.endsAt}
            onChange={({ startsAt, endsAt }) =>
              setForm({ ...form, startsAt, endsAt })
            }
          />

          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 accent-sb-pink"
            />
            <span className="font-semibold">เปิดใช้งานสไลด์นี้บนหน้าแรก</span>
          </label>

          {err && <p className="text-xs text-sb-orange font-semibold">{err}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="sb-btn-dark text-sm">
              ยกเลิก
            </button>
            <button type="submit" disabled={saving} className="sb-btn text-sm">
              {saving ? "กำลังบันทึก..." : "บันทึกสไลด์"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
