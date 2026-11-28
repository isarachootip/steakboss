import { db } from "@/lib/db";
import { getSession, type UserRole } from "@/lib/auth/session";
import { listPurchaseOrders } from "@/services/purchase-order.service";
import { PurchaseOrdersManager } from "@/components/admin/PurchaseOrdersManager";
import type { PoProductOption } from "@/components/admin/po-ui-helpers";

export const dynamic = "force-dynamic";

export default async function AdminPurchaseOrdersPage() {
  const session = await getSession();
  const liveUser = session
    ? await db.user.findUnique({
        where: { id: session.userId },
        select: { role: true },
      })
    : null;
  const role = (liveUser?.role ?? "PACKER") as UserRole;
  const includeCost = role !== "PACKER";
  const canManage = role === "OWNER" || role === "ADMIN";

  const [purchaseOrders, rawProducts] = await Promise.all([
    listPurchaseOrders({ includeCost }),
    canManage
      ? db.product.findMany({
          where: { isBundle: false },
          select: { id: true, sku: true, name: true, stockQty: true, costBaht: true },
          orderBy: [{ sku: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const productOptions: PoProductOption[] = rawProducts.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    stockQty: p.stockQty,
    ...(includeCost ? { costBaht: p.costBaht } : {}),
  }));

  return (
    <PurchaseOrdersManager
      initialOrders={purchaseOrders}
      productOptions={productOptions}
      includeCost={includeCost}
      canManage={canManage}
    />
  );
}
