import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { expandStockDeductions } from "@/domain/inventory";

export { notifyOrderStatus } from "./order-notify.service";

const ORDER_STOCK_INCLUDE = {
  items: {
    include: { product: { include: { bundleComponents: true } } },
  },
} satisfies Prisma.OrderInclude;

type OrderWithStockItems = Prisma.OrderGetPayload<{
  include: typeof ORDER_STOCK_INCLUDE;
}>;

function expandOrderItemDeductions(order: OrderWithStockItems) {
  return expandStockDeductions(
    order.items.map((item) => ({
      quantity: item.quantity,
      product: {
        id: item.productId,
        isBundle: item.product.isBundle,
        isActive: true,
        stockQty: item.product.stockQty,
        components: item.product.bundleComponents.map((b) => ({
          childProductId: b.childProductId,
          quantity: b.quantity,
          childStockQty: 0,
          childPriceBaht: 0,
        })),
      },
    }))
  );
}

export async function deductOrderStockInTx(
  tx: Prisma.TransactionClient,
  orderId: string,
  orderNo: string,
  actorId?: string | null
): Promise<{ deducted: boolean; shortages: string[] }> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: ORDER_STOCK_INCLUDE,
  });
  if (!order || order.stockDeducted) {
    return { deducted: false, shortages: [] };
  }

  const shortages: string[] = [];
  for (const d of expandOrderItemDeductions(order)) {
    const prod = await tx.product.findUnique({
      where: { id: d.productId },
      select: { id: true, name: true, sku: true, stockQty: true },
    });
    if (!prod) continue;

    const actualDeduct = Math.min(Math.max(0, prod.stockQty), d.quantity);
    if (actualDeduct < d.quantity) {
      shortages.push(`${prod.sku} (${prod.name}) ต้องการ ${d.quantity} แต่มี ${prod.stockQty}`);
    }
    if (actualDeduct > 0) {
      await tx.product.update({
        where: { id: prod.id },
        data: { stockQty: { decrement: actualDeduct } },
      });
      await tx.stockMovement.create({
        data: {
          productId: prod.id,
          deltaQty: -actualDeduct,
          type: "DEDUCT",
          reason: `ตัดสต็อกยืนยันชำระเงิน ${orderNo}`,
          orderNo,
          actorId: actorId ?? null,
        },
      });
    }
  }

  await tx.order.update({ where: { id: order.id }, data: { stockDeducted: true } });
  return { deducted: true, shortages };
}

export async function releaseOrderStock(
  orderId: string,
  orderNo: string,
  reason: string,
  actorId?: string
): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: ORDER_STOCK_INCLUDE,
  });
  if (!order || !order.stockDeducted) return;

  const deductions = expandOrderItemDeductions(order);
  await db.$transaction(async (tx) => {
    for (const d of deductions) {
      await tx.product.update({
        where: { id: d.productId },
        data: { stockQty: { increment: d.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: d.productId,
          deltaQty: d.quantity,
          type: "RELEASE",
          reason,
          orderNo,
          actorId: actorId ?? null,
        },
      });
    }
    await tx.order.update({ where: { id: order.id }, data: { stockDeducted: false } });
  });
}

export async function cancelExpiredUnpaidOrders(): Promise<number> {
  const expired = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", expiresAt: { lt: new Date() } },
  });

  for (const order of expired) {
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        events: {
          create: {
            status: "CANCELLED",
            note: "ยกเลิกอัตโนมัติเนื่องจากเกินกำหนดชำระเงิน",
          },
        },
      },
    });
    if (order.stockDeducted) {
      await releaseOrderStock(order.id, order.orderNo, "คืนสต็อกอัตโนมัติ (เกินกำหนดโอน)");
    }
  }
  return expired.length;
}
