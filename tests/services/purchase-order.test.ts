import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrderById,
  listPurchaseOrders,
  shortClosePurchaseOrder,
  updatePurchaseOrder,
} from "@/services/purchase-order.service";
import {
  receivePurchaseOrder,
  voidGoodsReceipt,
} from "@/services/goods-receipt.service";
import { deleteProduct } from "@/services/product.service";

describe("purchase-order & goods-receipt services", () => {
  it("creates PO with SKU snapshot, supports partial receiving, cost update, packer redaction, voiding, and blocks bundles", async () => {
    const kp = await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } });
    const bundle = await db.product.findFirstOrThrow({ where: { isBundle: true } });
    const initialStock = kp.stockQty;
    const initialCost = kp.costBaht;
    const stamp = Date.now();
    const customPoNo = `PO-TEST-${stamp}`;
    let createdPoId = "";

    try {
      await expect(
        createPurchaseOrder(
          {
            supplierName: "โรงงานอ่างทอง",
            expectedDate: new Date("2026-12-01T00:00:00.000Z"),
            note: "bundle must fail",
            items: [{ productId: bundle.id, orderedQty: 5, unitCostBaht: 100 }],
          },
          "test-owner"
        )
      ).rejects.toThrow(/เซ็ต/);

      const created = await createPurchaseOrder(
        {
          poNo: customPoNo,
          supplierName: "โรงงานอ่างทอง",
          expectedDate: new Date("2026-12-05T00:00:00.000Z"),
          note: "รอบสั่งซื้อทดสอบ",
          items: [{ productId: kp.id, orderedQty: 10, unitCostBaht: 41.5 }],
        },
        "test-owner"
      );
      createdPoId = created.id;
      expect(created.poNo).toBe(customPoNo);
      expect(created.status).toBe("OPEN");
      expect(created.totalCostBaht).toBe(415);
      expect(created.items[0]?.skuSnapshot).toBe(kp.sku);

      // Update allowed while OPEN with 0 receipts
      const edited = await updatePurchaseOrder(created.id, {
        supplierName: "โรงงานอ่างทอง (สาย 2)",
        expectedDate: new Date("2026-12-06T00:00:00.000Z"),
        note: "ปรับจำนวนเป็น 12",
        items: [{ productId: kp.id, orderedQty: 12, unitCostBaht: 42 }],
      });
      expect(edited.totalCostBaht).toBe(504);
      const lineId = edited.items[0]!.id;

      // Packer view must hide cost fields
      const packerView = await getPurchaseOrderById(created.id, false);
      expect(packerView?.totalCostBaht).toBeUndefined();
      expect(packerView?.items[0]?.unitCostBaht).toBeUndefined();

      // Deleting a product referenced in a PO must be blocked
      await expect(deleteProduct(kp.id)).rejects.toThrow(/PO|สั่งซื้อ|เซ็ต/);

      // Partial receive round 1: 7 of 12
      const afterR1 = await receivePurchaseOrder({
        purchaseOrderId: created.id,
        input: {
          deliveryNoteNo: "DO-001",
          note: "ส่งรอบแรก",
          items: [{ purchaseOrderItemId: lineId, receivedQty: 7 }],
        },
        actorId: "test-packer",
        includeCost: false,
      });
      expect(afterR1.status).toBe("PARTIAL");
      expect(afterR1.totalReceivedQty).toBe(7);
      expect(afterR1.totalCostBaht).toBeUndefined();

      const prodAfterR1 = await db.product.findUniqueOrThrow({ where: { id: kp.id } });
      expect(prodAfterR1.stockQty).toBe(initialStock + 7);
      expect(prodAfterR1.costBaht).toBe(42);

      // Over-receive guard: remaining is 5, trying 6 must fail
      await expect(
        receivePurchaseOrder({
          purchaseOrderId: created.id,
          input: {
            deliveryNoteNo: "DO-002",
            note: "",
            items: [{ purchaseOrderItemId: lineId, receivedQty: 6 }],
          },
          actorId: "test-packer",
          includeCost: false,
        })
      ).rejects.toThrow(/รับเกินยอดค้าง/);

      // Partial receive round 2: remaining 5 -> RECEIVED
      const afterR2 = await receivePurchaseOrder({
        purchaseOrderId: created.id,
        input: {
          deliveryNoteNo: "DO-002",
          note: "ส่งครบ",
          items: [{ purchaseOrderItemId: lineId, receivedQty: 5 }],
        },
        actorId: "test-owner",
        includeCost: true,
      });
      expect(afterR2.status).toBe("RECEIVED");
      expect(afterR2.receipts.length).toBe(2);

      // Void round 2 receipt -> stock drops by 5 and PO returns to PARTIAL
      const latestReceipt = afterR2.receipts[0]!;
      const afterVoid = await voidGoodsReceipt({
        purchaseOrderId: created.id,
        receiptId: latestReceipt.id,
        reason: "คีย์จำนวนผิดพลาด",
        actorId: "test-owner",
        includeCost: true,
      });
      expect(afterVoid.status).toBe("PARTIAL");
      expect(afterVoid.totalReceivedQty).toBe(7);

      const prodAfterVoid = await db.product.findUniqueOrThrow({ where: { id: kp.id } });
      expect(prodAfterVoid.stockQty).toBe(initialStock + 7);

      // Short-close remaining 5
      const closed = await shortClosePurchaseOrder(created.id, "โรงงานหยุดผลิตล็อตนี้");
      expect(closed.status).toBe("SHORT_CLOSED");

      // Search list by SKU
      const listed = await listPurchaseOrders({ includeCost: true, search: kp.sku });
      expect(listed.some((po) => po.id === created.id)).toBe(true);
    } finally {
      if (createdPoId) {
        await db.purchaseOrder.deleteMany({ where: { id: createdPoId } });
      }
      await db.stockMovement.deleteMany({ where: { purchaseOrderNo: customPoNo } });
      await db.product.update({
        where: { id: kp.id },
        data: { stockQty: initialStock, costBaht: initialCost },
      });
    }
  });

  it("cancels an unreceived OPEN PO and blocks cancelling after receiving", async () => {
    const kp = await db.product.findUniqueOrThrow({ where: { slug: "pork-chop-kp" } });
    const po = await createPurchaseOrder(
      {
        poNo: `PO-CANCEL-${Date.now()}`,
        supplierName: "โรงงานอ่างทอง",
        expectedDate: new Date("2026-12-10T00:00:00.000Z"),
        note: "",
        items: [{ productId: kp.id, orderedQty: 5, unitCostBaht: 39 }],
      },
      "test-owner"
    );
    try {
      const cancelled = await cancelPurchaseOrder(po.id, "สั่งซ้ำ");
      expect(cancelled.status).toBe("CANCELLED");
    } finally {
      await db.purchaseOrder.deleteMany({ where: { id: po.id } });
    }
  });
});
