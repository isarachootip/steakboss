"use client";

import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { STAFF_ROLE_META } from "@/domain/staff-policy";
import type { StaffMemberDto } from "@/schemas/staff.schema";
import { StaffFormModal } from "./StaffFormModal";
import { StaffMemberRowCard } from "./StaffMemberRowCard";

export function StaffManager({
  initialStaff,
  currentUserId,
}: {
  initialStaff: StaffMemberDto[];
  currentUserId: string;
}) {
  const [staff, setStaff] = useState<StaffMemberDto[]>(initialStaff);
  const [editing, setEditing] = useState<StaffMemberDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function toggleActive(member: StaffMemberDto) {
    setBusyId(member.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      const data = (await res.json()) as { member?: StaffMemberDto; error?: string };
      if (!res.ok || !data.member) {
        setNotice(data.error || "อัปเดตสถานะไม่สำเร็จ");
        return;
      }
      setStaff((prev) => prev.map((m) => (m.id === member.id ? data.member! : m)));
      setNotice(
        data.member.isActive
          ? `เปิดใช้งานบัญชี "${data.member.name}" แล้ว`
          : `ระงับการใช้งานบัญชี "${data.member.name}" แล้ว`
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(member: StaffMemberDto) {
    if (!window.confirm(`ยืนยันการลบบัญชีพนักงาน "${member.name}" (${member.email}) หรือไม่?`)) {
      return;
    }
    setBusyId(member.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setNotice(data.error || "ลบบัญชีพนักงานไม่สำเร็จ");
        return;
      }
      setStaff((prev) => prev.filter((m) => m.id !== member.id));
      setNotice(`ลบบัญชี "${member.name}" เรียบร้อยแล้ว`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display font-extrabold text-3xl flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-sb-pink" />
            จัดการสิทธิ์ & พนักงานหลังบ้าน
          </h1>
          <p className="text-sm text-sb-mute mt-1">
            เพิ่ม แก้ไข กำหนดระดับสิทธิ์ รีเซ็ตรหัสผ่าน หรือระงับการเข้าถึงหลังบ้านได้ทันที (เฉพาะ OWNER)
          </p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="sb-btn text-sm">
          <Plus className="w-4 h-4" /> เพิ่มพนักงานใหม่
        </button>
      </div>

      {notice && (
        <div className="rounded-xl bg-sb-panel2 border border-sb-pink/40 px-4 py-2.5 text-sm text-sb-pink2">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {STAFF_ROLE_META.map((item) => (
          <div key={item.role} className="sb-panel p-4 space-y-1.5">
            <span
              className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${item.badgeClass}`}
            >
              {item.label}
            </span>
            <p className="text-xs text-sb-mute leading-relaxed">{item.summary}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {staff.map((member) => (
          <StaffMemberRowCard
            key={member.id}
            member={member}
            isSelf={member.id === currentUserId}
            busy={busyId === member.id}
            onToggleActive={() => toggleActive(member)}
            onEdit={() => setEditing(member)}
            onDelete={() => handleDelete(member)}
          />
        ))}
      </div>

      {(creating || editing) && (
        <StaffFormModal
          member={editing}
          isSelf={editing?.id === currentUserId}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(saved, isNew) => {
            setStaff((prev) =>
              isNew ? [...prev, saved] : prev.map((m) => (m.id === saved.id ? saved : m))
            );
            setCreating(false);
            setEditing(null);
            setNotice(
              isNew
                ? `เพิ่มบัญชีพนักงาน "${saved.name}" เรียบร้อยแล้ว`
                : `อัปเดตข้อมูล "${saved.name}" เรียบร้อยแล้ว`
            );
          }}
        />
      )}
    </div>
  );
}
