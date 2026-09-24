import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Building2,
  BookOpen,
  GraduationCap,
  Sparkles,
  ShoppingBag,
  Tag,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import {
  fetchPublicProfile,
  type PublicProfileDoc,
} from "@/lib/public-profile-firestore";
import { fetchListingsBySeller } from "@/lib/firestore-listings";
import type { Product } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/currency";

export const Route = createFileRoute("/profile/$userId")({
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfileDoc | null>(null);
  const [listings, setListings] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void fetchPublicProfile(userId).then((p) => {
      if (!cancelled) {
        setProfile(p);
        setLoading(false);
      }
    });

    void fetchListingsBySeller(userId).then((items) => {
      if (!cancelled) {
        setListings(items);
        setListingsLoading(false);
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

  const department = profile?.department || "Computer Engineering (CSE)";
  const college = profile?.college || profile?.campusKey || "MGM CET (Engineering)";
  const graduationYear = profile?.graduationYear ? `Class of ${profile.graduationYear}` : "Class of 2026";
  const trustScore = profile?.trustScore ?? 98;
  const badges = profile?.badges && profile.badges.length > 0 ? profile.badges : ["Student", "Verified Member"];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            to="/people"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to classmate directory
          </Link>

          {loading ? (
            <div className="rounded-3xl border border-border bg-card p-12 text-center text-sm text-muted-foreground animate-pulse">
              Loading student profile…
            </div>
          ) : !profile ? (
            <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-soft">
              <h1 className="text-xl font-semibold">Profile not found</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This student hasn’t published a directory profile yet.
              </p>
              <Link to="/people">
                <Button className="mt-6 rounded-full">Browse people</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Profile Card */}
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-elegant">
                {/* Cover Banner */}
                <div className="relative h-36 sm:h-44 bg-brand-gradient overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/20" />
                </div>

                <div className="px-6 pb-8 pt-0 sm:px-8">
                  <div className="relative -mt-16 sm:-mt-20 flex flex-col items-center text-center z-10">
                    <div className="rounded-3xl p-1 bg-card ring-4 ring-card shadow-2xl">
                      <img
                        src={avatarUrl}
                        alt={profile.displayName}
                        className="h-28 w-28 sm:h-36 sm:w-36 rounded-2xl object-cover bg-secondary"
                      />
                    </div>

                    <h1 className="mt-4 flex items-center gap-2 text-2xl sm:text-3xl font-bold">
                      {profile.displayName}
                      {profile.emailVerified ? (
                        <ShieldCheck className="h-6 w-6 text-primary" aria-label="Verified Student" />
                      ) : null}
                    </h1>

                    {/* Chips */}
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground border border-border/50">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        {college}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground border border-border/50">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        {department}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1 text-xs font-medium text-secondary-foreground border border-border/50">
                        <GraduationCap className="h-3.5 w-3.5 text-primary" />
                        {graduationYear}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {trustScore}% Trust Score
                      </span>
                    </div>

                    {/* Badges */}
                    <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                      {badges.map((b) => (
                        <span
                          key={b}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary"
                        >
                          <Sparkles className="h-3 w-3" />
                          {b}
                        </span>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex w-full max-w-sm flex-col sm:flex-row gap-3">
                      {chatSearch ? (
                        <Link to="/chat" search={chatSearch} className="flex-1">
                          <Button className="w-full rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90">
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Chat with Student
                          </Button>
                        </Link>
                      ) : chatDisabledReason === "self" ? (
                        <Link to="/dashboard" className="flex-1">
                          <Button className="w-full rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90">
                            Edit in Dashboard
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          className="w-full rounded-full flex-1"
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
                      <Link to="/marketplace" className="flex-1">
                        <Button variant="outline" className="w-full rounded-full">
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          Marketplace
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Academic & Verification Details Grid */}
                  <div className="mt-10 pt-8 border-t border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Student & Campus Details</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-xs font-medium uppercase tracking-wider">Department</span>
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <p className="mt-2 text-sm font-semibold text-foreground">{department}</p>
                      </div>

                      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-xs font-medium uppercase tracking-wider">College</span>
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <p className="mt-2 text-sm font-semibold text-foreground">{college}</p>
                      </div>

                      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-xs font-medium uppercase tracking-wider">Graduation</span>
                          <GraduationCap className="h-4 w-4 text-primary" />
                        </div>
                        <p className="mt-2 text-sm font-semibold text-foreground">{graduationYear}</p>
                      </div>

                      <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-xs font-medium uppercase tracking-wider">Verification</span>
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        </div>
                        <p className="mt-2 text-sm font-semibold text-foreground">
                          {profile.emailVerified ? "Verified Campus Student" : "Student Member"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Listings from this Student */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold">Listings by {profile.displayName}</h2>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {listings.length}
                    </span>
                  </div>
                  <Link to="/marketplace">
                    <Button variant="ghost" size="sm" className="text-xs text-primary hover:underline">
                      View all campus listings &rarr;
                    </Button>
                  </Link>
                </div>

                {listingsLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-64 rounded-2xl border border-border bg-card animate-pulse" />
                    ))}
                  </div>
                ) : listings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
                    <Tag className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="font-medium text-foreground">No active listings right now</p>
                    <p className="mt-1 text-xs">
                      When {profile.displayName} posts textbooks, lab equipment, or notes, they will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {listings.map((item) => (
                      <div
                        key={item.id}
                        className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft hover:shadow-elegant transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative aspect-video w-full overflow-hidden bg-secondary">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                            <div className="absolute top-2 left-2">
                              <span className="rounded-full bg-card/90 backdrop-blur px-2.5 py-0.5 text-[11px] font-semibold text-foreground shadow-sm">
                                {item.condition}
                              </span>
                            </div>
                            {item.forRent && (
                              <div className="absolute top-2 right-2">
                                <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-sm">
                                  For Rent
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                              <span>{item.category}</span>
                              <span>{item.postedAgo}</span>
                            </div>
                            <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition">
                              {item.title}
                            </h3>
                            <div className="mt-2 flex items-baseline gap-2">
                              <span className="text-base font-bold text-foreground">
                                {formatCurrency(item.price)}
                              </span>
                              {item.forRent && item.rentPerDay && (
                                <span className="text-xs text-muted-foreground">
                                  ({formatCurrency(item.rentPerDay)}/day)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="p-4 pt-0">
                          <Link to="/item/$id" params={{ id: item.id }}>
                            <Button variant="outline" size="sm" className="w-full rounded-xl text-xs">
                              View Item Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
