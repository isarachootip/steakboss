import type { Prisma } from "@prisma/client";
import type {
  GoodsReceiptStatus,
  PurchaseOrderStatus,
} from "@/domain/purchase-order";

export const PO_LIST_INCLUDE = {
  items: {
    orderBy: { skuSnapshot: "asc" as const },
  },
  _count: {
    select: { receipts: true },
  },
} satisfies Prisma.PurchaseOrderInclude;

export const PO_DETAIL_INCLUDE = {
  items: {
    orderBy: { skuSnapshot: "asc" as const },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          stockQty: true,
          weightGrams: true,
          packSize: true,
        },
      },
    },
  },
  receipts: {
    orderBy: { receivedAt: "desc" as const },
    include: {
      items: {
        orderBy: { skuSnapshot: "asc" as const },
      },
    },
  },
} satisfies Prisma.PurchaseOrderInclude;

export type PoListRow = Prisma.PurchaseOrderGetPayload<{
  include: typeof PO_LIST_INCLUDE;
}>;

export type PoDetailRow = Prisma.PurchaseOrderGetPayload<{
  include: typeof PO_DETAIL_INCLUDE;
}>;

export interface PurchaseOrderItemDto {
  id: string;
  productId: string;
  skuSnapshot: string;
  productNameSnapshot: string;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  unitCostBaht?: number;
  lineTotalBaht?: number;
  currentStockQty?: number;
}

export interface GoodsReceiptItemDto {
  id: string;
  purchaseOrderItemId: string;
  productId: string;
  skuSnapshot: string;
  receivedQty: number;
  unitCostBaht?: number;
}

export interface GoodsReceiptDto {
  id: string;
  receiptNo: string;
  deliveryNoteNo: string;
  note: string;
  status: GoodsReceiptStatus;
  receivedById: string;
  voidedById: string | null;
  voidReason: string | null;
  voidedAt: string | null;
  receivedAt: string;
  items: GoodsReceiptItemDto[];
}

export interface PurchaseOrderSummaryDto {
  id: string;
  poNo: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  expectedDate: string;
  note: string;
  totalCostBaht?: number;
  totalOrderedQty: number;
  totalReceivedQty: number;
  lineCount: number;
  receiptCount: number;
  skuList: string[];
  createdById: string;
  closedAt: string | null;
  createdAt: string;
}

export interface PurchaseOrderDetailDto extends PurchaseOrderSummaryDto {
  items: PurchaseOrderItemDto[];
  receipts: GoodsReceiptDto[];
}

export function mapPurchaseOrderSummary(
  row: PoListRow,
  includeCost: boolean
): PurchaseOrderSummaryDto {
  const totalOrderedQty = row.items.reduce((s, i) => s + i.orderedQty, 0);
  const totalReceivedQty = row.items.reduce((s, i) => s + i.receivedQty, 0);
  return {
    id: row.id,
    poNo: row.poNo,
    supplierName: row.supplierName,
    status: row.status as PurchaseOrderStatus,
    expectedDate: row.expectedDate.toISOString(),
    note: row.note,
    ...(includeCost ? { totalCostBaht: row.totalCostBaht } : {}),
    totalOrderedQty,
    totalReceivedQty,
    lineCount: row.items.length,
    receiptCount: row._count.receipts,
    skuList: row.items.map((i) => i.skuSnapshot),
    createdById: row.createdById,
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapPurchaseOrderDetail(
  row: PoDetailRow,
  includeCost: boolean
): PurchaseOrderDetailDto {
  const totalOrderedQty = row.items.reduce((s, i) => s + i.orderedQty, 0);
  const totalReceivedQty = row.items.reduce((s, i) => s + i.receivedQty, 0);
  return {
    id: row.id,
    poNo: row.poNo,
    supplierName: row.supplierName,
    status: row.status as PurchaseOrderStatus,
    expectedDate: row.expectedDate.toISOString(),
    note: row.note,
    ...(includeCost ? { totalCostBaht: row.totalCostBaht } : {}),
    totalOrderedQty,
    totalReceivedQty,
    lineCount: row.items.length,
    receiptCount: row.receipts.length,
    skuList: row.items.map((i) => i.skuSnapshot),
    createdById: row.createdById,
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      skuSnapshot: item.skuSnapshot,
      productNameSnapshot: item.productNameSnapshot,
      orderedQty: item.orderedQty,
      receivedQty: item.receivedQty,
      remainingQty: Math.max(0, item.orderedQty - item.receivedQty),
      currentStockQty: item.product.stockQty,
      ...(includeCost
        ? { unitCostBaht: item.unitCostBaht, lineTotalBaht: item.lineTotalBaht }
        : {}),
    })),
    receipts: row.receipts.map((rec) => ({
      id: rec.id,
      receiptNo: rec.receiptNo,
      deliveryNoteNo: rec.deliveryNoteNo,
      note: rec.note,
      status: rec.status as GoodsReceiptStatus,
      receivedById: rec.receivedById,
      voidedById: rec.voidedById,
      voidReason: rec.voidReason,
      voidedAt: rec.voidedAt ? rec.voidedAt.toISOString() : null,
      receivedAt: rec.receivedAt.toISOString(),
      items: rec.items.map((ri) => ({
        id: ri.id,
        purchaseOrderItemId: ri.purchaseOrderItemId,
        productId: ri.productId,
        skuSnapshot: ri.skuSnapshot,
        receivedQty: ri.receivedQty,
        ...(includeCost ? { unitCostBaht: ri.unitCostBaht } : {}),
      })),
    })),
  };
}
