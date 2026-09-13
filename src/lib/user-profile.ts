import { useQuery } from "@tanstack/react-query";
import type { AppAuthUser as User } from "@/lib/auth-service";
import { useAuth } from "@/lib/auth";

export type UserProfile = {
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
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
    photoUrl: user.photoURL ?? null,
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
      return buildFallbackUserProfile(user);
    },
    staleTime: 60_000,
  });
}
