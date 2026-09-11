import { supabase, isSupabaseConfigured } from "./supabase";
import {
  auth as firebaseAuth,
  googleProvider,
  isFirebaseConfigured,
  getFirebaseAuthErrorMessage,
} from "./firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
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

export function mapFirebaseUserToAppUser(user: FirebaseUser): AppAuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    getIdToken: (force?: boolean) => user.getIdToken(force),
    metadata: {
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime,
    },
  };
}

export async function loginWithEmail(email: string, pass: string): Promise<AppAuthUser> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
    if (!data.user) throw new Error("No user returned from Supabase sign in.");
    return mapSupabaseUserToAppUser(data.user);
  }

  const cred = await signInWithEmailAndPassword(firebaseAuth, email, pass);
  return mapFirebaseUserToAppUser(cred.user);
}

export async function signupWithEmail(
  email: string,
  pass: string,
  displayName?: string,
): Promise<AppAuthUser> {
  if (isSupabaseConfigured) {
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
    if (!data.user) throw new Error("No user returned from Supabase sign up.");
    return mapSupabaseUserToAppUser(data.user);
  }

  const cred = await createUserWithEmailAndPassword(firebaseAuth, email, pass);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  return mapFirebaseUserToAppUser(cred.user);
}

export async function loginWithGoogle(): Promise<void> {
  if (isSupabaseConfigured) {
    const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) throw error;
    return;
  }

  const cred = await signInWithPopup(firebaseAuth, googleProvider);
  return;
}

export async function logoutUser(): Promise<void> {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
  if (isFirebaseConfigured) {
    await firebaseSignOut(firebaseAuth);
  }
}

export function formatAuthErrorMessage(error: unknown): string {
  if (typeof error === "object" && error && "message" in error) {
    const msg = (error as { message?: string }).message;
    if (msg) return msg;
  }
  return getFirebaseAuthErrorMessage(error);
}
