"use client";

import { useState } from "react";
import { ExternalLink, RotateCcw, X } from "lucide-react";
import type { EventPopupDto, UpdateEventPopupInput } from "@/schemas/promo.schema";
import { ImageUploadField } from "./ImageUploadField";
import { ScheduleFields } from "./ScheduleFields";

export function EventPopupEditor({
  initialPopup,
  onNotify,
}: {
  initialPopup: EventPopupDto;
  onNotify: (msg: string) => void;
}) {
  const [form, setForm] = useState<UpdateEventPopupInput>({
    isActive: initialPopup.isActive,
    title: initialPopup.title,
    imageUrl: initialPopup.imageUrl,
    linkHref: initialPopup.linkHref,
    startsAt: initialPopup.startsAt,
    endsAt: initialPopup.endsAt,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content/popup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { popup?: EventPopupDto; error?: string };
      if (!res.ok || !data.popup) {
        onNotify(data.error || "บันทึกป๊อปอัปอีเวนต์ไม่สำเร็จ");
        return;
      }
      setForm({
        isActive: data.popup.isActive,
        title: data.popup.title,
        imageUrl: data.popup.imageUrl,
        linkHref: data.popup.linkHref,
        startsAt: data.popup.startsAt,
        endsAt: data.popup.endsAt,
      });
      onNotify("บันทึกการตั้งค่าป๊อปอัปอีเวนต์หน้าแรกเรียบร้อยแล้ว");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!window.confirm("ต้องการล้างรูปและปิดป๊อปอัปอีเวนต์หรือไม่?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content/popup", { method: "DELETE" });
      const data = (await res.json()) as { popup?: EventPopupDto };
      if (res.ok && data.popup) {
        setForm({
          isActive: false,
          title: "",
          imageUrl: "",
          linkHref: "",
          startsAt: null,
          endsAt: null,
        });
        onNotify("ปิดและล้างป๊อปอัปอีเวนต์เรียบร้อยแล้ว");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="sb-panel space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display font-bold text-lg">
            ตั้งค่า Event Pop-up (แสดงเฉพาะหน้าแรก `/`)
          </h2>
          <label className="inline-flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 accent-sb-pink"
            />
            <span>{form.isActive ? "เปิดใช้งาน" : "ปิดอยู่"}</span>
          </label>
        </div>

        <p className="text-xs text-sb-mute">
          เด้ง 1 ครั้งต่อ Session เมื่อลูกค้าเข้าหน้าแรก หากอัปโหลดรูปใหม่และกดบันทึก ระบบจะแสดงอีเวนต์ใหม่ให้อัตโนมัติ
        </p>

        <ImageUploadField
          label="รูปภาพอีเวนต์ / โปรโมชัน (แนะนำสัดส่วน 1:1 หรือ 4:5)"
          value={form.imageUrl}
          onChange={(url) => setForm({ ...form, imageUrl: url })}
        />

        <label className="block text-sm">
          <span className="text-xs font-semibold text-sb-mute">
            ชื่ออีเวนต์ / Alt Text
          </span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="เช่น บูธสเต็กบอสส์ งานอาหารสุดสัปดาห์นี้"
            className="sb-input mt-1 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="text-xs font-semibold text-sb-mute">
            ลิงก์ปลายทางเมื่อคลิกรูป (ไม่บังคับ เช่น #menu หรือ LINE OA)
          </span>
          <input
            value={form.linkHref}
            onChange={(e) => setForm({ ...form, linkHref: e.target.value })}
            placeholder="#menu"
            className="sb-input mt-1 text-sm"
          />
        </label>

        <ScheduleFields
          startsAt={form.startsAt}
          endsAt={form.endsAt}
          onChange={({ startsAt, endsAt }) =>
            setForm({ ...form, startsAt, endsAt })
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="sb-btn text-sm">
              {saving ? "กำลังบันทึก..." : "บันทึก Event Pop-up"}
            </button>
            <a href="/" target="_blank" rel="noreferrer" className="sb-btn-ghost text-sm">
              <ExternalLink className="w-4 h-4" /> ดูหน้าแรก
            </a>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={handleReset}
            className="sb-btn-dark text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> ล้างป๊อปอัป
          </button>
        </div>
      </div>

      <div className="sb-panel flex flex-col items-center justify-center min-h-[340px] bg-sb-bgDeep/80">
        <p className="text-xs font-semibold text-sb-mute mb-4">
          ตัวอย่างหน้าตาป๊อปอัปบนหน้าแรก
        </p>
        {form.imageUrl ? (
          <div className="relative w-full max-w-xs rounded-3xl bg-sb-panel border border-sb-line p-2 shadow-2xl">
            <span className="absolute -top-2.5 -right-2.5 w-8 h-8 rounded-full bg-sb-panel2 border border-sb-line text-white flex items-center justify-center">
              <X className="w-4 h-4" />
            </span>
            <img
              src={form.imageUrl}
              alt={form.title || "ตัวอย่างป๊อปอัป"}
              className="w-full max-h-72 object-contain rounded-2xl bg-black"
            />
          </div>
        ) : (
          <p className="text-sm text-sb-mute text-center max-w-xs">
            ยังไม่มีรูปอีเวนต์ — อัปโหลดรูปด้านซ้ายเพื่อดูตัวอย่าง (ระบบจะไม่เด้งป๊อปอัปหากยังไม่มีรูป)
          </p>
        )}
      </div>
    </form>
  );
}
