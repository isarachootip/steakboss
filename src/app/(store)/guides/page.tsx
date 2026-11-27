import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Clock, Flame } from "lucide-react";
import { listPublishedGuides } from "@/services/content.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "คู่มือการทอด หม้อทอดไร้น้ำมัน และวิธีละลายสเต็ก | Steakboss",
  description:
    "รวมเคล็ดลับการทอดสเต็กด้วยหม้อทอดไร้น้ำมัน การย่างบนกระทะ วิธีละลายน้ำแข็ง และการอุ่นไมโครเวฟให้อร่อยฉ่ำเหมือนที่ร้าน",
};

export default async function GuidesIndexPage() {
  const guides = await listPublishedGuides();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
      <div className="space-y-2 max-w-2xl">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-display font-bold bg-sb-pink text-[#1a1205]">
          คู่มือ & การแนะนำ Steakboss
        </span>
        <h1 className="font-display font-extrabold text-3xl sm:text-5xl">
          ทำสเต็กยังไงให้ฉ่ำ นุ่ม ไม่แห้ง
        </h1>
        <p className="text-sb-mute">
          เลือกอ่านตามอุปกรณ์ที่มีที่บ้าน พร้อมเทคนิคคุมไฟและเวลาที่ใช้ได้จริงทุกซอง
        </p>
      </div>

      {guides.length === 0 ? (
        <div className="sb-panel text-center py-12 text-sb-mute">
          กำลังอัปเดตเนื้อหาคู่มือการปรุงใหม่เร็ว ๆ นี้
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {guides.map((g) => (
            <Link
              key={g.id}
              href={`/guides/${g.slug}`}
              className="sb-panel p-0 overflow-hidden flex flex-col hover:border-sb-pink transition group"
            >
              {g.coverImgUrl && (
                <div className="aspect-[16/9] bg-black overflow-hidden">
                  <img
                    src={g.coverImgUrl}
                    alt={g.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
                  />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <span className="inline-block px-3 py-0.5 rounded-full text-xs font-display font-bold bg-sb-panel2 text-sb-pink2">
                    {g.equipmentLabel}
                  </span>
                  <h2 className="font-display font-extrabold text-xl group-hover:text-sb-pink2 transition">
                    {g.title}
                  </h2>
                  <p className="text-sm text-sb-mute line-clamp-2">{g.summary}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-sb-line text-xs text-sb-mute">
                  <div className="flex flex-wrap gap-3">
                    {g.tempLabel && (
                      <span className="inline-flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-sb-pink" /> {g.tempLabel}
                      </span>
                    )}
                    {g.durationLabel && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-sb-pink" /> {g.durationLabel}
                      </span>
                    )}
                  </div>
                  <span className="font-display font-bold text-sb-ink inline-flex items-center gap-1">
                    อ่านคู่มือ <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
