import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MapPin, Search, Users, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CAMPUSES, useCampus } from "@/lib/campus";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  subscribePublicProfiles,
  type PublicProfileDoc,
} from "@/lib/public-profile-firestore";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/people")({
  component: PeoplePage,
});

function PeoplePage() {
  const { user } = useAuth();
  const { campus } = useCampus();
  const [query, setQuery] = useState("");
  const [nearbyOnly, setNearbyOnly] = useState(true);
  const [profiles, setProfiles] = useState<PublicProfileDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || typeof window === "undefined") {
      setProfiles([]);
      setLoading(false);
      setError(null);
      return undefined;
    }
    setLoading(true);
    setError(null);
    const unsub = subscribePublicProfiles(
      (nextProfiles) => {
        setProfiles(nextProfiles);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setProfiles([]);
        setLoading(false);
        setError(err);
      },
    );
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = profiles.filter((p) => (user ? p.firebaseUid !== user.uid : true));

    if (nearbyOnly && campus) {
      rows = rows.filter((p) => p.campusKey === campus);
    }

    if (q.length > 0) {
      rows = rows.filter(
        (p) =>
          p.displayNameLower.includes(q) ||
          p.firebaseUid.toLowerCase().includes(q) ||
          p.campusKey.toLowerCase().includes(q),
      );
    }

    return rows;
  }, [profiles, query, nearbyOnly, campus, user]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-border bg-hero-gradient">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="font-display text-4xl font-semibold italic tracking-tight sm:text-5xl">
              Find people
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Search by name or browse peers who share your campus selection (
              <span className="font-medium text-foreground">Nearby</span> uses your navbar campus hub —
              choose LNCT, MANIT, etc. first).
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-3 shadow-soft">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by display name…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Button
                type="button"
                variant={nearbyOnly ? "default" : "outline"}
                className={cn(
                  "rounded-full",
                  nearbyOnly && "bg-brand-gradient text-primary-foreground hover:opacity-90",
                )}
                onClick={() => setNearbyOnly((v) => !v)}
              >
                <MapPin className="mr-2 h-4 w-4" />
                {nearbyOnly ? "Nearby only (campus)" : "Show all campuses"}
              </Button>
            </div>

            {!campus && nearbyOnly ? (
              <p className="mt-4 rounded-xl border border-dashed border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground">
                Pick a campus from the navbar to tighten discovery — or turn off “Nearby only”.
              </p>
            ) : null}

            {!isFirebaseConfigured ? (
              <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
                Firebase env vars are not configured — people discovery syncs after you add `.env`.
              </p>
            ) : null}
            {error ? (
              <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive">
                People discovery is temporarily offline. Showing cached profile rows only.
              </p>
            ) : null}
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {!user ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/70" />
              <p className="mt-3 font-medium text-foreground">Sign in to appear here yourself</p>
              <p className="mt-1">Your profile row saves automatically once Firebase + Auth are active.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Link to="/login">
                  <Button variant="outline" className="rounded-full">
                    Sign in
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="rounded-full bg-brand-gradient text-primary-foreground">Join</Button>
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading && filtered.length === 0 ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
              ))
            ) : filtered.length === 0 ? (
              <div className="col-span-full grid place-items-center rounded-2xl border border-dashed border-border py-20 text-center text-sm text-muted-foreground">
                No profiles match. Invite classmates after they log in once — profiles populate after signup.
              </div>
            ) : (
              filtered.map((p, i) => (
                <motion.div
                  key={p.firebaseUid}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={
                        p.photoUrl ??
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.firebaseUid)}`
                      }
                      alt=""
                      className="h-14 w-14 rounded-2xl object-cover ring-2 ring-border"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/profile/$userId"
                          params={{ userId: p.firebaseUid }}
                          className="truncate font-semibold text-foreground hover:underline"
                        >
                          {p.displayName}
                        </Link>
                        {p.emailVerified ? (
                          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified email" />
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {p.campusKey ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                            <MapPin className="h-3 w-3" />
                            {p.campusKey}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/80">Campus not set yet</span>
                        )}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link to="/profile/$userId" params={{ userId: p.firebaseUid }}>
                          <Button size="sm" variant="outline" className="rounded-full">
                            View profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground">
            Campus keys mirror navbar hubs: {CAMPUSES.join(", ")}.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
