"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import type { CookingGuideDto } from "@/schemas/content.schema";
import { GuideAdminCard } from "./GuideAdminCard";
import { GuideFormModal } from "./GuideFormModal";

export function GuidesManager({
  initialGuides,
  onNotify,
}: {
  initialGuides: CookingGuideDto[];
  onNotify: (msg: string) => void;
}) {
  const [guides, setGuides] = useState<CookingGuideDto[]>(initialGuides);
  const [modalTarget, setModalTarget] = useState<CookingGuideDto | "NEW" | null>(
    null
  );

  async function refresh() {
    const res = await fetch("/api/admin/content/guides");
    if (res.ok) {
      const data = (await res.json()) as { guides: CookingGuideDto[] };
      setGuides(data.guides);
    }
  }

  async function togglePublish(guide: CookingGuideDto) {
    const nextState = !guide.isPublished;
    const res = await fetch(`/api/admin/content/guides/${guide.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: nextState }),
    });
    if (res.ok) {
      onNotify(
        nextState
          ? `เปิดแสดงผล "${guide.equipmentLabel}" บนหน้าร้านแล้ว`
          : `ซ่อน "${guide.equipmentLabel}" เป็นฉบับร่างแล้ว`
      );
      await refresh();
    }
  }

  async function handleDelete(guide: CookingGuideDto) {
    if (!window.confirm(`ยืนยันการลบคู่มือ "${guide.title}" หรือไม่?`)) return;
    const res = await fetch(`/api/admin/content/guides/${guide.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      onNotify(`ลบคู่มือ "${guide.title}" เรียบร้อยแล้ว`);
      await refresh();
    }
  }

  async function copyShareUrl(slug: string) {
    const url = `${window.location.origin}/guides/${slug}`;
    await navigator.clipboard.writeText(url);
    onNotify(`คัดลอกลิงก์ ${url} สำหรับส่งให้ลูกค้าในแชทแล้ว`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-xl">
            รายการคู่มือการปรุง & การแนะนำ ({guides.length} หัวข้อ)
          </h2>
          <p className="text-xs text-sb-mute">
            หัวข้อที่เปิดแสดงผลจะขึ้นเป็นแท็บในหน้าแรก (#cook), มีหน้าแชร์ลิงก์เฉพาะ และบอสบอทจะดึงไปตอบแชทอัตโนมัติ
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/guides" target="_blank" className="sb-btn-ghost text-xs min-h-[40px]">
            <ExternalLink className="w-3.5 h-3.5" /> ดูหน้ารวมคู่มือ
          </Link>
          <button
            type="button"
            onClick={() => setModalTarget("NEW")}
            className="sb-btn text-sm min-h-[40px]"
          >
            <Plus className="w-4 h-4" /> เพิ่มคู่มือแนะนำใหม่
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guides.map((g) => (
          <GuideAdminCard
            key={g.id}
            guide={g}
            onTogglePublish={togglePublish}
            onCopyUrl={copyShareUrl}
            onEdit={setModalTarget}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {modalTarget && (
        <GuideFormModal
          editing={modalTarget === "NEW" ? null : modalTarget}
          onClose={() => setModalTarget(null)}
          onSaved={async (_, m) => {
            setModalTarget(null);
            onNotify(m);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
