"use client";

import { useState } from "react";
import { ExternalLink, Plus } from "lucide-react";
import type { HeroSlideDto } from "@/schemas/promo.schema";
import { HeroSlideFormModal } from "./HeroSlideFormModal";
import { HeroSlideRowCard } from "./HeroSlideRowCard";

export function HeroSlidesManager({
  initialSlides,
  onNotify,
}: {
  initialSlides: HeroSlideDto[];
  onNotify: (msg: string) => void;
}) {
  const [slides, setSlides] = useState<HeroSlideDto[]>(initialSlides);
  const [editing, setEditing] = useState<HeroSlideDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleActive(slide: HeroSlideDto) {
    setBusyId(slide.id);
    try {
      const res = await fetch(`/api/admin/content/slides/${slide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !slide.isActive }),
      });
      const data = (await res.json()) as { slide?: HeroSlideDto; error?: string };
      if (!res.ok || !data.slide) {
        onNotify(data.error || "เปลี่ยนสถานะสไลด์ไม่สำเร็จ");
        return;
      }
      setSlides((prev) => prev.map((s) => (s.id === slide.id ? data.slide! : s)));
      onNotify(
        data.slide.isActive
          ? `เปิดแสดงสไลด์ "${data.slide.title}" แล้ว`
          : `ปิดการแสดงสไลด์ "${data.slide.title}" แล้ว`
      );
    } finally {
      setBusyId(null);
    }
  }

  async function moveSlide(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= slides.length) return;
    const reordered = [...slides];
    const [picked] = reordered.splice(index, 1);
    reordered.splice(target, 0, picked!);
    setSlides(reordered);

    const res = await fetch("/api/admin/content/slides/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((s) => s.id) }),
    });
    const data = (await res.json()) as { slides?: HeroSlideDto[]; error?: string };
    if (res.ok && data.slides) {
      setSlides(data.slides);
      onNotify("บันทึกลำดับสไลด์เรียบร้อยแล้ว");
    } else {
      onNotify(data.error || "เรียงลำดับสไลด์ไม่สำเร็จ");
    }
  }

  async function handleDelete(slide: HeroSlideDto) {
    if (!window.confirm(`ยืนยันการลบสไลด์ "${slide.title}" หรือไม่?`)) return;
    setBusyId(slide.id);
    try {
      const res = await fetch(`/api/admin/content/slides/${slide.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        onNotify("ลบสไลด์ไม่สำเร็จ");
        return;
      }
      setSlides((prev) => prev.filter((s) => s.id !== slide.id));
      onNotify(`ลบสไลด์ "${slide.title}" เรียบร้อยแล้ว`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sb-mute">
          จัดการสไลด์แบนเนอร์หน้าแรกได้อิสระทั้งแบบรูปเต็มใบและแบบมีข้อความทับ (หากปิดทั้งหมด ระบบจะแสดง Hero ต้นฉบับอัตโนมัติ)
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="/" target="_blank" rel="noreferrer" className="sb-btn-ghost text-xs">
            <ExternalLink className="w-3.5 h-3.5" /> ดูหน้าแรกจริง
          </a>
          <button type="button" onClick={() => setCreating(true)} className="sb-btn text-xs">
            <Plus className="w-4 h-4" /> เพิ่มสไลด์ใหม่
          </button>
        </div>
      </div>

      {slides.length === 0 ? (
        <div className="sb-panel text-center py-10 space-y-2">
          <p className="font-display font-bold text-lg">ยังไม่มีสไลด์ Hero</p>
          <p className="text-sm text-sb-mute">
            กดปุ่ม &ldquo;เพิ่มสไลด์ใหม่&rdquo; เพื่อเริ่มสร้างแบนเนอร์โปรโมชัน (ปัจจุบันหน้าร้านใช้ Hero ค่าเริ่มต้นอยู่)
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide, idx) => (
            <HeroSlideRowCard
              key={slide.id}
              slide={slide}
              index={idx}
              total={slides.length}
              busy={busyId === slide.id}
              onMove={(delta) => moveSlide(idx, delta)}
              onToggleActive={() => toggleActive(slide)}
              onEdit={() => setEditing(slide)}
              onDelete={() => handleDelete(slide)}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <HeroSlideFormModal
          slide={editing}
          nextSortOrder={slides.length}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(saved, isNew) => {
            setSlides((prev) =>
              isNew ? [...prev, saved] : prev.map((s) => (s.id === saved.id ? saved : s))
            );
            setCreating(false);
            setEditing(null);
            onNotify(
              isNew
                ? `เพิ่มสไลด์ "${saved.title}" เรียบร้อยแล้ว`
                : `อัปเดตสไลด์ "${saved.title}" เรียบร้อยแล้ว`
            );
          }}
        />
      )}
    </div>
  );
}
