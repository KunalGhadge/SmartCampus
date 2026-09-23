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
    : null;

  const chatSearch =
    profile && user && chatDisabledReason === null
      ? {
          peerUid: profile.firebaseUid,
          peerName: profile.displayName,
          peerAvatar:
            profile.photoUrl && !profile.photoUrl.includes("pravatar.cc")
              ? profile.photoUrl
              : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.displayName || profile.firebaseUid)}`,
        }
      : undefined;

  const avatarUrl =
    profile?.photoUrl && !profile.photoUrl.includes("pravatar.cc")
      ? profile.photoUrl
      : profile
        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.displayName || profile.firebaseUid)}`
        : "";

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
                This student hasn’t published a directory profile yet.
              </p>
              <Link to="/people">
                <Button className="mt-6 rounded-full">Browse people</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
              {/* Cover Banner with smooth gradient */}
              <div className="relative h-32 sm:h-36 bg-brand-gradient overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/15 to-transparent" />
              </div>
              <div className="px-6 pb-8 pt-0 sm:px-8">
                <div className="relative -mt-16 sm:-mt-20 flex flex-col items-center text-center z-10">
                  <div className="rounded-3xl p-1 bg-card ring-4 ring-card shadow-xl">
                    <img
                      src={avatarUrl}
                      alt={profile.displayName}
                      className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl object-cover bg-secondary"
                    />
                  </div>
                  <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold">
                    {profile.displayName}
                    {profile.emailVerified ? (
                      <ShieldCheck className="h-6 w-6 text-primary" aria-label="Verified email" />
                    ) : null}
                  </h1>
                  <div className="mt-2 flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
                    {profile.campusKey ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-secondary-foreground font-medium">
                        <MapPin className="h-4 w-4" />
                        {profile.campusKey}
                      </span>
                    ) : (
                      <span>Campus not shared yet — encourage them to pick one from the navbar.</span>
                    )}
                  </div>

                  <div className="mt-8 flex w-full max-w-sm flex-col gap-2.5">
                    {chatSearch ? (
                      <Link to="/chat" search={chatSearch}>
                        <Button className="w-full rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90">
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Chat on campus
                        </Button>
                      </Link>
                    ) : chatDisabledReason === "self" ? (
                      <Link to="/dashboard">
                        <Button className="w-full rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90">
                          Go to Dashboard to edit profile
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        className="w-full rounded-full"
                        variant="secondary"
                        onClick={() => {
                          if (chatDisabledReason === "sign-in") {
                            toast.message("Sign in to chat", {
                              description: "Create an account so messaging stays accountable.",
                            });
                          }
                        }}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Sign in to chat
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
