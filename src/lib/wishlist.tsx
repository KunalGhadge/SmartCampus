import * as React from "react";
import type { Product } from "@/lib/mock-data";

type WishlistCtx = {
  ids: Set<string>;
  items: Product[];
  count: number;
  has: (id: string) => boolean;
  toggle: (p: Product) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const WishlistContext = React.createContext<WishlistCtx | null>(null);

const STORAGE_KEY = "smartcampus:wishlist:v1";

export function WishlistProvider({
  children,
  products,
}: {
  children: React.ReactNode;
  products: Product[];
}) {
  const [ids, setIds] = React.useState<Set<string>>(() => {
    if (typeof window === "undefined") {
      return new Set();
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter((x) => typeof x === "string"));
    } catch {
      return new Set();
    }
  });

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
    } catch {
      // ignore
    }
  }, [ids]);

  const items = React.useMemo(() => products.filter((p) => ids.has(p.id)), [products, ids]);

  const value = React.useMemo<WishlistCtx>(
    () => ({
      ids,
      items,
      count: ids.size,
      has: (id) => ids.has(id),
      toggle: (p) =>
        setIds((prev) => {
          const next = new Set(prev);
          if (next.has(p.id)) next.delete(p.id);
          else next.add(p.id);
          return next;
        }),
      remove: (id) =>
        setIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }),
      clear: () => setIds(new Set()),
    }),
    [ids, items],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = React.useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
