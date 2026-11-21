import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/auth/rbac";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session || !isStaffRole(session.role)) {
    redirect("/admin-login");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <AdminSidebar userName={session.name} userRole={session.role} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
