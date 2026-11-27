"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { STAFF_ROLE_META } from "@/domain/staff-policy";
import type { StaffMemberDto, StaffRole } from "@/schemas/staff.schema";

export function StaffFormModal({
  member,
  isSelf,
  onClose,
  onSaved,
}: {
  member: StaffMemberDto | null;
  isSelf: boolean;
  onClose: () => void;
  onSaved: (saved: StaffMemberDto, isNew: boolean) => void;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [role, setRole] = useState<StaffRole>(member?.role ?? "ADMIN");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(member?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const url = member ? `/api/admin/staff/${member.id}` : "/api/admin/staff";
      const payload = member
        ? {
            name,
            email,
            phone: phone.trim() ? phone.trim() : null,
            role,
            isActive,
            ...(password.trim() ? { password } : {}),
          }
        : {
            name,
            email,
            phone: phone.trim() ? phone.trim() : null,
            role,
            password,
            isActive,
          };

      const res = await fetch(url, {
        method: member ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        member?: StaffMemberDto;
        error?: string;
      };
      if (!res.ok || !data.member) {
        setErr(data.error || "บันทึกข้อมูลพนักงานไม่สำเร็จ");
        return;
      }
      onSaved(data.member, !member);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-sb-panel border border-sb-line p-5 sm:p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display font-extrabold text-xl">
            {member ? "แก้ไขบัญชีพนักงาน & สิทธิ์" : "เพิ่มพนักงานหลังบ้านใหม่"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="sb-btn-dark px-2.5 py-2"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <label className="block text-sm">
            <span className="text-xs font-semibold text-sb-mute">ชื่อ-นามสกุล / ชื่อแสดง</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น แอดมินน้องพลอย"
              className="sb-input mt-1 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold text-sb-mute">อีเมลสำหรับเข้าสู่ระบบ</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@steakboss.local"
              className="sb-input mt-1 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold text-sb-mute">เบอร์โทร (ไม่บังคับ)</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0812345678"
              className="sb-input mt-1 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold text-sb-mute">ระดับสิทธิ์ (Role)</span>
            <select
              value={role}
              disabled={isSelf}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="sb-input mt-1 text-sm disabled:opacity-60"
            >
              {STAFF_ROLE_META.map((item) => (
                <option key={item.role} value={item.role}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-sb-mute mt-1">
              {STAFF_ROLE_META.find((m) => m.role === role)?.summary}
            </span>
          </label>

          <label className="block text-sm">
            <span className="text-xs font-semibold text-sb-mute">
              {member
                ? "ตั้งรหัสผ่านใหม่ (เว้นว่างหากไม่ต้องการเปลี่ยน)"
                : "รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"}
            </span>
            <input
              type="password"
              required={!member}
              minLength={member ? undefined : 6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={member ? "••••••••" : "อย่างน้อย 6 ตัวอักษร"}
              className="sb-input mt-1 text-sm"
            />
          </label>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              disabled={isSelf}
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-sb-pink disabled:opacity-60"
            />
            <span className="font-semibold">
              เปิดใช้งานบัญชีนี้ {isSelf ? "(ไม่สามารถระงับบัญชีตัวเองได้)" : ""}
            </span>
          </label>

          {err && <p className="text-xs text-sb-orange font-semibold">{err}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="sb-btn-dark text-sm">
              ยกเลิก
            </button>
            <button type="submit" disabled={saving} className="sb-btn text-sm">
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลพนักงาน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
