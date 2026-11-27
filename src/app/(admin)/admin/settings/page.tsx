import { getSession } from "@/lib/auth/session";
import { getAdminLineStatus } from "@/services/line-admin.service";
import { getStoreSettings, listCoupons } from "@/services/settings.service";
import { SettingsManager } from "@/components/admin/SettingsManager";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [session, settings, coupons, lineStatus] = await Promise.all([
    getSession(),
    getStoreSettings(),
    listCoupons(),
    getAdminLineStatus(),
  ]);

  return (
    <SettingsManager
      initialSettings={settings}
      initialCoupons={coupons}
      initialLineStatus={lineStatus}
      isOwner={session?.role === "OWNER"}
    />
  );
}
