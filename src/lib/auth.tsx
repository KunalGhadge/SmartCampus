import * as React from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  type AppAuthUser,
  mapSupabaseUserToAppUser,
  mapFirebaseUserToAppUser,
  logoutUser,
} from "@/lib/auth-service";

export type AuthUser = AppAuthUser;
// Re-export type for compatibility with components importing type User
export type User = AppAuthUser;

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // 1. Supabase Auth Listener
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          setUser(mapSupabaseUserToAppUser(data.session.user));
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(mapSupabaseUserToAppUser(session.user));
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    // 2. Firebase Auth Listener
    if (isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser ? mapFirebaseUserToAppUser(nextUser) : null);
        setLoading(false);
      });

      return unsubscribe;
    }

    // 3. Fallback: No auth provider configured
    setLoading(false);
    return undefined;
  }, []);

  const signOut = React.useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  const value = React.useMemo(() => ({ user, loading, signOut }), [loading, signOut, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
