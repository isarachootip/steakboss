"use client";

import Link from "next/link";
import { ShoppingBag, User } from "lucide-react";
import { useCart } from "./CartProvider";

export function StoreHeader() {
  const { count, setDrawerOpen } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-sb-bg/90 backdrop-blur border-b border-sb-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-4">
        <Link href="/" className="block leading-none">
          <span className="font-display font-extrabold text-2xl tracking-wide text-sb-ink">
            STEAK<span className="text-sb-pink">BOSS</span>
          </span>
          <span className="block font-display text-[11px] text-sb-mute mt-0.5">
            สเต็กบอสส์ต้นตำรับ
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-auto text-sm font-semibold">
          <Link href="/#new" className="px-3 py-2 rounded-full hover:bg-sb-panel2">
            สินค้าใหม่
          </Link>
          <Link href="/#menu" className="px-3 py-2 rounded-full hover:bg-sb-panel2">
            เมนูทั้งหมด
          </Link>
          <Link href="/#cook" className="px-3 py-2 rounded-full hover:bg-sb-panel2">
            วิธีปรุง
          </Link>
          <Link href="/#ship" className="px-3 py-2 rounded-full hover:bg-sb-panel2">
            ค่าจัดส่ง
          </Link>
          <Link href="/track" className="px-3 py-2 rounded-full hover:bg-sb-panel2">
            ติดตามพัสดุ
          </Link>
          <Link href="/account" className="px-3 py-2 rounded-full hover:bg-sb-panel2 inline-flex items-center gap-1">
            <User className="w-4 h-4" /> บัญชีฉัน
          </Link>
          <Link href="/admin" className="px-3 py-2 rounded-full text-sb-pink2 hover:bg-sb-panel2">
            หลังบ้าน
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="sb-btn relative ml-auto md:ml-2 px-4 min-h-[40px] text-sm"
          aria-label="เปิดตะกร้าสินค้า"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>ตะกร้า</span>
          <span className="min-w-[22px] h-[22px] rounded-full bg-sb-orange text-[#2b1000] text-xs font-extrabold grid place-items-center px-1">
            {count}
          </span>
        </button>
      </div>

      <div className="flex md:hidden gap-1.5 overflow-x-auto px-4 pb-2.5 text-xs font-semibold">
        <Link href="/#menu" className="shrink-0 px-3 py-1.5 rounded-full bg-sb-panel2">เมนู</Link>
        <Link href="/#cook" className="shrink-0 px-3 py-1.5 rounded-full bg-sb-panel2">วิธีปรุง</Link>
        <Link href="/#ship" className="shrink-0 px-3 py-1.5 rounded-full bg-sb-panel2">ค่าส่ง</Link>
        <Link href="/track" className="shrink-0 px-3 py-1.5 rounded-full bg-sb-panel2">ติดตามพัสดุ</Link>
        <Link href="/account" className="shrink-0 px-3 py-1.5 rounded-full bg-sb-panel2">บัญชีฉัน</Link>
        <Link href="/admin" className="shrink-0 px-3 py-1.5 rounded-full bg-sb-panel2 text-sb-pink2">หลังบ้าน</Link>
      </div>
    </header>
  );
}
