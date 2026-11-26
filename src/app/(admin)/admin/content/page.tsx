import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { MANAGER_ROLES } from "@/lib/auth/rbac";
import {
  getLandingContent,
  listAllGuidesAdmin,
} from "@/services/content.service";
import { ContentWorkspace } from "@/components/admin/ContentWorkspace";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const session = await getSession();
  if (!session || !MANAGER_ROLES.includes(session.role)) {
    redirect("/admin");
  }

  const [landing, guides] = await Promise.all([
    getLandingContent(),
    listAllGuidesAdmin(),
  ]);

  return (
    <ContentWorkspace
      initialLanding={landing}
      initialGuides={guides}
    />
  );
}
