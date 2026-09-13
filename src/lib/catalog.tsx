import * as React from "react";
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

    setLoading(false);
    return undefined;
  }, []);

  const merged = React.useMemo(
    () => mergeCatalog(seedProducts, remoteProducts),
    [remoteProducts],
  );

  const value = React.useMemo(
    () => ({
      products: merged,
      loading,
      firestoreLinked,
      firestoreError,
    }),
    [merged, loading, firestoreLinked, firestoreError],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = React.useContext(CatalogContext);
  if (!ctx) {
    throw new Error("useCatalog must be used within CatalogProvider");
  }
  return ctx;
}
