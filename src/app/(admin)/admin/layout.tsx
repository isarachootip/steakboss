import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, type UserRole } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/auth/rbac";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin-login");
  }

  const liveUser = await db.user.findUnique({
    where: { id: session.userId },
    select: { name: true, role: true, isActive: true },
  });
  const effectiveRole = (liveUser?.role ?? "") as UserRole;
  if (!liveUser || !liveUser.isActive || !isStaffRole(effectiveRole)) {
    redirect("/admin-login");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AdminSidebar userName={liveUser.name} userRole={effectiveRole} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
