"use client";

import { Plus, Trash2 } from "lucide-react";
import type { UpsertHeroSlideInput } from "@/schemas/promo.schema";
import { ImageUploadField } from "./ImageUploadField";

export function HeroSlideOverlayFields({
  form,
  onChange,
}: {
  form: UpsertHeroSlideInput;
  onChange: (next: UpsertHeroSlideInput) => void;
}) {
  function updateBadge(idx: number, val: string) {
    const next = [...form.badges];
    next[idx] = val;
    onChange({ ...form, badges: next });
  }

  function addBadge() {
    if (form.badges.length >= 6) return;
    onChange({ ...form, badges: [...form.badges, "จุดเด่นใหม่"] });
  }

  function removeBadge(idx: number) {
    onChange({ ...form, badges: form.badges.filter((_, i) => i !== idx) });
  }

  return (
    <div className="space-y-4 pt-2 border-t border-sb-line">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-xs font-semibold text-sb-mute">
            ป้ายบน (Eyebrow)
          </span>
          <input
            value={form.eyebrow}
            onChange={(e) => onChange({ ...form, eyebrow: e.target.value })}
            placeholder="เช่น สเต็กหมักพร้อมย่าง"
            className="sb-input mt-1 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-sb-mute">
            ข้อความใต้การ์ดซอง (ถ้ามี)
          </span>
          <input
            value={form.packCardCaption}
            onChange={(e) =>
              onChange({ ...form, packCardCaption: e.target.value })
            }
            placeholder="เช่น ซองนี้ → จานนั้น"
            className="sb-input mt-1 text-sm"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-xs font-semibold text-sb-mute">
          พาดหัวใหญ่ (บังคับสำหรับโหมดข้อความทับรูป · กด Enter ขึ้นบรรทัดใหม่ได้)
        </span>
        <textarea
          required
          rows={3}
          value={form.headline}
          onChange={(e) => onChange({ ...form, headline: e.target.value })}
          className="sb-input mt-1 text-sm font-display font-bold"
        />
      </label>

      <label className="block text-sm">
        <span className="text-xs font-semibold text-sb-mute">คำโปรยอธิบาย</span>
        <textarea
          rows={2}
          value={form.subheadline}
          onChange={(e) => onChange({ ...form, subheadline: e.target.value })}
          className="sb-input mt-1 text-sm"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-xs font-semibold text-sb-mute">ปุ่มหลัก (ข้อความ)</span>
          <input
            value={form.primaryCtaLabel}
            onChange={(e) =>
              onChange({ ...form, primaryCtaLabel: e.target.value })
            }
            placeholder="เลือกเมนูเลย"
            className="sb-input mt-1 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-sb-mute">ปุ่มหลัก (ลิงก์)</span>
          <input
            value={form.primaryCtaHref}
            onChange={(e) =>
              onChange({ ...form, primaryCtaHref: e.target.value })
            }
            placeholder="#menu"
            className="sb-input mt-1 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-sb-mute">ปุ่มรอง (ข้อความ)</span>
          <input
            value={form.secondaryCtaLabel}
            onChange={(e) =>
              onChange({ ...form, secondaryCtaLabel: e.target.value })
            }
            placeholder="ติดตามพัสดุ"
            className="sb-input mt-1 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-sb-mute">ปุ่มรอง (ลิงก์)</span>
          <input
            value={form.secondaryCtaHref}
            onChange={(e) =>
              onChange({ ...form, secondaryCtaHref: e.target.value })
            }
            placeholder="/track"
            className="sb-input mt-1 text-sm"
          />
        </label>
      </div>

      <ImageUploadField
        label="รูปการ์ดซองมุมขวาล่าง (ไม่บังคับ)"
        value={form.packCardImgUrl}
        onChange={(url) => onChange({ ...form, packCardImgUrl: url })}
        compact
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-sb-mute">
            ป้ายจุดเด่น (ยอดส่งฟรีจะต่อท้ายให้อัตโนมัติ)
          </span>
          <button
            type="button"
            onClick={addBadge}
            className="text-xs text-sb-pink2 font-semibold inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่มป้าย
          </button>
        </div>
        {form.badges.map((b, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              value={b}
              onChange={(e) => updateBadge(idx, e.target.value)}
              className="sb-input text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => removeBadge(idx)}
              className="sb-btn-dark px-3"
              aria-label="ลบป้าย"
            >
              <Trash2 className="w-4 h-4 text-sb-orange" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
