import { getSession } from "@/lib/auth/session";
import { getStoreSettings, listCoupons } from "@/services/settings.service";
import { SettingsManager } from "@/components/admin/SettingsManager";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [session, settings, coupons] = await Promise.all([
    getSession(),
    getStoreSettings(),
    listCoupons(),
  ]);

  return (
    <SettingsManager
      initialSettings={settings}
      initialCoupons={coupons}
      isOwner={session?.role === "OWNER"}
    />
  );
}
