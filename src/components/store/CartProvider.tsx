"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  evaluateCartPricing,
  type PricingTier,
  type ResolvedCartPriceLine,
} from "@/domain/pricing";

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  priceBaht: number;
  wholesalePriceBaht: number;
  bulkPriceBaht: number | null;
  bulkMinQty: number;
  packSize: number;
  weightGrams: number;
  imgUrl: string;
  quantity: number;
}

export interface AddCartItemInput {
  productId: string;
  slug: string;
  name: string;
  priceBaht: number;
  wholesalePriceBaht?: number;
  bulkPriceBaht?: number | null;
  bulkMinQty?: number;
  packSize?: number;
  weightGrams: number;
  imgUrl: string;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  pricingTier: PricingTier;
  qualifiesWholesale: boolean;
  packsToWholesale: number;
  wholesaleMinPacks: number;
  retailSubtotalBaht: number;
  tierSavingsBaht: number;
  subtotalBaht: number;
  resolvedLines: Record<string, ResolvedCartPriceLine>;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addItem: (item: AddCartItemInput, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  toast: string | null;
}

const STORAGE_KEY = "sb-cart-v3";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  wholesaleMinPacks = 10,
  isWholesaleRole = false,
}: {
  children: ReactNode;
  wholesaleMinPacks?: number;
  isWholesaleRole?: boolean;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CartItem>[];
        setItems(
          parsed
            .filter((x): x is CartItem => Boolean(x.productId && x.name))
            .map((x) => ({
              ...x,
              wholesalePriceBaht: x.wholesalePriceBaht ?? x.priceBaht,
              bulkPriceBaht: x.bulkPriceBaht ?? null,
              bulkMinQty: x.bulkMinQty ?? 0,
              packSize: x.packSize ?? 1,
            }))
        );
      }
    } catch {
      // ignore corrupted storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore quota error
    }
  }, [items, hydrated]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2400);
  }, []);

  const addItem = useCallback(
    (item: AddCartItemInput, qty = 1) => {
      const normalized: Omit<CartItem, "quantity"> = {
        ...item,
        wholesalePriceBaht: item.wholesalePriceBaht ?? item.priceBaht,
        bulkPriceBaht: item.bulkPriceBaht ?? null,
        bulkMinQty: item.bulkMinQty ?? 0,
        packSize: item.packSize ?? 1,
      };
      setItems((prev) => {
        const idx = prev.findIndex((x) => x.productId === normalized.productId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...normalized, quantity: next[idx]!.quantity + qty };
          return next;
        }
        return [...prev, { ...normalized, quantity: qty }];
      });
      showToast(`เพิ่ม ${item.name} ลงตะกร้าแล้ว`);
    },
    [showToast]
  );

  const setQty = useCallback((productId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((x) => x.productId !== productId)
        : prev.map((x) => (x.productId === productId ? { ...x, quantity: qty } : x))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const evalRes = evaluateCartPricing(items, {
      isWholesaleRole,
      wholesaleMinPacks,
    });
    const resolvedLines: Record<string, ResolvedCartPriceLine> = {};
    for (const line of evalRes.lines) {
      resolvedLines[line.productId] = line;
    }
    return {
      items,
      count: evalRes.totalPacks,
      pricingTier: evalRes.pricingTier,
      qualifiesWholesale: evalRes.qualifiesWholesale,
      packsToWholesale: evalRes.packsToWholesale,
      wholesaleMinPacks,
      retailSubtotalBaht: evalRes.retailSubtotalBaht,
      tierSavingsBaht: evalRes.tierSavingsBaht,
      subtotalBaht: evalRes.subtotalBaht,
      resolvedLines,
      drawerOpen,
      setDrawerOpen,
      addItem,
      setQty,
      clearCart,
      toast,
    };
  }, [items, isWholesaleRole, wholesaleMinPacks, drawerOpen, addItem, setQty, clearCart, toast]);

  return (
    <CartContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="status"
          className="fixed left-1/2 bottom-6 -translate-x-1/2 z-50 rounded-full bg-sb-ink text-sb-bg px-5 py-2.5 text-sm font-bold shadow-2xl"
        >
          {toast}
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
