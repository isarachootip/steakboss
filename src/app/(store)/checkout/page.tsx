import { getStoreSettings } from "@/services/settings.service";
import { CheckoutForm } from "@/components/store/CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const settings = await getStoreSettings();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <CheckoutForm codFeeBaht={settings.codFeeBaht} />
    </div>
  );
}
