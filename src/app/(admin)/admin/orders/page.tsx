import { getSession } from "@/lib/auth/session";
import { OrdersManager } from "@/components/admin/OrdersManager";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const session = await getSession();
  return <OrdersManager userRole={session?.role ?? "PACKER"} />;
}
