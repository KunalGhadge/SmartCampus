import * as React from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { firestoreDocToProduct } from "@/lib/firestore-listings";
import { products as seedProducts, type Category, type Product } from "@/lib/mock-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fetchSupabaseListings, supabaseRowToProduct, type SupabaseListingRow } from "@/lib/supabase-data";

export const PRODUCT_CATEGORIES: Category[] = [
  "Books",
  "Gadgets",
  "Notes",
  "Electronics",
  "Cycles",
  "Hostel Essentials",
  "Lab Equipment",
  "Furniture",
];

const CATEGORY_ORDER = PRODUCT_CATEGORIES;

export function categorySummaries(products: Product[]): { name: Category; count: number }[] {
  return CATEGORY_ORDER.map((name) => ({
    name,
    count: products.filter((p) => p.category === name).length,
  }));
}

export type CatalogContextValue = {
  products: Product[];
  loading: boolean;
  firestoreLinked: boolean;
  firestoreError: Error | null;
};

const CatalogContext = React.createContext<CatalogContextValue | null>(null);

function mergeCatalog(seed: Product[], remote: Product[]): Product[] {
  const map = new Map(seed.map((p) => [p.id, p]));
  for (const p of remote) {
    map.set(p.id, p);
  }
  return Array.from(map.values());
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [remoteProducts, setRemoteProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [firestoreLinked, setFirestoreLinked] = React.useState(true);
  const [firestoreError, setFirestoreError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;

    // 1. If Supabase is configured, use Supabase as the primary backend with Realtime
    if (isSupabaseConfigured) {
      setLoading(true);
      fetchSupabaseListings()
        .then((items) => {
          setRemoteProducts(items);
          setLoading(false);
          setFirestoreLinked(true);
        })
        .catch((err) => {
          console.error("Supabase listings error:", err);
          setLoading(false);
          setFirestoreError(err instanceof Error ? err : new Error(String(err)));
        });

      const channel = supabase
        .channel("public:listings")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "listings" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newProd = supabaseRowToProduct(payload.new as SupabaseListingRow);
              setRemoteProducts((prev) => [newProd, ...prev.filter((p) => p.id !== newProd.id)]);
            } else if (payload.eventType === "DELETE") {
              const oldId = (payload.old as { id?: string })?.id;
              if (oldId) setRemoteProducts((prev) => prev.filter((p) => p.id !== oldId));
            } else if (payload.eventType === "UPDATE") {
              const updatedProd = supabaseRowToProduct(payload.new as SupabaseListingRow);
              setRemoteProducts((prev) =>
                prev.map((p) => (p.id === updatedProd.id ? updatedProd : p)),
              );
            }
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    // 2. If Firebase is configured, use Firestore
    if (isFirebaseConfigured) {
      setLoading(true);
      const unsub = onSnapshot(
        collection(db, "listings"),
        (snap) => {
          const next: Product[] = [];
          snap.forEach((docSnap) => {
            const p = firestoreDocToProduct(docSnap.id, docSnap.data() as Record<string, unknown>);
            if (p) next.push(p);
          });
          setRemoteProducts(next);
          setLoading(false);
          setFirestoreLinked(true);
          setFirestoreError(null);
        },
        (err) => {
          console.error("Firestore error:", err);
          setRemoteProducts([]);
          setLoading(false);
          setFirestoreLinked(false);
          setFirestoreError(err instanceof Error ? err : new Error(String(err)));
        },
      );

      return unsub;
    }

    // 3. Fallback demo mode
    setLoading(false);
    setFirestoreLinked(false);
    setFirestoreError(null);
    return undefined;
  }, []);

  const products = React.useMemo(() => mergeCatalog(seedProducts, remoteProducts), [remoteProducts]);

  const value = React.useMemo(
    () => ({ products, loading, firestoreLinked, firestoreError }),
    [products, loading, firestoreLinked, firestoreError],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = React.useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
