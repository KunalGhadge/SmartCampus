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
  deleteRequest: (requestId: string) => Promise<boolean>;
  refreshRequests: () => Promise<void>;
};

const ItemRequestsContext = React.createContext<ItemRequestsContextValue | null>(null);

export function ItemRequestsProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = React.useState<ItemRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const refreshRequests = React.useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const items = await fetchSupabaseItemRequests();
      setLive(items);
      setError(null);
    } catch (err) {
      console.error("Supabase item requests refresh error:", err);
    }
  }, []);

  const deleteRequest = React.useCallback(async (requestId: string): Promise<boolean> => {
    if (!isSupabaseConfigured || !requestId) return false;
    try {
      const { error: delErr } = await supabase
        .from("item_requests")
        .delete()
        .eq("id", requestId);
      if (delErr) {
        console.error("Error deleting item request:", delErr);
        return false;
      }
      setLive((prev) => prev.filter((r) => r.id !== requestId));
      return true;
    } catch (err) {
      console.error("Failed to delete request:", err);
      return false;
    }
  }, []);

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

  const requests = live;

  const value = React.useMemo<ItemRequestsContextValue>(
    () => ({
      requests,
      liveFromFirestore: live.length,
      loading,
      error,
      deleteRequest,
      refreshRequests,
    }),
    [requests, live.length, loading, error, deleteRequest, refreshRequests],
  );

  return <ItemRequestsContext.Provider value={value}>{children}</ItemRequestsContext.Provider>;
}

export function useCampusItemRequests() {
  const ctx = React.useContext(ItemRequestsContext);
  if (!ctx) throw new Error("useCampusItemRequests must be used within ItemRequestsProvider");
  return ctx;
}
