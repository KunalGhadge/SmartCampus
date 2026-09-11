import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { isSupabaseConfigured } from "@/lib/supabase";
import { createSupabaseItemRequest } from "@/lib/supabase-data";
import type { Category, ItemRequest } from "@/lib/mock-data";
import { relativePostedLabel } from "@/lib/firestore-listings";

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

function asCategory(value: unknown): Category {
  if (typeof value === "string" && CATEGORY_SET.has(value)) {
    return value as Category;
  }
  return "Books";
}

export type ItemRequestWrite = {
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
};

export function firestoreDocToItemRequest(
  docId: string,
  data: Record<string, unknown>,
): ItemRequest | null {
  const itemName = typeof data.itemName === "string" ? data.itemName.trim() : "";
  if (!itemName) return null;

  const budgetMin = typeof data.budgetMin === "number" ? data.budgetMin : 0;
  const budgetMax = typeof data.budgetMax === "number" ? data.budgetMax : budgetMin;

  const createdAt =
    data.createdAt && typeof data.createdAt === "object" && "toDate" in (data.createdAt as object)
      ? (data.createdAt as Timestamp).toDate()
      : undefined;

  const urgencyRaw = data.urgency;
  const urgency: ItemRequest["urgency"] =
    urgencyRaw === "Low" ||
    urgencyRaw === "Medium" ||
    urgencyRaw === "High" ||
    urgencyRaw === "Urgent"
      ? urgencyRaw
      : "Medium";

  const studentName = typeof data.studentName === "string" ? data.studentName : "Student";
  const avatarSeed = encodeURIComponent(docId);
  const studentAvatar =
    typeof data.studentAvatar === "string" && data.studentAvatar
      ? data.studentAvatar
      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

  return {
    id: docId,
    itemName,
    category: asCategory(data.category),
    budgetMin,
    budgetMax,
    condition: typeof data.condition === "string" ? data.condition : "Any",
    description: typeof data.description === "string" ? data.description : "",
    urgency,
    campus: typeof data.campus === "string" ? data.campus : "",
    department: typeof data.department === "string" ? data.department : "",
    postedAgo: relativePostedLabel(createdAt ?? null),
    student: {
      name: studentName,
      avatar: studentAvatar,
      verified: Boolean(data.studentVerified),
    },
  };
}

export async function submitItemRequest(payload: ItemRequestWrite): Promise<string> {
  if (isSupabaseConfigured) {
    const id = await createSupabaseItemRequest(payload);
    if (id) return id;
  }

  if (isFirebaseConfigured) {
    const docRef = await addDoc(collection(db, "itemRequests"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  return `req-${Date.now()}`;
}

export function subscribeItemRequestsFromFirestore(
  onNext: (rows: ItemRequest[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, "itemRequests"),
    (snap) => {
      type Row = { req: ItemRequest | null; ms: number };
      const rows: Row[] = snap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown> & { createdAt?: Timestamp };
        const ms =
          raw.createdAt && typeof raw.createdAt.toMillis === "function"
            ? raw.createdAt.toMillis()
            : 0;
        return {
          req: firestoreDocToItemRequest(d.id, raw),
          ms,
        };
      });
      rows.sort((a, b) => b.ms - a.ms);
      onNext(rows.map((r) => r.req).filter((x): x is ItemRequest => x !== null));
    },
    (err) => {
      console.error(err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
    },
  );
}
