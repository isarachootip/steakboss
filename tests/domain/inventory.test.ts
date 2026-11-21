import { describe, expect, it } from "vitest";
import {
  computeAvailableStock,
  computeBundleSavings,
  expandStockDeductions,
} from "@/domain/inventory";

describe("inventory & bundle domain", () => {
  const bundleProduct = {
    id: "set",
    isBundle: true,
    isActive: true,
    stockQty: 0,
    components: [
      { childProductId: "kp", quantity: 1, childStockQty: 12, childPriceBaht: 89 },
      { childProductId: "pork", quantity: 1, childStockQty: 5, childPriceBaht: 69 },
      { childProductId: "chk", quantity: 1, childStockQty: 20, childPriceBaht: 69 },
      { childProductId: "clean", quantity: 1, childStockQty: 8, childPriceBaht: 59 },
    ],
  };

  it("computes bundle available stock from bottleneck child SKU", () => {
    expect(computeAvailableStock(bundleProduct)).toBe(5);
  });

  it("returns 0 when any child component is inactive or empty", () => {
    const inactiveBundle = {
      ...bundleProduct,
      components: [
        ...bundleProduct.components.slice(0, 3),
        { childProductId: "clean", quantity: 1, childStockQty: 8, childPriceBaht: 59, childIsActive: false },
      ],
    };
    expect(computeAvailableStock(inactiveBundle)).toBe(0);
  });

  it("computes savings of best-seller 4-pack accurately", () => {
    expect(computeBundleSavings(259, bundleProduct.components)).toBe(27);
  });

  it("aggregates stock deductions across mixed single + bundle cart lines", () => {
    const kpProduct = { id: "kp", isBundle: false, isActive: true, stockQty: 12 };
    const deductions = expandStockDeductions([
      { product: kpProduct, quantity: 2 },
      { product: bundleProduct, quantity: 3 },
    ]);
    const map = new Map(deductions.map((d) => [d.productId, d.quantity]));
    expect(map.get("kp")).toBe(5);
    expect(map.get("pork")).toBe(3);
    expect(map.get("chk")).toBe(3);
    expect(map.get("clean")).toBe(3);
  });
});
