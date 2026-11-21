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

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  priceBaht: number;
  weightGrams: number;
  imgUrl: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotalBaht: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  toast: string | null;
}

const STORAGE_KEY = "sb-cart-v2";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
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
    (item: Omit<CartItem, "quantity">, qty = 1) => {
      setItems((prev) => {
        const idx = prev.findIndex((x) => x.productId === item.productId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx]!, quantity: next[idx]!.quantity + qty };
          return next;
        }
        return [...prev, { ...item, quantity: qty }];
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

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((s, x) => s + x.quantity, 0),
      subtotalBaht: items.reduce((s, x) => s + x.priceBaht * x.quantity, 0),
      drawerOpen,
      setDrawerOpen,
      addItem,
      setQty,
      clearCart,
      toast,
    }),
    [items, drawerOpen, addItem, setQty, clearCart, toast]
  );

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
