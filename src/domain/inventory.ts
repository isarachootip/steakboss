import { multiplyBaht, roundBaht } from "./money";

export interface BundleComponentStock {
  childProductId: string;
  quantity: number;
  childStockQty: number;
  childPriceBaht: number;
  childIsActive?: boolean;
}

export interface ProductStockInput {
  id: string;
  isBundle: boolean;
  isActive: boolean;
  stockQty: number;
  components?: BundleComponentStock[];
}

export interface CartStockLine {
  product: ProductStockInput;
  quantity: number;
}

export interface SkuDeduction {
  productId: string;
  quantity: number;
}

export function computeAvailableStock(product: ProductStockInput): number {
  if (!product.isActive) return 0;
  if (!product.isBundle) {
    return Math.max(0, product.stockQty);
  }
  const components = product.components ?? [];
  if (components.length === 0) return 0;

  let minSets = Number.POSITIVE_INFINITY;
  for (const comp of components) {
    if (comp.childIsActive === false || comp.quantity <= 0) return 0;
    const possibleSets = Math.floor(Math.max(0, comp.childStockQty) / comp.quantity);
    if (possibleSets < minSets) minSets = possibleSets;
  }
  return Number.isFinite(minSets) ? minSets : 0;
}

export function computeBundleSavings(
  bundlePriceBaht: number,
  components: Array<{ quantity: number; childPriceBaht: number }>
): number {
  const regularTotal = components.reduce(
    (sum, c) => roundBaht(sum + multiplyBaht(c.childPriceBaht, c.quantity)),
    0
  );
  return roundBaht(Math.max(0, regularTotal - bundlePriceBaht));
}

export function expandStockDeductions(lines: CartStockLine[]): SkuDeduction[] {
  const totals = new Map<string, number>();

  for (const line of lines) {
    if (line.quantity <= 0) continue;
    if (line.product.isBundle && (line.product.components?.length ?? 0) > 0) {
      for (const comp of line.product.components ?? []) {
        const needed = comp.quantity * line.quantity;
        totals.set(comp.childProductId, (totals.get(comp.childProductId) ?? 0) + needed);
      }
    } else {
      totals.set(
        line.product.id,
        (totals.get(line.product.id) ?? 0) + line.quantity
      );
    }
  }

  return Array.from(totals.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}
