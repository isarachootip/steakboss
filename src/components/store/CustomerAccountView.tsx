"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, RotateCcw } from "lucide-react";
import { useCart } from "./CartProvider";
import { formatBaht, formatDateTimeTH, STATUS_BADGE_STYLE } from "@/lib/format";
import { ORDER_STATUS_LABELS, isOrderStatus } from "@/domain/order";

interface AccountUser {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  lineUserId: string | null;
}

interface OrderRow {
  orderNo: string;
  status: string;
  totalBaht: number;
  createdAt: string;
  trackingNo: string;
  items: Array<{
    productId: string;
    productName: string;
    unitPriceBaht: number;
    quantity: number;
  }>;
}

export function CustomerAccountView() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { addItem, setDrawerOpen } = useCart();

  async function loadAccount() {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const me = (await meRes.json()) as { user: AccountUser | null };
      setUser(me.user);
      if (me.user) {
        const ordRes = await fetch("/api/store/orders");
        if (ordRes.ok) {
          const data = (await ordRes.json()) as { orders: OrderRow[] };
          setOrders(data.orders);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccount();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "customer", phone, name: name || undefined }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      return;
    }
    await loadAccount();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setOrders([]);
  }

  if (loading) {
    return <div className="sb-panel text-center text-sb-mute py-10">กำลังโหลดข้อมูลบัญชี...</div>;
  }

  if (!user) {
    return (
      <form onSubmit={handleLogin} className="sb-panel max-w-md mx-auto space-y-4">
        <h1 className="font-display font-extrabold text-2xl">เข้าสู่ระบบลูกค้า</h1>
        <p className="text-sm text-sb-mute">
          ใช้เบอร์โทรศัพท์ที่สั่งซื้อ เพื่อดูประวัติออเดอร์และกดสั่งซ้ำในคลิกเดียว
        </p>
        <label className="block space-y-1 text-sm font-semibold">
          <span>เบอร์โทรศัพท์ *</span>
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812345678" className="sb-input" />
        </label>
        <label className="block space-y-1 text-sm font-semibold">
          <span>ชื่อของคุณ (สำหรับลูกค้าใหม่)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="คุณสมชาย" className="sb-input" />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="sb-btn w-full">เข้าสู่ระบบ</button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sb-panel flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl">สวัสดี คุณ{user.name}</h1>
          <p className="text-sm text-sb-mute">
            {user.phone ? `เบอร์โทร: ${user.phone}` : ""} · สิทธิ์: {user.role}
          </p>
        </div>
        <button type="button" onClick={handleLogout} className="sb-btn-ghost text-sm">
          <LogOut className="w-4 h-4" /> ออกจากระบบ
        </button>
      </div>

      <div className="space-y-3">
        <h2 className="font-display font-bold text-xl">ประวัติคำสั่งซื้อของคุณ ({orders.length})</h2>
        {orders.length === 0 ? (
          <div className="sb-panel text-center text-sb-mute py-10">
            ยังไม่มีประวัติคำสั่งซื้อ{" "}
            <Link href="/#menu" className="text-sb-pink2 underline">เลือกเมนูเลย</Link>
          </div>
        ) : (
          orders.map((o) => (
            <div key={o.orderNo} className="sb-panel space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="font-display font-bold text-lg text-sb-pink2">{o.orderNo}</span>
                  <span className="text-xs text-sb-mute ml-2">{formatDateTimeTH(o.createdAt)}</span>
                </div>
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${STATUS_BADGE_STYLE[o.status] ?? ""}`}>
                  {isOrderStatus(o.status) ? ORDER_STATUS_LABELS[o.status] : o.status}
                </span>
              </div>
              <div className="text-sm text-sb-mute space-y-0.5">
                {o.items.map((it, idx) => (
                  <p key={idx}>• {it.productName} × {it.quantity}</p>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-sb-line">
                <span className="font-display font-bold text-lg">{formatBaht(o.totalBaht)}</span>
                <div className="flex gap-2">
                  {o.status === "PENDING_PAYMENT" && (
                    <Link href={`/orders/${o.orderNo}/pay`} className="sb-btn min-h-[36px] px-4 text-xs">
                      ชำระเงิน / แนบสลิป
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
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
                    }}
                    className="sb-btn-dark text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> สั่งซ้ำ
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
