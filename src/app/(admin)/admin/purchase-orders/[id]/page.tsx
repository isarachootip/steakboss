import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, type UserRole } from "@/lib/auth/session";
import { getPurchaseOrderById } from "@/services/purchase-order.service";
import { PurchaseOrderDetailView } from "@/components/admin/PurchaseOrderDetailView";
import type { PoProductOption } from "@/components/admin/po-ui-helpers";

export const dynamic = "force-dynamic";

export default async function AdminPurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const [purchaseOrder, rawProducts] = await Promise.all([
    getPurchaseOrderById(id, includeCost),
    canManage
      ? db.product.findMany({
          where: { isBundle: false },
          select: { id: true, sku: true, name: true, stockQty: true, costBaht: true },
          orderBy: [{ sku: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  if (!purchaseOrder) {
    notFound();
  }

  const productOptions: PoProductOption[] = rawProducts.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    stockQty: p.stockQty,
    ...(includeCost ? { costBaht: p.costBaht } : {}),
  }));

  return (
    <PurchaseOrderDetailView
      initialOrder={purchaseOrder}
      productOptions={productOptions}
      includeCost={includeCost}
      canManage={canManage}
    />
  );
}
