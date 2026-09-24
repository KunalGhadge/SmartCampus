import { supabase, isSupabaseConfigured } from "./supabase";
import type { Category, ItemRequest, Product } from "./mock-data";
import { relativePostedLabel } from "./firestore-listings";

export interface SupabaseListingRow {
  id: string;
  title: string;
  price: number;
  original_price?: number | null;
  category: string;
  condition: string;
  image: string;
  images?: string[] | null;
  description?: string | null;
  short_description?: string | null;
  negotiable?: boolean | null;
  pickup_location?: string | null;
  department?: string | null;
  campus?: string | null;
  availability?: string | null;
  for_rent?: boolean | null;
  rent_per_day?: number | null;
  specs?: string[] | null;
  tags?: string[] | null;
  seller_id?: string | null;
  seller_name?: string | null;
  seller_college?: string | null;
  seller_avatar?: string | null;
  seller_verified?: boolean | null;
  seller_rating?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export function supabaseRowToProduct(row: SupabaseListingRow): Product {
  return {
    id: row.id,
    title: row.title,
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    category: (row.category as Category) || "Books",
    condition: (row.condition as Product["condition"]) || "Good",
    image: row.image,
    images: row.images ?? undefined,
    description: row.description || "",
    shortDescription: row.short_description || undefined,
    negotiable: Boolean(row.negotiable),
    pickupLocation: row.pickup_location || undefined,
    department: row.department || undefined,
    availability: (row.availability as Product["availability"]) || "Available",
    forRent: Boolean(row.for_rent),
    rentPerDay: row.rent_per_day ? Number(row.rent_per_day) : undefined,
    specs: row.specs ?? undefined,
    tags: row.tags ?? undefined,
    sellerId: row.seller_id || undefined,
    postedAgo: relativePostedLabel(row.created_at),
    seller: {
      name: row.seller_name || "Student",
      college: row.seller_college || row.campus || "Campus",
      verified: Boolean(row.seller_verified),
      rating: row.seller_rating ? Number(row.seller_rating) : 5.0,
      avatar:
        row.seller_avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.id)}`,
    },
  };
}

export async function fetchSupabaseListings(): Promise<Product[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching Supabase listings:", error);
    return [];
  }

  return (data as SupabaseListingRow[]).map(supabaseRowToProduct);
}

export async function createSupabaseListing(payload: {
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
}): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from("listings")
    .insert({
      title: payload.title,
      price: payload.price,
      original_price: payload.originalPrice,
      category: payload.category,
      condition: payload.condition,
      image: payload.image,
      images: payload.images ?? [],
      description: payload.description,
      short_description: payload.shortDescription,
      negotiable: payload.negotiable,
      pickup_location: payload.pickupLocation,
      department: payload.department,
      availability: payload.availability || "Available",
      for_rent: payload.forRent,
      rent_per_day: payload.rentPerDay,
      specs: payload.specs ?? [],
      tags: payload.tags ?? [],
      seller_id: payload.sellerId,
      seller_name: payload.sellerName,
      seller_college: payload.sellerCollege,
      seller_verified: payload.sellerVerified,
      seller_rating: payload.sellerRating,
      seller_avatar: payload.sellerAvatar,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating Supabase listing:", error);
    throw error;
  }

  return data?.id || null;
}

export async function updateSupabaseListingStatus(
  id: string,
  availability: "Available" | "Reserved" | "Sold",
): Promise<boolean> {
  if (!isSupabaseConfigured || !id) return true;

  const { error } = await supabase
    .from("listings")
    .update({ availability, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error updating listing status in Supabase:", error);
    return false;
  }

  return true;
}

export async function deleteSupabaseListing(id: string): Promise<boolean> {
  if (!isSupabaseConfigured || !id) return true;

  const { error } = await supabase.from("listings").delete().eq("id", id);

  if (error) {
    console.error("Error deleting listing in Supabase:", error);
    return false;
  }

  return true;
}

export async function fetchSupabaseListingById(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured || !id) return null;

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return supabaseRowToProduct(data as SupabaseListingRow);
}

export interface SupabaseItemRequestRow {
  id: string;
  item_name: string;
  category: string;
  budget_min: number;
  budget_max: number;
  condition: string;
  description?: string | null;
  urgency: string;
  campus?: string | null;
  department?: string | null;
  student_name?: string | null;
  student_avatar?: string | null;
  student_verified?: boolean | null;
  author_id?: string | null;
  created_at: string;
}

export function supabaseRowToItemRequest(row: SupabaseItemRequestRow): ItemRequest {
  return {
    id: row.id,
    itemName: row.item_name,
    category: (row.category as Category) || "Books",
    budgetMin: Number(row.budget_min),
    budgetMax: Number(row.budget_max),
    condition: row.condition || "Any",
    description: row.description || "",
    urgency: (row.urgency as ItemRequest["urgency"]) || "Medium",
    campus: row.campus || "",
    department: row.department || "",
    postedAgo: relativePostedLabel(row.created_at),
    student: {
      name: row.student_name || "Student",
      avatar:
        row.student_avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.id)}`,
      verified: Boolean(row.student_verified),
    },
  };
}

export async function fetchSupabaseItemRequests(): Promise<ItemRequest[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("item_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching Supabase item requests:", error);
    return [];
  }

  return (data as SupabaseItemRequestRow[]).map(supabaseRowToItemRequest);
}

export async function createSupabaseItemRequest(payload: {
  itemName: string;
  category: Category;
  budgetMin: number;
  budgetMax: number;
  condition: string;
  description: string;
  urgency: ItemRequest["urgency"];
  campus: string;
  department: string;
  studentName: string;
  studentAvatar?: string;
  studentVerified?: boolean;
  authorUid: string;
}): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from("item_requests")
    .insert({
      item_name: payload.itemName,
      category: payload.category,
      budget_min: payload.budgetMin,
      budget_max: payload.budgetMax,
      condition: payload.condition,
      description: payload.description,
      urgency: payload.urgency,
      campus: payload.campus,
      department: payload.department,
      student_name: payload.studentName,
      student_avatar: payload.studentAvatar,
      student_verified: payload.studentVerified,
      author_id: payload.authorUid,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating Supabase item request:", error);
    throw error;
  }

  return data?.id || null;
}

export async function fetchSupabaseUserItemRequests(authorUid: string): Promise<ItemRequest[]> {
  if (!isSupabaseConfigured || !authorUid) return [];
  const { data, error } = await supabase
    .from("item_requests")
    .select("*")
    .eq("author_id", authorUid)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user item requests:", error);
    return [];
  }

  return (data as SupabaseItemRequestRow[]).map(supabaseRowToItemRequest);
}

export async function deleteSupabaseItemRequest(requestId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !requestId) return false;
  const { error } = await supabase
    .from("item_requests")
    .delete()
    .eq("id", requestId);

  if (error) {
    console.error("Error deleting item request:", error);
    return false;
  }
  return true;
}

export async function uploadImageToSupabase(
  bucket: "listing-images" | "avatars",
  file: File,
  path?: string,
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  const fileName = path || `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error } = await supabase.storage.from(bucket).upload(fileName, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    console.error(`Error uploading image to Supabase ${bucket}:`, error);
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

export interface SupabaseProfileRow {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  college?: string | null;
  campus?: string | null;
  department?: string | null;
  graduation_year?: string | null;
  avatar_url?: string | null;
  email_verified?: boolean | null;
  verified?: boolean | null;
  trust_score?: number | null;
  badges?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const SEEDED_CAMPUS_PEERS = [
  {
    firebaseUid: "a1111111-0000-4000-a000-000000000001",
    displayName: "Rhea Kulkarni",
    displayNameLower: "rhea kulkarni",
    campusKey: "MGM CET (Engineering)",
    college: "MGM CET (Engineering)",
    department: "Computer Engineering (CSE)",
    graduationYear: "2025",
    trustScore: 98,
    badges: ["Student", "Verified Member", "Top Seller"],
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=RheaKulkarni",
    emailVerified: true,
  },
  {
    firebaseUid: "a1111111-0000-4000-a000-000000000002",
    displayName: "Yash Tiwari",
    displayNameLower: "yash tiwari",
    campusKey: "MGM CET (Engineering)",
    college: "MGM CET (Engineering)",
    department: "Information Technology (IT)",
    graduationYear: "2026",
    trustScore: 95,
    badges: ["Student", "Verified Member"],
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=YashTiwari",
    emailVerified: true,
  },
  {
    firebaseUid: "a1111111-0000-4000-a000-000000000003",
    displayName: "Mihir Jain",
    displayNameLower: "mihir jain",
    campusKey: "MGM CET (Engineering)",
    college: "MGM CET (Engineering)",
    department: "Artificial Intelligence & Data Science",
    graduationYear: "2026",
    trustScore: 92,
    badges: ["Student", "Tech Enthusiast"],
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=MihirJain",
    emailVerified: true,
  },
  {
    firebaseUid: "a1111111-0000-4000-a000-000000000004",
    displayName: "Devansh Kapoor",
    displayNameLower: "devansh kapoor",
    campusKey: "MGM CET (Engineering)",
    college: "MGM CET (Engineering)",
    department: "Mechanical Engineering",
    graduationYear: "2025",
    trustScore: 96,
    badges: ["Student", "Verified Member"],
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=DevanshKapoor",
    emailVerified: true,
  },
  {
    firebaseUid: "a1111111-0000-4000-a000-000000000005",
    displayName: "Sana Thomas",
    displayNameLower: "sana thomas",
    campusKey: "MGM Institute of Management",
    college: "MGM Institute of Management",
    department: "MBA / Management Studies",
    graduationYear: "2025",
    trustScore: 99,
    badges: ["Student", "Campus Leader"],
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=SanaThomas",
    emailVerified: true,
  },
  {
    firebaseUid: "a1111111-0000-4000-a000-000000000006",
    displayName: "Ananya Sharma",
    displayNameLower: "ananya sharma",
    campusKey: "MGM CET (Engineering)",
    college: "MGM CET (Engineering)",
    department: "Electronics & Telecom (EXTC)",
    graduationYear: "2026",
    trustScore: 94,
    badges: ["Student", "Verified Member"],
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=AnanyaSharma",
    emailVerified: true,
  },
  {
    firebaseUid: "a1111111-0000-4000-a000-000000000007",
    displayName: "Ishaan Verma",
    displayNameLower: "ishaan verma",
    campusKey: "MGM College of CS & IT",
    college: "MGM College of CS & IT",
    department: "Architecture",
    graduationYear: "2027",
    trustScore: 91,
    badges: ["Student"],
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=IshaanVerma",
    emailVerified: true,
  },
  {
    firebaseUid: "a1111111-0000-4000-a000-000000000008",
    displayName: "Tanvi Patel",
    displayNameLower: "tanvi patel",
    campusKey: "MGM University",
    college: "MGM University",
    department: "Biotechnology",
    graduationYear: "2026",
    trustScore: 97,
    badges: ["Student", "Verified Member"],
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=TanviPatel",
    emailVerified: true,
  },
  {
    firebaseUid: "a1111111-0000-4000-a000-000000000009",
    displayName: "Rohan Das",
    displayNameLower: "rohan das",
    campusKey: "MGM CET (Engineering)",
    college: "MGM CET (Engineering)",
    department: "Civil Engineering",
    graduationYear: "2025",
    trustScore: 93,
    badges: ["Student"],
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=RohanDas",
    emailVerified: true,
  },
  {
    firebaseUid: "a1111111-0000-4000-a000-000000000010",
    displayName: "Sneha Rao",
    displayNameLower: "sneha rao",
    campusKey: "MGM CET (Engineering)",
    college: "MGM CET (Engineering)",
    department: "Computer Engineering (CSE)",
    graduationYear: "2026",
    trustScore: 99,
    badges: ["Student", "Verified Member", "Power Seller"],
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=SnehaRao",
    emailVerified: true,
  },
  {
    firebaseUid: "a1111111-0000-4000-a000-000000000011",
    displayName: "Aditya Joshi",
    displayNameLower: "aditya joshi",
    campusKey: "MGM CET (Engineering)",
    college: "MGM CET (Engineering)",
    department: "Chemical Engineering",
    graduationYear: "2025",
    trustScore: 90,
    badges: ["Student"],
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=AdityaJoshi",
    emailVerified: true,
  },
  {
    firebaseUid: "a1111111-0000-4000-a000-000000000012",
    displayName: "Kabir Shah",
    displayNameLower: "kabir shah",
    campusKey: "MGM CET (Engineering)",
    college: "MGM CET (Engineering)",
    department: "Information Technology (IT)",
    graduationYear: "2026",
    trustScore: 95,
    badges: ["Student", "Verified Member"],
    photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=KabirShah",
    emailVerified: true,
  },
];

export async function fetchSupabaseProfiles(): Promise<
  {
    firebaseUid: string;
    displayName: string;
    displayNameLower: string;
    campusKey: string;
    college?: string | null;
    department?: string | null;
    graduationYear?: string | null;
    trustScore?: number | null;
    badges?: string[] | null;
    photoUrl: string | null;
    emailVerified: boolean;
    createdAt?: string | null;
  }[]
> {
  if (!isSupabaseConfigured) return SEEDED_CAMPUS_PEERS;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .limit(200);

    if (error || !data || data.length === 0) {
      return SEEDED_CAMPUS_PEERS;
    }

    type ProfileItem = {
      firebaseUid: string;
      displayName: string;
      displayNameLower: string;
      campusKey: string;
      college?: string | null;
      department?: string | null;
      graduationYear?: string | null;
      trustScore?: number | null;
      badges?: string[] | null;
      photoUrl: string | null;
      emailVerified: boolean;
      createdAt?: string | null;
    };

    const dbProfiles: ProfileItem[] = (data as SupabaseProfileRow[]).map((p) => {
      const name = p.display_name || p.full_name || p.email?.split("@")[0] || "Student";
      return {
        firebaseUid: p.id,
        displayName: name,
        displayNameLower: name.toLowerCase(),
        campusKey: p.campus || p.college || "MGM CET (Engineering)",
        college: p.college || p.campus || "MGM CET (Engineering)",
        department: p.department || "General",
        graduationYear: p.graduation_year || "2026",
        trustScore: p.trust_score ?? 95,
        badges: p.badges && p.badges.length > 0 ? p.badges : ["Student", "Verified Member"],
        photoUrl: p.avatar_url || null,
        emailVerified: Boolean(p.email_verified),
        createdAt: p.created_at || null,
      };
    });

    const knownIds = new Set(dbProfiles.map((p) => p.firebaseUid));
    const merged: ProfileItem[] = [...dbProfiles];
    for (const seed of SEEDED_CAMPUS_PEERS) {
      if (!knownIds.has(seed.firebaseUid)) {
        merged.push(seed);
      }
    }

    return merged;
  } catch {
    return SEEDED_CAMPUS_PEERS;
  }
}

export async function fetchSupabaseProfileById(uid: string): Promise<{
  firebaseUid: string;
  displayName: string;
  displayNameLower: string;
  campusKey: string;
  college?: string | null;
  department?: string | null;
  graduationYear?: string | null;
  trustScore?: number | null;
  badges?: string[] | null;
  photoUrl: string | null;
  emailVerified: boolean;
  createdAt?: string | null;
} | null> {
  if (!uid) return null;

  if (!isSupabaseConfigured) {
    return SEEDED_CAMPUS_PEERS.find((p) => p.firebaseUid === uid) ?? null;
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (!error && data) {
      const p = data as SupabaseProfileRow;
      const name = p.display_name || p.full_name || p.email?.split("@")[0] || "Student";
      return {
        firebaseUid: p.id,
        displayName: name,
        displayNameLower: name.toLowerCase(),
        campusKey: p.campus || p.college || "MGM CET (Engineering)",
        college: p.college || p.campus || "MGM CET (Engineering)",
        department: p.department || "General",
        graduationYear: p.graduation_year || "2026",
        trustScore: p.trust_score ?? 95,
        badges: p.badges && p.badges.length > 0 ? p.badges : ["Student", "Verified Member"],
        photoUrl: p.avatar_url || null,
        emailVerified: Boolean(p.email_verified),
        createdAt: p.created_at || null,
      };
    }
  } catch {
    // fallback to seed below
  }

  return SEEDED_CAMPUS_PEERS.find((p) => p.firebaseUid === uid) ?? null;
}

export async function upsertSupabaseProfile(
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
  },
  campus: string | null,
  extra?: { department?: string; college?: string; graduationYear?: string },
): Promise<void> {
  if (!isSupabaseConfigured || !user.uid) return;

  let localDepartment = extra?.department;
  let localCollege = extra?.college;
  let localGradYear = extra?.graduationYear;

  if (typeof window !== "undefined" && (!localDepartment || !localCollege || !localGradYear)) {
    try {
      const saved = localStorage.getItem(`smartcampus_profile_${user.uid}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        localDepartment = localDepartment || parsed.department;
        localCollege = localCollege || parsed.college;
        localGradYear = localGradYear || parsed.graduationYear;
      }
    } catch {
      // ignore
    }
  }

  const payload: Record<string, unknown> = {
    id: user.uid,
    email: user.email,
    full_name: user.displayName,
    display_name: user.displayName,
    avatar_url: user.photoURL,
    updated_at: new Date().toISOString(),
    email_verified: user.emailVerified,
  };

  if (campus) {
    payload.campus = campus;
  }
  if (localCollege) {
    payload.college = localCollege;
  }
  if (localDepartment) {
    payload.department = localDepartment;
  }
  if (localGradYear) {
    payload.graduation_year = localGradYear;
  }

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) {
    console.warn("Error upserting Supabase profile:", error);
  }
}

