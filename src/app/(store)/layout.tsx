import type { ReactNode } from "react";
import { getSession } from "@/lib/auth/session";
import { getStoreSettings } from "@/services/settings.service";
import { CartProvider } from "@/components/store/CartProvider";
import { StoreHeader } from "@/components/store/StoreHeader";
import { CartDrawer } from "@/components/store/CartDrawer";
import { StoreFooter } from "@/components/store/StoreFooter";
import { BossBotWidget } from "@/components/chat/BossBotWidget";

export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, session] = await Promise.all([
    getStoreSettings(),
    getSession(),
  ]);

  return (
    <CartProvider
      wholesaleMinPacks={settings.wholesaleMinPacks}
      isWholesaleRole={session?.role === "WHOLESALE"}
    >
      <StoreHeader />
      <main className="min-h-[75vh]">{children}</main>
      <StoreFooter
        phone={settings.phone}
        lineId={settings.lineId}
        lineOaUrl={settings.lineOaUrl}
        facebookPage={settings.facebookPage}
      />
      <CartDrawer freeShipThreshold={settings.freeShipThreshold} />
      <BossBotWidget lineOaUrl={settings.lineOaUrl} />
    </CartProvider>
  );
}
