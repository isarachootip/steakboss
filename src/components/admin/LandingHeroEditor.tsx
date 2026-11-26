"use client";

import { useState } from "react";
import { Plus, RotateCcw, Trash2, ExternalLink } from "lucide-react";
import type { LandingContentInput } from "@/schemas/content.schema";
import { ImageUploadField } from "./ImageUploadField";

export function LandingHeroEditor({
  initialLanding,
  onNotify,
}: {
  initialLanding: LandingContentInput;
  onNotify: (msg: string) => void;
}) {
  const [form, setForm] = useState<LandingContentInput>(initialLanding);
  const [saving, setSaving] = useState(false);

  function updateBadge(idx: number, val: string) {
    const next = [...form.badges];
    next[idx] = val;
    setForm({ ...form, badges: next });
  }

  function addBadge() {
    if (form.badges.length >= 6) return;
    setForm({ ...form, badges: [...form.badges, "จุดเด่นใหม่"] });
  }

  function removeBadge(idx: number) {
    if (form.badges.length <= 1) return;
    setForm({ ...form, badges: form.badges.filter((_, i) => i !== idx) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content/landing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as {
        landing?: LandingContentInput;
        error?: string;
      };
      if (!res.ok || !data.landing) {
        onNotify(data.error || "บันทึกส่วนหน้าแรกไม่สำเร็จ");
        return;
      }
      setForm(data.landing);
      onNotify("บันทึกเนื้อหาส่วน Hero หน้าแรกเรียบร้อยแล้ว");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!window.confirm("ต้องการรีเซ็ตเนื้อหาส่วน Hero กลับเป็นค่าเริ่มต้นต้นฉบับหรือไม่?")) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content/landing", { method: "DELETE" });
      const data = (await res.json()) as { landing?: LandingContentInput };
      if (res.ok && data.landing) {
        setForm(data.landing);
        onNotify("รีเซ็ตเนื้อหา Hero กลับเป็นค่าเริ่มต้นแล้ว");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="sb-panel space-y-4">
          <h2 className="font-display font-bold text-lg">ข้อความหลักบนแบนเนอร์ Hero</h2>
          <label className="block text-sm">
            <span className="text-xs font-semibold text-sb-mute">ป้ายข้อความด้านบน (Eyebrow)</span>
            <input
              required
              value={form.eyebrow}
              onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
              className="sb-input mt-1 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold text-sb-mute">
              พาดหัวใหญ่ (กด Enter เพื่อขึ้นบรรทัดใหม่ได้)
            </span>
            <textarea
              required
              rows={3}
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              className="sb-input mt-1 text-sm font-display font-bold"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold text-sb-mute">คำโปรยอธิบาย</span>
            <textarea
              required
              rows={3}
              value={form.subheadline}
              onChange={(e) => setForm({ ...form, subheadline: e.target.value })}
              className="sb-input mt-1 text-sm"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="block text-sm">
              <span className="text-xs font-semibold text-sb-mute">ปุ่มหลัก (ข้อความ)</span>
              <input required value={form.primaryCtaLabel} onChange={(e) => setForm({ ...form, primaryCtaLabel: e.target.value })} className="sb-input mt-1 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold text-sb-mute">ปุ่มหลัก (ลิงก์ เช่น #menu)</span>
              <input required value={form.primaryCtaHref} onChange={(e) => setForm({ ...form, primaryCtaHref: e.target.value })} className="sb-input mt-1 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold text-sb-mute">ปุ่มรอง (ข้อความ)</span>
              <input required value={form.secondaryCtaLabel} onChange={(e) => setForm({ ...form, secondaryCtaLabel: e.target.value })} className="sb-input mt-1 text-sm" />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold text-sb-mute">ปุ่มรอง (ลิงก์ เช่น /track)</span>
              <input required value={form.secondaryCtaHref} onChange={(e) => setForm({ ...form, secondaryCtaHref: e.target.value })} className="sb-input mt-1 text-sm" />
            </label>
          </div>
        </div>

        <div className="sb-panel space-y-4">
          <h2 className="font-display font-bold text-lg">รูปภาพ & ป้ายจุดเด่น</h2>
          <ImageUploadField
            label="รูปพื้นหลัง Hero (แนะนำแนวนอนความละเอียดสูง)"
            value={form.heroImgUrl}
            onChange={(url) => setForm({ ...form, heroImgUrl: url })}
          />
          <label className="block text-sm">
            <span className="text-xs font-semibold text-sb-mute">คำอธิบายรูป Hero (Alt Text)</span>
            <input required value={form.heroImgAlt} onChange={(e) => setForm({ ...form, heroImgAlt: e.target.value })} className="sb-input mt-1 text-sm" />
          </label>

          <ImageUploadField
            label="รูปการ์ดซองสินค้ามุมขวาล่าง"
            value={form.packCardImgUrl}
            onChange={(url) => setForm({ ...form, packCardImgUrl: url })}
          />
          <label className="block text-sm">
            <span className="text-xs font-semibold text-sb-mute">ข้อความใต้รูปซอง</span>
            <input required value={form.packCardCaption} onChange={(e) => setForm({ ...form, packCardCaption: e.target.value })} className="sb-input mt-1 text-sm" />
          </label>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sb-mute">
                ป้ายจุดเด่น (ระบบจะต่อท้ายยอดส่งฟรีจากเมนูตั้งค่าให้อัตโนมัติ)
              </span>
              <button type="button" onClick={addBadge} className="text-xs text-sb-pink2 font-semibold inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> เพิ่มป้าย
              </button>
            </div>
            {form.badges.map((b, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input required value={b} onChange={(e) => updateBadge(idx, e.target.value)} className="sb-input text-sm flex-1" />
                {form.badges.length > 1 && (
                  <button type="button" onClick={() => removeBadge(idx)} className="sb-btn-dark px-3" aria-label="ลบป้าย">
                    <Trash2 className="w-4 h-4 text-sb-orange" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className="sb-btn text-sm">
            {saving ? "กำลังบันทึก..." : "บันทึกเนื้อหาหน้าแรก"}
          </button>
          <a href="/" target="_blank" rel="noreferrer" className="sb-btn-ghost text-sm">
            <ExternalLink className="w-4 h-4" /> ดูหน้าแรกจริง
          </a>
        </div>
        <button type="button" disabled={saving} onClick={handleReset} className="sb-btn-dark text-xs">
          <RotateCcw className="w-3.5 h-3.5" /> คืนค่าเริ่มต้นต้นฉบับ
        </button>
      </div>
    </form>
  );
}
