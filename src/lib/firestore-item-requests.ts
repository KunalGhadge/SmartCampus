import { createSupabaseItemRequest } from "@/lib/supabase-data";
import type { Category, ItemRequest } from "@/lib/mock-data";

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

export async function submitItemRequest(payload: ItemRequestWrite): Promise<string> {
  const id = await createSupabaseItemRequest(payload);
  if (id) return id;
  return `req-${Date.now()}`;
}
