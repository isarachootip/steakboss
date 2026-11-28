"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  BookOpen,
  ShoppingCart,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  ExternalLink,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: readonly string[];
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/admin", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/admin/products", label: "สินค้า & สต็อก", icon: Package },
  { href: "/admin/purchase-orders", label: "สั่งซื้อ & รับเข้า (PO)", icon: ClipboardList },
  {
    href: "/admin/content",
    label: "เนื้อหา & วิธีปรุง",
    icon: BookOpen,
    roles: ["OWNER", "ADMIN"],
  },
  { href: "/admin/orders", label: "คำสั่งซื้อ & จัดส่ง", icon: ShoppingCart },
  { href: "/admin/inbox", label: "แชท LINE & Web", icon: MessageSquare },
  { href: "/admin/customers", label: "ลูกค้า CRM", icon: Users },
  { href: "/admin/reports", label: "รายงาน & การเงิน", icon: BarChart3 },
  {
    href: "/admin/staff",
    label: "สิทธิ์ & พนักงาน",
    icon: Shield,
    roles: ["OWNER"],
  },
  { href: "/admin/settings", label: "ตั้งค่า & คูปอง", icon: Settings },
];

export function AdminSidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin-login");
    router.refresh();
  }

  return (
    <aside className="no-print w-full lg:w-64 shrink-0 bg-sb-bgDeep border-b lg:border-b-0 lg:border-r border-sb-line p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between lg:block">
        <Link href="/admin" className="font-display font-extrabold text-2xl">
          STEAK<span className="text-sb-pink">BOSS-MAM</span>
          <span className="block text-[11px] font-normal text-sb-mute">
            Back-Office · {userRole}
          </span>
        </Link>
        <Link
          href="/"
          className="lg:hidden text-xs text-sb-pink2 inline-flex items-center gap-1"
        >
          หน้าร้าน <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
        {NAV_ITEMS.filter(
          (item) => !item.roles || item.roles.includes(userRole)
        ).map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                active
                  ? "bg-sb-pink text-[#1a1205]"
                  : "text-sb-ink/85 hover:bg-sb-panel2"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden lg:block mt-auto pt-4 border-t border-sb-line space-y-2">
        <p className="text-xs text-sb-mute truncate">{userName}</p>
        <div className="flex gap-2">
          <Link href="/" className="sb-btn-dark flex-1 text-xs">
            <ExternalLink className="w-3.5 h-3.5" /> หน้าร้าน
          </Link>
          <button type="button" onClick={logout} className="sb-btn-dark px-3 text-xs" aria-label="ออกจากระบบ">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
