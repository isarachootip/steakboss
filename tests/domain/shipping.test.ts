import { describe, expect, it } from "vitest";
import { calculateShippingQuote, resolveShippingZone } from "@/domain/shipping";

const DEFAULT_RATES = {
  bkkShipBaht: 60,
  upcShipBaht: 120,
  freeShipThreshold: 990,
  codFeeBaht: 20,
};

describe("shipping domain", () => {
  it("resolves BKK and UPC postal codes accurately", () => {
    expect(resolveShippingZone("10110")).toBe("BKK");
    expect(resolveShippingZone("11120")).toBe("BKK");
    expect(resolveShippingZone("74000")).toBe("BKK");
    expect(resolveShippingZone("14130")).toBe("UPC");
    expect(resolveShippingZone("50000")).toBe("UPC");
    expect(resolveShippingZone("123")).toBeNull();
  });

  it("charges BKK cold-chain rate below free threshold", () => {
    const q = calculateShippingQuote({
      subtotalBaht: 300,
      deliveryMethod: "COLD_CHAIN",
      postalCode: "10110",
      paymentMethod: "PROMPTPAY",
      rates: DEFAULT_RATES,
    });
    expect(q.zone).toBe("BKK");
    expect(q.shippingBaht).toBe(60);
    expect(q.codFeeBaht).toBe(0);
    expect(q.totalBaht).toBe(360);
    expect(q.amountToFreeShipping).toBe(690);
  });

  it("grants free shipping at or above threshold and adds COD fee", () => {
    const q = calculateShippingQuote({
      subtotalBaht: 1000,
      deliveryMethod: "COLD_CHAIN",
      postalCode: "50200",
      paymentMethod: "COD",
      rates: DEFAULT_RATES,
    });
    expect(q.zone).toBe("UPC");
    expect(q.shippingBaht).toBe(0);
    expect(q.codFeeBaht).toBe(20);
    expect(q.totalBaht).toBe(1020);
  });

  it("sets shipping to 0 for factory pickup in Ang Thong", () => {
    const q = calculateShippingQuote({
      subtotalBaht: 259,
      deliveryMethod: "FACTORY_PICKUP",
      paymentMethod: "PROMPTPAY",
      rates: DEFAULT_RATES,
    });
    expect(q.zone).toBe("PICKUP");
    expect(q.shippingBaht).toBe(0);
    expect(q.totalBaht).toBe(259);
  });
});
