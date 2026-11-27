"use client";

import { useState } from "react";
import type { AdminLineStatus } from "@/services/line-admin.service";
import { LineIntegrationCard } from "./LineIntegrationCard";

interface SettingsData {
  bkkShipBaht: number;
  upcShipBaht: number;
  freeShipThreshold: number;
  codFeeBaht: number;
  phone: string;
  lineId: string;
  lineOaUrl: string;
  promptpayId: string;
  promptpayName: string;
  facebookPage: string;
  unpaidExpireHours: number;
}

interface CouponItem {
  id: string;
  code: string;
  type: string;
  value: number;
  minSubtotal: number;
  usedCount: number;
  isActive: boolean;
}

export function SettingsManager({
  initialSettings,
  initialCoupons,
  initialLineStatus,
  isOwner,
}: {
  initialSettings: SettingsData;
  initialCoupons: CouponItem[];
  initialLineStatus: AdminLineStatus;
  isOwner: boolean;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [coupons, setCoupons] = useState(initialCoupons);
  const [newCode, setNewCode] = useState("");
  const [newType, setNewType] = useState<"FIXED" | "PERCENT" | "FREE_SHIP">("FIXED");
  const [newVal, setNewVal] = useState(50);
  const [newMin, setNewMin] = useState(300);
  const [msg, setMsg] = useState<string | null>(null);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = (await res.json()) as { error?: string };
    setMsg(res.ok ? "บันทึกการตั้งค่าร้านและค่าส่งแล้ว" : data.error || "บันทึกไม่สำเร็จ");
  }

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode,
        type: newType,
        value: newVal,
        minSubtotal: newMin,
      }),
    });
    const data = (await res.json()) as { coupon?: CouponItem; error?: string };
    if (res.ok && data.coupon) {
      setCoupons((prev) => [data.coupon!, ...prev]);
      setNewCode("");
      setMsg(`สร้างคูปอง ${data.coupon.code} สำเร็จ`);
    } else {
      setMsg(data.error || "สร้างคูปองไม่สำเร็จ");
    }
  }

  async function toggleCoupon(id: string, isActive: boolean) {
    const res = await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive }),
    });
    if (res.ok) {
      setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, isActive } : c)));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-3xl">ตั้งค่าค่าส่ง ข้อมูลร้าน & คูปอง</h1>
        {!isOwner && <p className="text-xs text-sb-orange mt-1">สิทธิ์ของคุณดูได้อย่างเดียว (เฉพาะ OWNER เท่านั้นที่แก้ไขได้)</p>}
      </div>

      {msg && <div className="rounded-xl bg-sb-panel2 border border-sb-pink/40 px-4 py-2.5 text-sm text-sb-pink2">{msg}</div>}

      <LineIntegrationCard
        initialStatus={initialLineStatus}
        isOwner={isOwner}
        onLineSettingsSynced={(lineId, lineOaUrl) =>
          setSettings((prev) => ({ ...prev, lineId, lineOaUrl }))
        }
      />

      <form onSubmit={saveSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="sb-panel space-y-3">
          <h2 className="font-display font-bold text-lg">อัตราค่าจัดส่งรถเย็น (บาท)</h2>
          <label className="block text-sm">กทม. และปริมณฑล<input disabled={!isOwner} type="number" value={settings.bkkShipBaht} onChange={(e) => setSettings({ ...settings, bkkShipBaht: Number(e.target.value) })} className="sb-input mt-1" /></label>
          <label className="block text-sm">ต่างจังหวัด<input disabled={!isOwner} type="number" value={settings.upcShipBaht} onChange={(e) => setSettings({ ...settings, upcShipBaht: Number(e.target.value) })} className="sb-input mt-1" /></label>
          <label className="block text-sm">ส่งฟรีเมื่อครบ<input disabled={!isOwner} type="number" value={settings.freeShipThreshold} onChange={(e) => setSettings({ ...settings, freeShipThreshold: Number(e.target.value) })} className="sb-input mt-1" /></label>
          <label className="block text-sm">ค่าธรรมเนียม COD<input disabled={!isOwner} type="number" value={settings.codFeeBaht} onChange={(e) => setSettings({ ...settings, codFeeBaht: Number(e.target.value) })} className="sb-input mt-1" /></label>
          <label className="block text-sm">ยกเลิกอัตโนมัติหากไม่โอนภายใน (ชั่วโมง)<input disabled={!isOwner} type="number" value={settings.unpaidExpireHours} onChange={(e) => setSettings({ ...settings, unpaidExpireHours: Number(e.target.value) })} className="sb-input mt-1" /></label>
        </div>

        <div className="sb-panel space-y-3">
          <h2 className="font-display font-bold text-lg">ข้อมูลร้าน พร้อมเพย์ & LINE OA</h2>
          <label className="block text-sm">เบอร์โทรร้าน<input disabled={!isOwner} value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className="sb-input mt-1" /></label>
          <label className="block text-sm">LINE ID<input disabled={!isOwner} value={settings.lineId} onChange={(e) => setSettings({ ...settings, lineId: e.target.value })} className="sb-input mt-1" /></label>
          <label className="block text-sm">ลิงก์ LINE OA<input disabled={!isOwner} value={settings.lineOaUrl} onChange={(e) => setSettings({ ...settings, lineOaUrl: e.target.value })} className="sb-input mt-1" /></label>
          <label className="block text-sm">เลขพร้อมเพย์ (เบอร์ 10 หลัก หรือ Tax ID 13 หลัก)<input disabled={!isOwner} value={settings.promptpayId} onChange={(e) => setSettings({ ...settings, promptpayId: e.target.value })} className="sb-input mt-1" /></label>
          <label className="block text-sm">ชื่อบัญชีพร้อมเพย์<input disabled={!isOwner} value={settings.promptpayName} onChange={(e) => setSettings({ ...settings, promptpayName: e.target.value })} className="sb-input mt-1" /></label>
          {isOwner && <button type="submit" className="sb-btn w-full mt-2">บันทึกการตั้งค่า</button>}
        </div>
      </form>

      <div className="sb-panel space-y-4">
        <h2 className="font-display font-bold text-lg">จัดการคูปองส่วนลด</h2>
        {isOwner && (
          <form onSubmit={createCoupon} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <input required placeholder="โค้ด เช่น STEAK100" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} className="sb-input text-sm uppercase" />
            <select value={newType} onChange={(e) => setNewType(e.target.value as "FIXED" | "PERCENT" | "FREE_SHIP")} className="sb-input text-sm">
              <option value="FIXED">ลดเป็นบาท</option>
              <option value="PERCENT">ลดเป็น %</option>
              <option value="FREE_SHIP">ส่งฟรี</option>
            </select>
            <input type="number" placeholder="มูลค่า" value={newVal} onChange={(e) => setNewVal(Number(e.target.value))} className="sb-input text-sm" />
            <input type="number" placeholder="ขั้นต่ำ (บาท)" value={newMin} onChange={(e) => setNewMin(Number(e.target.value))} className="sb-input text-sm" />
            <button type="submit" className="sb-btn text-sm">สร้างคูปอง</button>
          </form>
        )}
        <div className="divide-y divide-sb-line text-sm">
          {coupons.map((c) => (
            <div key={c.id} className="py-2.5 flex items-center justify-between gap-2">
              <div>
                <span className="font-display font-bold text-sb-pink2">{c.code}</span>
                <span className="text-xs text-sb-mute ml-2">
                  {c.type} ({c.value}) · ขั้นต่ำ ฿{c.minSubtotal} · ใช้แล้ว {c.usedCount} ครั้ง
                </span>
              </div>
              <input
                type="checkbox"
                disabled={!isOwner}
                checked={c.isActive}
                onChange={(e) => toggleCoupon(c.id, e.target.checked)}
                className="w-5 h-5 accent-sb-pink"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
