import { CheckoutForm } from "@/components/store/CheckoutForm";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <CheckoutForm />
    </div>
  );
}
