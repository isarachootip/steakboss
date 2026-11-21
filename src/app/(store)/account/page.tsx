import { CustomerAccountView } from "@/components/store/CustomerAccountView";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <CustomerAccountView />
    </div>
  );
}
