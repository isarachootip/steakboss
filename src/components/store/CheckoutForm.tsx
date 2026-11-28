"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { CheckoutPaymentSection } from "./CheckoutPaymentSection";
import { CheckoutSummary, type QuoteSummary } from "./CheckoutSummary";

interface MeResponse {
  user?: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    addresses?: Array<{ addressLine: string; postalCode: string; isDefault: boolean }>;
  } | null;
  lineLoginEnabled?: boolean;
}

export function CheckoutForm() {
  const router = useRouter();
  const { items, subtotalBaht, clearCart } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"COLD_CHAIN" | "FACTORY_PICKUP">("COLD_CHAIN");
  const [addressText, setAddressText] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [isLineChannel, setIsLineChannel] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState<QuoteSummary | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [lineLoginEnabled, setLineLoginEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("sb_order_channel") === "LINE") {
        setIsLineChannel(true);
      }
    } catch {}
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: MeResponse) => {
        setLineLoginEnabled(Boolean(d.lineLoginEnabled));
        if (!d.user) return;
        setLoggedIn(true);
        if (d.user.name) setName((p) => p || d.user!.name!);
        if (d.user.phone) setPhone((p) => p || d.user!.phone!);
        if (d.user.email) setEmail((p) => p || d.user!.email!);
        const addr = d.user.addresses?.find((a) => a.isDefault) ?? d.user.addresses?.[0];
        if (addr?.addressLine) setAddressText((p) => p || addr.addressLine);
        if (addr?.postalCode) setPostalCode((p) => p || addr.postalCode);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/store/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            deliveryMethod, postalCode, paymentMethod: "PROMPTPAY", couponCode,
          }),
        });
        if (res.ok) setQuote((await res.json()) as QuoteSummary);
      } catch {
        // ignore transient quote error
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [items, deliveryMethod, postalCode, couponCode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const orderChannel = isLineChannel ? "LINE" : "WEB";
      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          customerName: name, customerPhone: phone, customerEmail: email,
          deliveryMethod, addressText, postalCode, paymentMethod: "PROMPTPAY", couponCode, note, channel: orderChannel,
        }),
      });
      const data = (await res.json()) as { order?: { orderNo: string }; error?: string };
      if (!res.ok || !data.order) {
        setError(data.error || "ไม่สามารถสร้างคำสั่งซื้อได้");
        setSubmitting(false);
        return;
      }
      clearCart();
      router.push(`/orders/${data.order.orderNo}/pay`);
    } catch {
      setError("การเชื่อมต่อขัดข้อง กรุณาลองใหม่");
      setSubmitting(false);
    }
  }

  const submitLabel = submitting
    ? "กำลังบันทึกคำสั่งซื้อ..."
    : "สร้างออเดอร์และรับ QR ชำระเงิน";

  if (items.length === 0) {
    return (
      <div className="sb-panel text-center py-12 space-y-4">
        <p className="text-sb-mute">ตะกร้าสินค้าของคุณยังว่างอยู่</p>
        <Link href="/#menu" className="sb-btn">กลับไปเลือกเมนูสเต็ก</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-start">
      <form onSubmit={onSubmit} className="sb-panel space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl">ข้อมูลจัดส่งและชำระเงิน</h1>
          {!loggedIn && lineLoginEnabled && (
            <a href="/api/auth/line?next=/checkout" className="rounded-full bg-[#06C755] hover:bg-[#05b34c] text-white font-display font-bold px-4 py-1.5 text-xs transition">
              เข้าสู่ระบบด้วย LINE (จำที่อยู่ + แจ้งเตือน)
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-sm font-semibold">
            <span>ชื่อ-นามสกุล *</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="sb-input" />
          </label>
          <label className="space-y-1.5 text-sm font-semibold">
            <span>เบอร์โทรศัพท์ *</span>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="0812345678" className="sb-input" />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm font-semibold">
          <span>อีเมล (ไม่บังคับ)</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="sb-input" />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={`p-3.5 rounded-xl border cursor-pointer flex gap-3 ${deliveryMethod === "COLD_CHAIN" ? "border-sb-pink bg-sb-pink/10" : "border-sb-line"}`}>
            <input type="radio" checked={deliveryMethod === "COLD_CHAIN"} onChange={() => setDeliveryMethod("COLD_CHAIN")} className="mt-1 accent-sb-pink" />
            <span className="text-sm"><b>ส่งรถเย็นถึงบ้าน</b><span className="block text-xs text-sb-mute">คิดตามรหัสไปรษณีย์</span></span>
          </label>
          <label className={`p-3.5 rounded-xl border cursor-pointer flex gap-3 ${deliveryMethod === "FACTORY_PICKUP" ? "border-sb-pink bg-sb-pink/10" : "border-sb-line"}`}>
            <input type="radio" checked={deliveryMethod === "FACTORY_PICKUP"} onChange={() => setDeliveryMethod("FACTORY_PICKUP")} className="mt-1 accent-sb-pink" />
            <span className="text-sm"><b>รับเองที่หน้าร้าน</b><span className="block text-xs text-sb-mute">ซอยรามอินทรา 57 แยก 8 ท่าแร้ง บางเขน กทม. · ฟรี</span></span>
          </label>
        </div>

        {deliveryMethod === "COLD_CHAIN" && (
          <div className="space-y-4">
            <label className="block space-y-1.5 text-sm font-semibold">
              <span>ที่อยู่จัดส่ง *</span>
              <textarea required rows={3} value={addressText} onChange={(e) => setAddressText(e.target.value)} className="sb-input" placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด" />
            </label>
            <label className="block space-y-1.5 text-sm font-semibold">
              <span>รหัสไปรษณีย์ 5 หลัก *</span>
              <input required maxLength={5} inputMode="numeric" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="10110" className="sb-input max-w-[200px]" />
            </label>
          </div>
        )}

        <CheckoutPaymentSection isLineChannel={isLineChannel} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-sm font-semibold">
            <span>โค้ดส่วนลด (ลอง: BOSS50)</span>
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="BOSS50" className="sb-input uppercase" />
            {quote?.couponApplied && <span className="text-xs text-sb-ok">ใช้โค้ด {quote.couponApplied} สำเร็จ!</span>}
            {quote?.couponError && <span className="text-xs text-red-400">{quote.couponError}</span>}
          </label>
          <label className="space-y-1.5 text-sm font-semibold">
            <span>หมายเหตุถึงร้าน</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น สะดวกรับช่วงบ่าย" className="sb-input" />
          </label>
        </div>

        {error && <p className="text-sm text-red-400 bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-2.5">{error}</p>}
        <button type="submit" disabled={submitting} className="sb-btn w-full">{submitLabel}</button>
      </form>
      <CheckoutSummary items={items} subtotalBaht={subtotalBaht} quote={quote} />
    </div>
  );
}
