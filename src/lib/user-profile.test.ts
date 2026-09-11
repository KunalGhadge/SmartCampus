import { describe, expect, it } from "vitest";

import { HttpError } from "@/lib/http-error";
import { shouldFallbackToFirebaseProfile } from "@/lib/user-profile";

describe("shouldFallbackToFirebaseProfile", () => {
  it("returns false for 401 unauthorized responses", () => {
    expect(shouldFallbackToFirebaseProfile(new HttpError(401, "Unauthorized"))).toBe(false);
  });

  it("returns false for 403 forbidden responses", () => {
    expect(shouldFallbackToFirebaseProfile(new HttpError(403, "Forbidden"))).toBe(false);
  });

  it("returns true for non-auth HTTP failures", () => {
    expect(shouldFallbackToFirebaseProfile(new HttpError(500, "Server error"))).toBe(true);
  });

  it("returns true for non-HTTP errors", () => {
    expect(shouldFallbackToFirebaseProfile(new Error("Network down"))).toBe(true);
  });
});
