"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type {
  CookingGuideDto,
  UpsertCookingGuideInput,
} from "@/schemas/content.schema";
import { ImageUploadField } from "./ImageUploadField";
import { GuideStepsEditor } from "./GuideStepsEditor";

const EQUIPMENT_PRESETS = [
  "หม้อทอดไร้น้ำมัน",
  "ย่างบนกระทะ",
  "วิธีละลายน้ำแข็ง",
  "ไมโครเวฟ / เตาอบ",
  "เคล็ดลับการเก็บรักษา",
];

function toInitialForm(editing: CookingGuideDto | null): UpsertCookingGuideInput {
  if (!editing) {
    return {
      slug: "",
      title: "",
      equipmentLabel: "หม้อทอดไร้น้ำมัน",
      summary: "",
      tempLabel: "180°C",
      durationLabel: "12–15 นาที",
      coverImgUrl: "/images/products/kp-plated.jpg",
      videoUrl: "",
      steps: [{ title: "", description: "", imageUrl: "" }],
      tips: [],
      sortOrder: 5,
      isPublished: true,
    };
  }
  const { id: _id, updatedAt: _u, ...rest } = editing;
  return rest;
}

export function GuideFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: CookingGuideDto | null;
  onClose: () => void;
  onSaved: (guide: CookingGuideDto, msg: string) => void;
}) {
  const [form, setForm] = useState<UpsertCookingGuideInput>(() => toInitialForm(editing));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const endpoint = editing
        ? `/api/admin/content/guides/${editing.id}`
        : "/api/admin/content/guides";
      const res = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { guide?: CookingGuideDto; error?: string };
      if (!res.ok || !data.guide) {
        setErr(data.error || "บันทึกคู่มือไม่สำเร็จ");
        return;
      }
      onSaved(data.guide, editing ? "อัปเดตคู่มือเรียบร้อยแล้ว" : "สร้างคู่มือใหม่เรียบร้อยแล้ว");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto p-4 sm:p-6">
      <div className="max-w-3xl mx-auto sb-panel space-y-5 my-4">
        <div className="flex items-center justify-between border-b border-sb-line pb-3">
          <h2 className="font-display font-extrabold text-2xl">
            {editing ? `แก้ไข: ${editing.title}` : "เพิ่มคู่มือการปรุง / คำแนะนำใหม่"}
          </h2>
          <button type="button" onClick={onClose} className="sb-btn-dark px-3" aria-label="ปิดหน้าต่าง">
            <X className="w-4 h-4" />
          </button>
        </div>

        {err && (
          <div className="rounded-xl bg-sb-panel2 border border-sb-orange/50 px-4 py-2.5 text-sm text-sb-orange">
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-sb-mute">เลือกหมวดอุปกรณ์ด่วน หรือพิมพ์เอง</span>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setForm({ ...form, equipmentLabel: preset })}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    form.equipmentLabel === preset
                      ? "bg-sb-pink text-[#2a0618]"
                      : "bg-sb-panel2 text-sb-ink hover:bg-sb-line"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs font-semibold text-sb-mute">ชื่อหัวข้อคู่มือ</span>
              <input required placeholder="เช่น วิธีทอดอกไก่คลีนด้วยหม้อทอดไร้น้ำมัน" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="sb-input mt-1 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold text-sb-mute">ป้ายชื่อแท็บอุปกรณ์</span>
              <input required value={form.equipmentLabel} onChange={(e) => setForm({ ...form, equipmentLabel: e.target.value })} className="sb-input mt-1 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold text-sb-mute">ลิงก์ Slug ภาษาอังกฤษ (เช่น air-fryer-clean)</span>
              <input required placeholder="air-fryer-clean" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} className="sb-input mt-1 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold text-sb-mute">อุณหภูมิ / ระดับไฟ (เว้นว่างได้)</span>
              <input placeholder="เช่น 180°C หรือ ไฟกลางค่อนแรง" value={form.tempLabel} onChange={(e) => setForm({ ...form, tempLabel: e.target.value })} className="sb-input mt-1 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold text-sb-mute">เวลาที่ใช้ (เว้นว่างได้)</span>
              <input placeholder="เช่น 12–15 นาที" value={form.durationLabel} onChange={(e) => setForm({ ...form, durationLabel: e.target.value })} className="sb-input mt-1 text-sm" />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-xs font-semibold text-sb-mute">คำโปรยสรุปสั้น</span>
              <textarea required rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="sb-input mt-1 text-sm" />
            </label>
          </div>

          <ImageUploadField label="รูปหน้าปกคู่มือ" value={form.coverImgUrl} onChange={(url) => setForm({ ...form, coverImgUrl: url })} />

          <label className="block text-sm">
            <span className="text-xs font-semibold text-sb-mute">ลิงก์วิดีโอแนะนำ YouTube / Shorts / TikTok / Reels (เว้นว่างได้)</span>
            <input placeholder="https://www.youtube.com/watch?v=... หรือลิงก์ TikTok" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} className="sb-input mt-1 text-sm" />
          </label>

          <GuideStepsEditor steps={form.steps} tips={form.tips} onStepsChange={(steps) => setForm({ ...form, steps })} onTipsChange={(tips) => setForm({ ...form, tips })} />

          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-sb-line">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="w-5 h-5 accent-sb-pink" />
                <span>เปิดแสดงผลหน้าร้าน & ให้บอสบอทใช้ตอบ</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-sb-mute">
                <span>ลำดับแสดงผล:</span>
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="sb-input w-20 min-h-[36px] py-1 text-sm" />
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="sb-btn-ghost text-sm">ยกเลิก</button>
              <button type="submit" disabled={saving} className="sb-btn text-sm">{saving ? "กำลังบันทึก..." : "บันทึกคู่มือ"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
