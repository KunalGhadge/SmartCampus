import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useCampus } from "@/lib/campus";
import { isSupabaseConfigured } from "@/lib/supabase";
import { upsertPublicProfile } from "@/lib/public-profile-firestore";

/** Writes discoverable profile row when Supabase + Auth are available (campus used as “nearby”). */
export function PublicProfileSync() {
  const { user } = useAuth();
  const { campus } = useCampus();

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    void upsertPublicProfile(user, campus).catch((err) => console.warn("public profile sync:", err));
  }, [user, campus]);

  return null;
}
