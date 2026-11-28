"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Truck } from "lucide-react";
import { useCart } from "./CartProvider";
import { CustomerProfileCard, type AccountUser } from "./CustomerProfileCard";
import { AccountOrderCard, type AccountOrderRow } from "./AccountOrderCard";

export function CustomerAccountView() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [lineLoginEnabled, setLineLoginEnabled] = useState(true);
  const [orders, setOrders] = useState<AccountOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [lineError, setLineError] = useState<string | null>(null);
  const { addItem, setDrawerOpen } = useCart();

  async function loadAccount() {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const me = (await meRes.json()) as {
        user: AccountUser | null;
        lineLoginEnabled?: boolean;
      };
      setUser(me.user);
      setLineLoginEnabled(me.lineLoginEnabled !== false);
      if (me.user) {
        const ordRes = await fetch("/api/store/orders");
        if (ordRes.ok) {
          const data = (await ordRes.json()) as { orders: AccountOrderRow[] };
          setOrders(data.orders);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("lineError");
    if (err === "not_configured") {
      setLineError("ระบบยังไม่ได้ตั้งค่า LINE_LOGIN_CHANNEL_ID และ LINE_LOGIN_CHANNEL_SECRET ในเซิร์ฟเวอร์");
    } else if (err) {
      setLineError("ไม่สามารถเข้าสู่ระบบด้วย LINE ได้ กรุณาลองใหม่อีกครั้ง");
    }
    loadAccount();
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOrders([]);
  }

  function handleReorder(o: AccountOrderRow) {
    o.items.forEach((it) =>
      addItem(
        {
          productId: it.productId,
          slug: "",
          name: it.productName,
          priceBaht: it.unitPriceBaht,
          weightGrams: 180,
          imgUrl: "/images/products/kp-plated.jpg",
        },
        it.quantity
      )
    );
    setDrawerOpen(true);
  }

  if (loading) {
    return <div className="sb-panel text-center text-sb-mute py-10">กำลังโหลดข้อมูลบัญชี...</div>;
  }

  if (!user) {
    return (
      <div className="sb-panel max-w-md mx-auto space-y-5 text-center">
        <div className="space-y-2">
          <h1 className="font-display font-extrabold text-2xl">เข้าสู่ระบบลูกค้า SteakBoss</h1>
          <p className="text-sm text-sb-mute">
            เข้าสู่ระบบด้วย LINE เพื่อบันทึกที่อยู่จัดส่ง ดูประวัติคำสั่งซื้อ ติดตามพัสดุได้ทันที และรับแจ้งเตือนสถานะรถเย็นทาง LINE
          </p>
        </div>

        {lineError && (
          <p className="text-xs text-sb-orange bg-red-950/40 border border-sb-orange/40 rounded-xl p-3">
            {lineError}
          </p>
        )}

        <a
          href="/api/auth/line?next=/account"
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white font-display font-bold py-3.5 px-6 text-sm transition"
        >
          เข้าสู่ระบบด้วย LINE
        </a>

        {!lineLoginEnabled && (
          <p className="text-[11px] text-sb-mute">
            (สำหรับผู้ดูแลร้าน: เพิ่ม LINE_LOGIN_CHANNEL_ID และ LINE_LOGIN_CHANNEL_SECRET ใน Coolify เพื่อเปิดใช้งานปุ่ม LINE Login)
          </p>
        )}

        <div className="pt-3 border-t border-sb-line space-y-2 text-xs text-sb-mute">
          <p>สั่งซื้อแบบไม่ได้ล็อกอิน? สามารถเช็กสถานะด้วยเลขคำสั่งซื้อและเบอร์โทร 4 ตัวท้ายได้</p>
          <Link href="/track" className="sb-btn-dark inline-flex items-center gap-1.5 text-xs">
            <Truck className="w-3.5 h-3.5" /> ติดตามพัสดุ (Guest)
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notice && (
        <div className="rounded-xl bg-emerald-950/50 border border-emerald-700/50 px-4 py-2.5 text-sm text-emerald-200">
          {notice}
        </div>
      )}

      <CustomerProfileCard
        user={user}
        onLogout={handleLogout}
        onSaved={async (updated, msg) => {
          setUser(updated);
          setNotice(msg);
          await loadAccount();
        }}
      />

      <div className="space-y-3">
        <h2 className="font-display font-bold text-xl">ประวัติคำสั่งซื้อของคุณ ({orders.length})</h2>
        {orders.length === 0 ? (
          <div className="sb-panel text-center text-sb-mute py-10">
            ยังไม่มีประวัติคำสั่งซื้อ{" "}
            <Link href="/#menu" className="text-sb-pink2 underline">เลือกเมนูเลย</Link>
          </div>
        ) : (
          orders.map((o) => <AccountOrderCard key={o.orderNo} order={o} onReorder={handleReorder} />)
        )}
      </div>
    </div>
  );
}
