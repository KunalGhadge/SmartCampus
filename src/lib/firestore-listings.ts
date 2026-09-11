import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  createSupabaseListing,
  supabaseRowToProduct,
  type SupabaseListingRow,
} from "@/lib/supabase-data";
import type { Category, Product } from "@/lib/mock-data";

const CATEGORY_SET = new Set<string>([
  "Books",
  "Gadgets",
  "Notes",
  "Electronics",
  "Cycles",
  "Hostel Essentials",
  "Lab Equipment",
  "Furniture",
]);

const CONDITIONS = new Set(["New", "Like New", "Good", "Fair"]);

function asCategory(value: unknown): Category {
  if (typeof value === "string" && CATEGORY_SET.has(value)) {
    return value as Category;
  }
  return "Books";
}

function asCondition(value: unknown): Product["condition"] {
  if (typeof value === "string" && CONDITIONS.has(value)) {
    return value as Product["condition"];
  }
  return "Good";
}

export function relativePostedLabel(isoOrTimestamp?: Timestamp | Date | string | null): string {
  if (!isoOrTimestamp) return "Just now";
  let d: Date;
  if (isoOrTimestamp instanceof Date) {
    d = isoOrTimestamp;
  } else if (typeof isoOrTimestamp === "string") {
    d = new Date(isoOrTimestamp);
  } else if (typeof isoOrTimestamp === "object" && "toDate" in isoOrTimestamp) {
    d = (isoOrTimestamp as Timestamp).toDate();
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

export function firestoreDocToProduct(
  docId: string,
  data: Record<string, unknown>,
): Product | null {
  const title = typeof data.title === "string" ? data.title : "";
  const price = typeof data.price === "number" && Number.isFinite(data.price) ? data.price : NaN;
  const image = typeof data.image === "string" ? data.image : "";
  if (!title.trim() || !Number.isFinite(price) || !image.trim()) {
    return null;
  }

  const sellerName = typeof data.sellerName === "string" ? data.sellerName : "Student";
  const sellerCollege = typeof data.sellerCollege === "string" ? data.sellerCollege : "Campus";
  const sellerAvatar =
    typeof data.sellerAvatar === "string" && data.sellerAvatar
      ? data.sellerAvatar
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(docId)}`;

  const createdAt =
    data.createdAt && typeof data.createdAt === "object" && "toDate" in (data.createdAt as object)
      ? (data.createdAt as Timestamp).toDate()
      : typeof data.createdAtIso === "string"
        ? new Date(data.createdAtIso)
        : undefined;

  const product: Product = {
    id: docId,
    title: title.trim(),
    sellerId: typeof data.sellerId === "string" ? data.sellerId : undefined,
    price,
    originalPrice: typeof data.originalPrice === "number" ? data.originalPrice : undefined,
    category: asCategory(data.category),
    condition: asCondition(data.condition),
    image,
    images: Array.isArray(data.images)
      ? data.images.filter((x): x is string => typeof x === "string")
      : undefined,
    seller: {
      name: sellerName,
      college: sellerCollege,
      verified: Boolean(data.sellerVerified),
      rating: typeof data.sellerRating === "number" ? data.sellerRating : 5,
      avatar: sellerAvatar,
    },
    description: typeof data.description === "string" ? data.description : "",
    shortDescription: typeof data.shortDescription === "string" ? data.shortDescription : undefined,
    negotiable: Boolean(data.negotiable),
    pickupLocation: typeof data.pickupLocation === "string" ? data.pickupLocation : undefined,
    department: typeof data.department === "string" ? data.department : undefined,
    specs: Array.isArray(data.specs)
      ? data.specs.filter((x): x is string => typeof x === "string")
      : undefined,
    tags: Array.isArray(data.tags)
      ? data.tags.filter((x): x is string => typeof x === "string")
      : undefined,
    availability:
      data.availability === "Available" ||
      data.availability === "Reserved" ||
      data.availability === "Sold"
        ? data.availability
        : "Available",
    forRent: Boolean(data.forRent),
    rentPerDay: typeof data.rentPerDay === "number" ? data.rentPerDay : undefined,
    postedAgo: relativePostedLabel(createdAt ?? null),
  };

  return product;
}

export async function createListing(payload: ListingDocPayload): Promise<string> {
  if (isSupabaseConfigured) {
    const id = await createSupabaseListing({
      ...payload,
      availability: payload.availability ?? "Available",
      sellerVerified: payload.sellerVerified ?? false,
      sellerRating: payload.sellerRating ?? 5,
    });
    if (id) return id;
  }

  if (isFirebaseConfigured) {
    const docRef = await addDoc(collection(db, "listings"), {
      ...payload,
      availability: payload.availability ?? "Available",
      sellerVerified: payload.sellerVerified ?? false,
      sellerRating: payload.sellerRating ?? 5,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  // Local fallback ID
  return `mock-${Date.now()}`;
}

export async function fetchListingsBySeller(sellerId: string): Promise<Product[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return (data as SupabaseListingRow[]).map(supabaseRowToProduct);
    }
  }

  if (isFirebaseConfigured) {
    const q = query(collection(db, "listings"), where("sellerId", "==", sellerId));
    const snap = await getDocs(q);
    const rows = snap.docs.map((docSnap) => {
      const raw = docSnap.data() as Record<string, unknown> & { createdAt?: Timestamp };
      const createdMs =
        raw.createdAt && typeof raw.createdAt.toMillis === "function" ? raw.createdAt.toMillis() : 0;
      return {
        id: docSnap.id,
        raw,
        createdMs,
      };
    });
    rows.sort((a, b) => b.createdMs - a.createdMs);
    return rows
      .map((r) => firestoreDocToProduct(r.id, r.raw))
      .filter((p): p is Product => p !== null);
  }

  return [];
}
