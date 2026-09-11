import { useQuery } from "@tanstack/react-query";
import type { AppAuthUser as User } from "@/lib/auth-service";

import { useAuth } from "@/lib/auth";
import { asHttpError, HttpError, isAuthHttpStatus } from "@/lib/http-error";

export type UserProfile = {
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  emailVerified: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
  source: "backend" | "firebase";
  [key: string]: unknown;
};

type UserProfileResponse = {
  ok: boolean;
  user: UserProfile;
};

export function shouldFallbackToFirebaseProfile(error: unknown): boolean {
  const httpError = asHttpError(error);
  if (!httpError) {
    return true;
  }
  return !isAuthHttpStatus(httpError.status);
}

export function buildFallbackUserProfile(user: User): UserProfile {
  return {
    firebaseUid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoUrl: user.photoURL ?? null,
    emailVerified: user.emailVerified,
    createdAt: user.metadata.creationTime ?? null,
    lastLoginAt: user.metadata.lastSignInTime ?? null,
    source: "firebase",
  };
}

export async function fetchCurrentUserProfile(user: User): Promise<UserProfile> {
  const token = await user.getIdToken();
  const response = await fetch("/api/users/me", {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new HttpError(
      response.status,
      message || `Failed to load user profile (${response.status}).`,
    );
  }

  const payload = (await response.json()) as UserProfileResponse;

  if (!payload.ok || !payload.user) {
    throw new Error("User profile response was incomplete.");
  }

  return payload.user;
}

export function useCurrentUserProfile() {
  const { user, loading, signOut } = useAuth();

  return useQuery({
    queryKey: ["current-user-profile", user?.uid],
    enabled: Boolean(user && !loading),
    queryFn: async () => {
      if (!user) {
        return null;
      }

      try {
        return await fetchCurrentUserProfile(user);
      } catch (error) {
        const httpError = asHttpError(error);
        if (httpError && isAuthHttpStatus(httpError.status)) {
          await signOut();
          return null;
        }
        if (shouldFallbackToFirebaseProfile(error)) {
          return buildFallbackUserProfile(user);
        }
        return null;
      }
    },
    staleTime: 60_000,
  });
}
