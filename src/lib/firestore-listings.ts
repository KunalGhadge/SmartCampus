import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  createSupabaseListing,
  fetchSupabaseListings,
  supabaseRowToProduct,
  type SupabaseListingRow,
} from "@/lib/supabase-data";
import type { Category, Product } from "@/lib/mock-data";

export function relativePostedLabel(isoOrDate?: Date | string | null): string {
  if (!isoOrDate) return "Just now";
  let d: Date;
  if (isoOrDate instanceof Date) {
    d = isoOrDate;
  } else if (typeof isoOrDate === "string") {
    d = new Date(isoOrDate);
  } else {
    return "Recently";
  }
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)} days ago`;
  return d.toLocaleDateString();
}

export type ListingDocPayload = {
  title: string;
  price: number;
  category: Category;
  condition: Product["condition"];
  image: string;
  description: string;
  shortDescription?: string;
  originalPrice?: number;
  negotiable?: boolean;
  pickupLocation?: string;
  department?: string;
  availability?: Product["availability"];
  forRent?: boolean;
  rentPerDay?: number;
  specs?: string[];
  tags?: string[];
  images?: string[];
  sellerId: string;
  sellerName: string;
  sellerCollege: string;
  sellerVerified?: boolean;
  sellerRating?: number;
  sellerAvatar?: string;
};

export async function createListing(payload: ListingDocPayload): Promise<string> {
  const id = await createSupabaseListing(payload);
  return id || `listing-${Date.now()}`;
}

export async function fetchListingsBySeller(sellerId: string): Promise<Product[]> {
  if (!isSupabaseConfigured || !sellerId) return [];

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching seller listings from Supabase:", error);
    return [];
  }

  return (data as SupabaseListingRow[]).map(supabaseRowToProduct);
}

export function subscribeMarketplaceListings(
  onNext: (products: Product[]) => void,
  onError?: (e: Error) => void,
): () => void {
  if (!isSupabaseConfigured) {
    onNext([]);
    return () => {};
  }

  void fetchSupabaseListings().then(onNext).catch((err) => {
    onError?.(err instanceof Error ? err : new Error(String(err)));
  });

  const channel = supabase
    .channel("marketplace-listings-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "listings" },
      () => {
        void fetchSupabaseListings().then(onNext).catch(onError);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
