"use client";

import { Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import { getStaffRoleMeta } from "@/domain/staff-policy";
import type { StaffMemberDto } from "@/schemas/staff.schema";

export function StaffMemberRowCard({
  member,
  isSelf,
  busy,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  member: StaffMemberDto;
  isSelf: boolean;
  busy: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = getStaffRoleMeta(member.role);

  return (
    <div className="sb-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display font-bold text-base">{member.name}</p>
          {isSelf && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-sb-pink text-[#2a0618] font-bold">
              คุณ
            </span>
          )}
          <span
            className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${meta.badgeClass}`}
          >
            {meta.label}
          </span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
              member.isActive
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-red-500/15 text-red-300"
            }`}
          >
            {member.isActive ? "ใช้งานอยู่" : "ระงับสิทธิ์"}
          </span>
        </div>
        <p className="text-xs text-sb-mute truncate">
          {member.email}
          {member.phone ? ` · ${member.phone}` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <button
          type="button"
          disabled={isSelf || busy}
          onClick={onToggleActive}
          className="sb-btn-dark px-3 py-2 text-xs disabled:opacity-35"
          title={member.isActive ? "ระงับการใช้งาน" : "เปิดใช้งานอีกครั้ง"}
        >
          {member.isActive ? (
            <>
              <UserX className="w-3.5 h-3.5 text-amber-300" /> ระงับ
            </>
          ) : (
            <>
              <UserCheck className="w-3.5 h-3.5 text-emerald-300" /> เปิดใช้
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="sb-btn-dark px-3 py-2 text-xs"
        >
          <Pencil className="w-3.5 h-3.5" /> แก้ไข
        </button>
        <button
          type="button"
          disabled={isSelf || busy}
          onClick={onDelete}
          className="sb-btn-dark px-2.5 py-2 disabled:opacity-35"
          aria-label="ลบบัญชีพนักงาน"
        >
          <Trash2 className="w-3.5 h-3.5 text-sb-orange" />
        </button>
      </div>
    </div>
  );
}
