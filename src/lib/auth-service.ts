import { supabase, isSupabaseConfigured } from "./supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export interface AppAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

export function mapSupabaseUserToAppUser(user: SupabaseUser): AppAuthUser {
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName:
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email?.split("@")[0] ||
      "Student",
    photoURL:
      (user.user_metadata?.avatar_url as string) ||
      (user.user_metadata?.picture as string) ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
    emailVerified: Boolean(user.email_confirmed_at),
    getIdToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || "";
    },
    metadata: {
      creationTime: user.created_at,
      lastSignInTime: user.last_sign_in_at || user.created_at,
    },
  };
}

export async function loginWithEmail(email: string, pass: string): Promise<AppAuthUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });
  if (error) throw error;
  if (!data.user) throw new Error("No user returned from sign in.");
  return mapSupabaseUserToAppUser(data.user);
}

export interface SignupResult {
  user: AppAuthUser;
  needsEmailVerification: boolean;
}

export async function signupWithEmail(
  email: string,
  pass: string,
  displayName?: string,
): Promise<SignupResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        full_name: displayName,
        name: displayName,
      },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error("No user returned from sign up.");
  
  // If session is null or identities exist with unconfirmed email, verification is required
  const needsEmailVerification = !data.session;
  return {
    user: mapSupabaseUserToAppUser(data.user),
    needsEmailVerification,
  };
}

// Google / Apple OAuth (Temporarily disabled - uncomment when OAuth credentials are ready)
/*
export async function loginWithGoogle(): Promise<void> {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://smart-campus-pearl.vercel.app";
  const redirectUrl = `${origin}/dashboard`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
    },
  });
  if (error) throw error;
}
*/

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}

export function formatAuthErrorMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    const msg = (error as { message?: string }).message;
    if (msg) return msg;
  }
  return "Authentication failed. Please check your credentials and try again.";
}
