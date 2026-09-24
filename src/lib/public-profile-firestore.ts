import type { AppAuthUser as User } from "@/lib/auth-service";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { CampusName } from "@/lib/campus";
import {
  fetchSupabaseProfiles,
  fetchSupabaseProfileById,
  upsertSupabaseProfile,
} from "@/lib/supabase-data";

export type PublicProfileDoc = {
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

export async function upsertPublicProfile(
  user: User,
  campus: CampusName | null,
  extra?: { department?: string; college?: string; graduationYear?: string },
): Promise<void> {
  if (!isSupabaseConfigured) return;
  await upsertSupabaseProfile(user, campus, extra);
}

export async function fetchPublicProfile(uid: string): Promise<PublicProfileDoc | null> {
  if (!isSupabaseConfigured) return null;
  return await fetchSupabaseProfileById(uid);
}

export function subscribePublicProfiles(
  onNext: (profiles: PublicProfileDoc[]) => void,
  onError?: (e: Error) => void,
): () => void {
  if (!isSupabaseConfigured) {
    onNext([]);
    return () => {};
  }

  void fetchSupabaseProfiles()
    .then(onNext)
    .catch((err: unknown) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    });

  const channel = supabase
    .channel("public-profiles-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "profiles" },
      () => {
        void fetchSupabaseProfiles()
          .then(onNext)
          .catch((err: unknown) => {
            onError?.(err instanceof Error ? err : new Error(String(err)));
          });
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
