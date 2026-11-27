"use client";

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
} from "lucide-react";
import type { HeroSlideDto } from "@/schemas/promo.schema";
import { formatScheduleRange } from "@/lib/datetime-input";

export function HeroSlideRowCard({
  slide,
  index,
  total,
  busy,
  onMove,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  slide: HeroSlideDto;
  index: number;
  total: number;
  busy: boolean;
  onMove: (delta: -1 | 1) => void;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="sb-panel flex flex-col sm:flex-row sm:items-center gap-4">
      <img
        src={slide.imageUrl}
        alt={slide.title}
        className="w-full sm:w-40 h-24 rounded-xl object-cover border border-sb-line bg-black shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-sb-mute">#{index + 1}</span>
          <h3 className="font-display font-bold text-base truncate">
            {slide.title}
          </h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-sb-line bg-sb-bgDeep">
            {slide.mode === "IMAGE_BANNER" ? "แบนเนอร์เต็มใบ" : "ข้อความทับรูป"}
          </span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
              slide.isActive
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-zinc-700/50 text-zinc-400"
            }`}
          >
            {slide.isActive ? "กำลังแสดง" : "ปิดอยู่"}
          </span>
        </div>
        <p className="text-xs text-sb-mute">
          ช่วงเวลา: {formatScheduleRange(slide.startsAt, slide.endsAt)}
          {slide.mode === "IMAGE_BANNER" && slide.linkHref
            ? ` · ลิงก์: ${slide.linkHref}`
            : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          className="sb-btn-dark px-2.5 py-2 disabled:opacity-35"
          aria-label="เลื่อนขึ้น"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          className="sb-btn-dark px-2.5 py-2 disabled:opacity-35"
          aria-label="เลื่อนลง"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onToggleActive}
          className="sb-btn-dark px-2.5 py-2"
          aria-label={slide.isActive ? "ปิดสไลด์" : "เปิดสไลด์"}
        >
          {slide.isActive ? (
            <Eye className="w-3.5 h-3.5 text-emerald-300" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-sb-mute" />
          )}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="sb-btn-dark px-2.5 py-2"
          aria-label="แก้ไขสไลด์"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="sb-btn-dark px-2.5 py-2"
          aria-label="ลบสไลด์"
        >
          <Trash2 className="w-3.5 h-3.5 text-sb-orange" />
        </button>
      </div>
    </div>
  );
}
