import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, type UserRole } from "@/lib/auth/session";
import { MANAGER_ROLES } from "@/lib/auth/rbac";
import { listAllGuidesAdmin } from "@/services/content.service";
import {
  getEventPopup,
  listAllHeroSlidesAdmin,
} from "@/services/promo.service";
import { ContentWorkspace } from "@/components/admin/ContentWorkspace";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const session = await getSession();
  if (!session) redirect("/admin-login");

  const live = await db.user.findUnique({
    where: { id: session.userId },
    select: { role: true, isActive: true },
  });
  if (!live || !live.isActive || !MANAGER_ROLES.includes(live.role as UserRole)) {
    redirect("/admin");
  }

  const [slides, popup, guides] = await Promise.all([
    listAllHeroSlidesAdmin(),
    getEventPopup(),
    listAllGuidesAdmin(),
  ]);

  return (
    <ContentWorkspace
      initialSlides={slides}
      initialPopup={popup}
      initialGuides={guides}
    />
  );
}
