import { describe, expect, it } from "vitest";
import { buildFallbackUserProfile } from "@/lib/user-profile";
import type { AppAuthUser } from "@/lib/auth-service";

describe("buildFallbackUserProfile", () => {
  it("builds a fallback user profile from an auth user", () => {
    const user: AppAuthUser = {
      uid: "user-123",
      email: "student@mgmcollege.edu",
      displayName: "MGM Student",
      photoURL: "https://example.com/avatar.png",
      emailVerified: true,
      getIdToken: async () => "token",
      metadata: {
        creationTime: "2026-01-01T00:00:00Z",
        lastSignInTime: "2026-01-02T00:00:00Z",
      },
    };

    const profile = buildFallbackUserProfile(user);
    expect(profile.firebaseUid).toBe("user-123");
    expect(profile.email).toBe("student@mgmcollege.edu");
    expect(profile.displayName).toBe("MGM Student");
    expect(profile.source).toBe("supabase");
  });
});
