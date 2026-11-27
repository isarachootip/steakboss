"use client";

import Link from "next/link";
import {
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Flame,
  Trash2,
  Video,
} from "lucide-react";
import type { CookingGuideDto } from "@/schemas/content.schema";

export function GuideAdminCard({
  guide,
  onTogglePublish,
  onCopyUrl,
  onEdit,
  onDelete,
}: {
  guide: CookingGuideDto;
  onTogglePublish: (g: CookingGuideDto) => void;
  onCopyUrl: (slug: string) => void;
  onEdit: (g: CookingGuideDto) => void;
  onDelete: (g: CookingGuideDto) => void;
}) {
  return (
    <div
      className={`sb-panel flex flex-col justify-between gap-4 ${
        guide.isPublished ? "" : "opacity-75 border-dashed"
      }`}
    >
      <div className="flex gap-3.5">
        {guide.coverImgUrl && (
          <img
            src={guide.coverImgUrl}
            alt={guide.title}
            className="w-20 h-20 rounded-xl object-cover shrink-0 border border-sb-line bg-black"
          />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-display font-bold bg-sb-pink text-[#1a1205]">
              {guide.equipmentLabel}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                guide.isPublished
                  ? "bg-sb-ok/20 text-sb-ok"
                  : "bg-sb-orange/20 text-sb-orange"
              }`}
            >
              {guide.isPublished ? "แสดงหน้าร้าน" : "ฉบับร่าง (ซ่อน)"}
            </span>
            {guide.videoUrl && (
              <span className="inline-flex items-center gap-1 text-[11px] text-sb-pink2">
                <Video className="w-3 h-3" /> มีคลิป
              </span>
            )}
          </div>
          <h3 className="font-display font-bold text-base leading-snug">
            {guide.title}
          </h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-sb-mute">
            {guide.tempLabel && (
              <span className="inline-flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-sb-pink" /> {guide.tempLabel}
              </span>
            )}
            {guide.durationLabel && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sb-pink" /> {guide.durationLabel}
              </span>
            )}
            <span>{guide.steps.length} ขั้นตอน · ลำดับ #{guide.sortOrder}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-sb-line">
        <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={guide.isPublished}
            onChange={() => onTogglePublish(guide)}
            className="w-4 h-4 accent-sb-pink"
          />
          <span>เปิดแสดงผล</span>
        </label>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onCopyUrl(guide.slug)}
            className="sb-btn-dark min-h-[34px] px-3 text-xs"
          >
            <Copy className="w-3.5 h-3.5" /> คัดลอกลิงก์
          </button>
          {guide.isPublished && (
            <Link
              href={`/guides/${guide.slug}`}
              target="_blank"
              className="sb-btn-dark min-h-[34px] px-3 text-xs"
              aria-label="เปิดดูหน้าคู่มือ"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => onEdit(guide)}
            className="sb-btn-dark min-h-[34px] px-3 text-xs"
          >
            <Edit3 className="w-3.5 h-3.5" /> แก้ไข
          </button>
          <button
            type="button"
            onClick={() => onDelete(guide)}
            className="sb-btn-dark min-h-[34px] px-2.5 text-xs"
            aria-label="ลบคู่มือ"
          >
            <Trash2 className="w-3.5 h-3.5 text-sb-orange" />
          </button>
        </div>
      </div>
    </div>
  );
}
