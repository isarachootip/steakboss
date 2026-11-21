"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@steakboss.local");
  const [password, setPassword] = useState("boss1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "staff", email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
        setBusy(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("การเชื่อมต่อขัดข้อง");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md sb-panel space-y-6">
        <div className="text-center space-y-1">
          <div className="font-display font-extrabold text-3xl">
            STEAK<span className="text-sb-pink">BOSS</span>
          </div>
          <p className="text-sm text-sb-mute">เข้าสู่ระบบหลังบ้าน (Back-Office)</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-semibold">
            <span>อีเมลพนักงาน</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="sb-input"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold">
            <span>รหัสผ่าน</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="sb-input"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={busy} className="sb-btn w-full">
            {busy ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบหลังบ้าน"}
          </button>
        </form>

        <div className="rounded-xl bg-sb-panel2 p-3.5 text-xs text-sb-mute space-y-1">
          <p className="font-bold text-sb-ink">บัญชีทดสอบ RBAC (Seed):</p>
          <p>• OWNER: owner@steakboss.local / boss1234</p>
          <p>• ADMIN: admin@steakboss.local / admin1234</p>
          <p>• PACKER: packer@steakboss.local / pack1234</p>
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-sb-pink2 hover:underline">
            ← กลับไปหน้าร้าน
          </Link>
        </div>
      </div>
    </div>
  );
}
