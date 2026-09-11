import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  fetchPublicProfile,
  type PublicProfileDoc,
} from "@/lib/public-profile-firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/$userId")({
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!isFirebaseConfigured) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    void fetchPublicProfile(userId).then((p) => {
      if (!cancelled) {
        setProfile(p);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const chatDisabledReason =
    !user ? "sign-in"
    : user.uid === userId ? "self"
    : !isFirebaseConfigured ? "firebase"
    : null;

  const chatSearch =
    profile && user && chatDisabledReason === null
      ? {
          peerUid: profile.firebaseUid,
          peerName: profile.displayName,
          peerAvatar: profile.photoUrl ?? "",
        }
      : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            to="/people"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to people
          </Link>

          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Loading profile…
            </div>
          ) : !profile ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <h1 className="text-xl font-semibold">Profile not found</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This student hasn’t published a directory profile yet, or Firebase isn’t wired up locally.
              </p>
              <Link to="/people">
                <Button className="mt-6 rounded-full">Browse people</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
              <div className="h-24 bg-brand-gradient opacity-90" />
              <div className="px-8 pb-8 pt-0">
                <div className="-mt-14 flex flex-col items-center text-center">
                  <img
                    src={
                      profile.photoUrl ??
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.firebaseUid)}`
                    }
                    alt=""
                    className="h-28 w-28 rounded-3xl border-4 border-card object-cover shadow-soft"
                  />
                  <h1 className="mt-4 flex items-center gap-2 text-2xl font-semibold">
                    {profile.displayName}
                    {profile.emailVerified ? (
                      <ShieldCheck className="h-6 w-6 text-primary" aria-label="Verified email" />
                    ) : null}
                  </h1>
                  <div className="mt-2 flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
                    {profile.campusKey ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
                        <MapPin className="h-4 w-4" />
                        {profile.campusKey}
                      </span>
                    ) : (
                      <span>Campus not shared yet — encourage them to pick one from the navbar.</span>
                    )}
                  </div>

                  <div className="mt-8 flex w-full max-w-sm flex-col gap-2">
                    {chatSearch ? (
                      <Link to="/chat" search={chatSearch}>
                        <Button className="w-full rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Chat on campus
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        className="w-full rounded-full"
                        variant="secondary"
                        disabled={chatDisabledReason === "self"}
                        onClick={() => {
                          if (chatDisabledReason === "sign-in") {
                            toast.message("Sign in to chat", {
                              description: "Create an account so messaging stays accountable.",
                            });
                          } else if (chatDisabledReason === "firebase") {
                            toast.message("Firebase required", {
                              description: "Add env vars from .env.example so profiles & chat work.",
                            });
                          }
                        }}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {chatDisabledReason === "self"
                          ? "This is you"
                          : chatDisabledReason === "sign-in"
                            ? "Sign in to chat"
                            : "Configure Firebase to chat"}
                      </Button>
                    )}
                    <Link to="/marketplace">
                      <Button variant="outline" className="w-full rounded-full">
                        Browse listings
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
