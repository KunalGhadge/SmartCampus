import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppAuthUser as User } from "@/lib/auth-service";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export type UserProfile = {
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  fullName: string | null;
  photoUrl: string | null;
  department: string | null;
  college: string | null;
  campus: string | null;
  graduationYear: string | null;
  emailVerified: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
  source: "backend" | "supabase";
  [key: string]: unknown;
};

export function buildFallbackUserProfile(user: User): UserProfile {
  return {
    firebaseUid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    fullName: user.displayName ?? null,
    photoUrl: user.photoURL ?? null,
    department: "General",
    college: "MGM College",
    campus: "MGM CET (Engineering)",
    graduationYear: "2026",
    emailVerified: user.emailVerified,
    createdAt: user.metadata.creationTime ?? null,
    lastLoginAt: user.metadata.lastSignInTime ?? null,
    source: "supabase",
  };
}

export async function fetchLiveUserProfile(user: User): Promise<UserProfile> {
  const fallback = buildFallbackUserProfile(user);
  if (!isSupabaseConfigured || !user.uid) return fallback;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.uid)
      .maybeSingle();

    if (!error && data) {
      return {
        ...fallback,
        displayName: data.display_name || data.full_name || fallback.displayName,
        fullName: data.full_name || data.display_name || fallback.fullName,
        photoUrl: data.avatar_url || fallback.photoUrl,
        department: data.department || fallback.department,
        college: data.college || fallback.college,
        campus: data.campus || fallback.campus,
        graduationYear: data.graduation_year || fallback.graduationYear,
        emailVerified: Boolean(data.email_verified ?? fallback.emailVerified),
      };
    }
  } catch (err) {
    console.warn("fetchLiveUserProfile error:", err);
  }

  return fallback;
}

export async function updateLiveUserProfile(
  user: User,
  updates: {
    displayName?: string;
    photoUrl?: string;
    department?: string;
    college?: string;
    campus?: string;
    graduationYear?: string;
  },
): Promise<UserProfile> {
  const displayName = updates.displayName?.trim() || user.displayName || "Student";
  const photoUrl = updates.photoUrl?.trim() || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`;
  const department = updates.department?.trim() || "General";
  const college = updates.college?.trim() || "MGM College";
  const campus = updates.campus?.trim() || "MGM CET (Engineering)";
  const graduationYear = updates.graduationYear?.trim() || "2026";

  if (isSupabaseConfigured && user.uid) {
    // 1. Update Supabase Auth user metadata
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: displayName,
          name: displayName,
          display_name: displayName,
          avatar_url: photoUrl,
          picture: photoUrl,
          department,
          college,
          campus,
          graduation_year: graduationYear,
        },
      });
    } catch (authErr) {
      console.warn("Auth metadata update warning:", authErr);
    }

    // 2. Upsert in public.profiles table
    try {
      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.uid,
          email: user.email,
          full_name: displayName,
          display_name: displayName,
          avatar_url: photoUrl,
          department,
          college,
          campus,
          graduation_year: graduationYear,
          email_verified: user.emailVerified,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (error) {
        console.warn("Database profiles table upsert warning:", error);
      }
    } catch (dbErr) {
      console.warn("Database error during profile upsert:", dbErr);
    }
  }

  return {
    firebaseUid: user.uid,
    email: user.email ?? null,
    displayName,
    fullName: displayName,
    photoUrl,
    department,
    college,
    campus,
    graduationYear,
    emailVerified: user.emailVerified,
    createdAt: user.metadata.creationTime ?? null,
    lastLoginAt: user.metadata.lastSignInTime ?? null,
    source: "supabase",
  };
}

export function useCurrentUserProfile() {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: ["current-user-profile", user?.uid],
    enabled: Boolean(user && !loading),
    queryFn: async () => {
      if (!user) return null;
      return await fetchLiveUserProfile(user);
    },
    staleTime: 30_000,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: {
      displayName?: string;
      photoUrl?: string;
      department?: string;
      college?: string;
      campus?: string;
      graduationYear?: string;
    }) => {
      if (!user) throw new Error("Must be signed in to update profile.");
      return await updateLiveUserProfile(user, updates);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["current-user-profile", user?.uid], updated);
      queryClient.invalidateQueries({ queryKey: ["current-user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["public-profiles"] });
    },
  });
}
