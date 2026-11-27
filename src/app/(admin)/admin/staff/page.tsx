import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, type UserRole } from "@/lib/auth/session";
import { OWNER_ROLES } from "@/lib/auth/rbac";
import { listStaffMembers } from "@/services/staff.service";
import { StaffManager } from "@/components/admin/StaffManager";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const session = await getSession();
  if (!session) redirect("/admin-login");

  const live = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true, isActive: true },
  });
  if (!live || !live.isActive || !OWNER_ROLES.includes(live.role as UserRole)) {
    redirect("/admin");
  }

  const staff = await listStaffMembers();

  return <StaffManager initialStaff={staff} currentUserId={session.userId} />;
}
