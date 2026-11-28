"use client";

import { useState } from "react";
import { CheckCircle2, LogOut, Save } from "lucide-react";

export interface AccountAddress {
  id: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
}

export interface AccountUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
  lineUserId: string | null;
  linePictureUrl: string | null;
  addresses: AccountAddress[];
}

export function CustomerProfileCard({
  user,
  onLogout,
  onSaved,
}: {
  user: AccountUser;
  onLogout: () => Promise<void>;
  onSaved: (updated: AccountUser, msg: string) => Promise<void>;
}) {
  const defaultAddr = user.addresses.find((a) => a.isDefault) ?? user.addresses[0];
  const [editing, setEditing] = useState(!user.phone || !defaultAddr);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [addressLine, setAddressLine] = useState(defaultAddr?.addressLine ?? "");
  const [postalCode, setPostalCode] = useState(defaultAddr?.postalCode ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/store/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, addressLine, postalCode }),
      });
      const data = (await res.json()) as {
        user?: AccountUser;
        linkedOrdersCount?: number;
        error?: string;
      };
      if (!res.ok || !data.user) {
        setErr(data.error || "บันทึกข้อมูลไม่สำเร็จ");
        return;
      }
      setEditing(false);
      const linkedMsg =
        data.linkedOrdersCount && data.linkedOrdersCount > 0
          ? ` และเชื่อมประวัติคำสั่งซื้อเดิมให้อัตโนมัติ ${data.linkedOrdersCount} รายการ`
          : "";
      await onSaved(data.user, `บันทึกข้อมูลจัดส่งเรียบร้อยแล้ว${linkedMsg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sb-panel space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {user.linePictureUrl ? (
            <img
              src={user.linePictureUrl}
              alt={user.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-[#06C755]"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-sb-panel2 border border-sb-line grid place-items-center font-display font-bold text-xl text-sb-pink2">
              {user.name.slice(0, 1)}
            </div>
          )}
          <div>
            <h1 className="font-display font-extrabold text-2xl">สวัสดี คุณ{user.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-sb-mute mt-0.5">
              {user.lineUserId && (
                <span className="inline-flex items-center gap-1 text-[#06C755] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> เชื่อมต่อ LINE แล้ว (รับแจ้งเตือนพัสดุอัตโนมัติ)
                </span>
              )}
              {user.phone && <span>· โทร {user.phone}</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="sb-btn-dark text-xs"
          >
            {editing ? "ซ่อนฟอร์ม" : "แก้ไขที่อยู่/เบอร์โทร"}
          </button>
          <button type="button" onClick={onLogout} className="sb-btn-ghost text-xs">
            <LogOut className="w-4 h-4" /> ออกจากระบบ
          </button>
        </div>
      </div>

      {!editing && defaultAddr && (
        <p className="text-xs text-sb-mute bg-sb-bgDeep rounded-xl px-3.5 py-2.5 border border-sb-line">
          ที่อยู่จัดส่งหลัก: <span className="text-sb-ink">{defaultAddr.addressLine}</span>{" "}
          {defaultAddr.postalCode}
        </p>
      )}

      {editing && (
        <form onSubmit={handleSave} className="pt-3 border-t border-sb-line space-y-3 text-xs">
          <p className="text-sb-mute">
            บันทึกเบอร์โทรและที่อยู่จัดส่งไว้เพื่อเติมอัตโนมัติตอนสั่งซื้อ และดึงประวัติออเดอร์เดิมที่เคยสั่งด้วยเบอร์นี้มาแสดงรวมกัน
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1 font-semibold">
              <span>ชื่อ-นามสกุล *</span>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="sb-input text-sm" />
            </label>
            <label className="space-y-1 font-semibold">
              <span>เบอร์โทรศัพท์</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812345678" inputMode="tel" className="sb-input text-sm" />
            </label>
            <label className="space-y-1 font-semibold">
              <span>รหัสไปรษณีย์ 5 หลัก</span>
              <input maxLength={5} value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))} placeholder="10110" inputMode="numeric" className="sb-input text-sm" />
            </label>
          </div>
          <label className="block space-y-1 font-semibold">
            <span>ที่อยู่จัดส่งหลัก</span>
            <input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด" className="sb-input text-sm" />
          </label>
          <label className="block space-y-1 font-semibold">
            <span>อีเมล (ไม่บังคับ)</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="sb-input text-sm max-w-sm" />
          </label>
          {err && <p className="text-sb-orange font-semibold">{err}</p>}
          <button type="submit" disabled={saving} className="sb-btn text-xs">
            <Save className="w-3.5 h-3.5" /> {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลลูกค้า"}
          </button>
        </form>
      )}
    </div>
  );
}
