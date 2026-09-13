import * as React from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  fetchSupabaseItemRequests,
  supabaseRowToItemRequest,
  type SupabaseItemRequestRow,
} from "@/lib/supabase-data";
import { itemRequests as seedRequests, type ItemRequest } from "@/lib/mock-data";

export type ItemRequestsContextValue = {
  requests: ItemRequest[];
  liveFromFirestore: number;
  loading: boolean;
  error: Error | null;
};

const ItemRequestsContext = React.createContext<ItemRequestsContextValue | null>(null);

export function ItemRequestsProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = React.useState<ItemRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;

    if (isSupabaseConfigured) {
      setLoading(true);
      fetchSupabaseItemRequests()
        .then((items) => {
          setLive(items);
          setLoading(false);
          setError(null);
        })
        .catch((err) => {
          console.error("Supabase item requests error:", err);
          setLive([]);
          setLoading(false);
          setError(err instanceof Error ? err : new Error(String(err)));
        });

      const channel = supabase
        .channel("public:item_requests")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "item_requests" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newReq = supabaseRowToItemRequest(payload.new as SupabaseItemRequestRow);
              setLive((prev) => [newReq, ...prev.filter((r) => r.id !== newReq.id)]);
            } else if (payload.eventType === "DELETE") {
              const oldId = (payload.old as { id?: string })?.id;
              if (oldId) setLive((prev) => prev.filter((r) => r.id !== oldId));
            } else if (payload.eventType === "UPDATE") {
              const updatedReq = supabaseRowToItemRequest(payload.new as SupabaseItemRequestRow);
              setLive((prev) =>
                prev.map((r) => (r.id === updatedReq.id ? updatedReq : r)),
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
    setError(null);
    return undefined;
  }, []);

  const requests = React.useMemo(() => {
    const ids = new Set(live.map((r) => r.id));
    const filler = seedRequests.filter((s) => !ids.has(s.id));
    return [...live, ...filler];
  }, [live]);

  const value = React.useMemo<ItemRequestsContextValue>(
    () => ({ requests, liveFromFirestore: live.length, loading, error }),
    [requests, live.length, loading, error],
  );

  return <ItemRequestsContext.Provider value={value}>{children}</ItemRequestsContext.Provider>;
}

export function useCampusItemRequests() {
  const ctx = React.useContext(ItemRequestsContext);
  if (!ctx) throw new Error("useCampusItemRequests must be used within ItemRequestsProvider");
  return ctx;
}
