import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  TrendingUp,
  MessageCircle,
  Heart,
  Package,
  ShoppingBag,
  Plus,
  BadgeCheck,
  RotateCcw,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { conversations, type Category, type Product } from "@/lib/mock-data";
import { createListing, fetchListingsBySeller } from "@/lib/firestore-listings";
import { PRODUCT_CATEGORIES, useCatalog } from "@/lib/catalog";
import { useCampus } from "@/lib/campus";
import { useWishlist } from "@/lib/wishlist";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { buildFallbackUserProfile, useCurrentUserProfile } from "@/lib/user-profile";
import { useAuth } from "@/lib/auth";
import AccountOverview from "@/components/account-overview";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const profileQuery = useCurrentUserProfile();
  const { products } = useCatalog();
  const { campus } = useCampus();
  const wishlist = useWishlist();

  const [myListings, setMyListings] = useState<Product[]>([]);
  const [listingOpen, setListingOpen] = useState(false);
  const [listingSubmitting, setListingSubmitting] = useState(false);
  const [listingForm, setListingForm] = useState({
    title: "",
    price: "",
    category: "Books" as Category,
    condition: "Good" as Product["condition"],
    image: "",
    description: "",
    forRent: false,
    rentPerDay: "",
  });

  const rentals = useMemo(() => products.filter((p) => p.forRent).slice(0, 4), [products]);
  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
  const [returnDate, setReturnDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [returnNote, setReturnNote] = useState("");
  const [rentalStatus, setRentalStatus] = useState<
    Record<string, "Active Rental" | "Return Requested" | "Returned Successfully">
  >(() => {
    const init: Record<string, "Active Rental" | "Return Requested" | "Returned Successfully"> = {};
    rentals.forEach((r, idx) => {
      init[r.id] = idx === 0 ? "Active Rental" : idx === 1 ? "Return Requested" : "Active Rental";
    });
    return init;
  });
  const profile = profileQuery.data ?? (user ? buildFallbackUserProfile(user) : null);

  useEffect(() => {
    if (!user?.uid) {
      setMyListings([]);
      return;
    }
    void fetchListingsBySeller(user.uid).then(setMyListings);
  }, [user?.uid]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [authLoading, navigate, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const displayName = profile?.displayName ?? user?.displayName ?? "Student";
  const email = profile?.email ?? user?.email ?? "No email on file";
  const avatarLabel = displayName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const selectedRental = selectedRentalId ? products.find((p) => p.id === selectedRentalId) : null;

  const peerConversations = useMemo(
    () => conversations.filter((c) => !(c as { isBot?: boolean }).isBot),
    [],
  );

  const submitNewListing = async () => {
    if (!user?.uid) return;
    const price = Number(listingForm.price);
    if (
      !listingForm.title.trim() ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !listingForm.image.trim()
    ) {
      toast.error("Missing listing details", {
        description: "Add a title, positive price, and cover image URL.",
      });
      return;
    }
    setListingSubmitting(true);
    try {
      await createListing({
        title: listingForm.title.trim(),
        price,
        category: listingForm.category,
        condition: listingForm.condition,
        image: listingForm.image.trim(),
        description: listingForm.description.trim() || listingForm.title.trim(),
        shortDescription: listingForm.description.trim().slice(0, 140) || undefined,
        sellerId: user.uid,
        sellerName: profile?.displayName ?? user.displayName ?? "Student",
        sellerCollege: campus || "Campus",
        sellerVerified: Boolean(profile?.emailVerified ?? user.emailVerified),
        sellerRating: 5,
        sellerAvatar: profile?.photoUrl ?? user.photoURL ?? undefined,
        forRent: listingForm.forRent,
        rentPerDay: listingForm.forRent
          ? Math.max(1, Number(listingForm.rentPerDay) || 1)
          : undefined,
      });
      void fetchListingsBySeller(user.uid).then(setMyListings);
      setListingForm({
        title: "",
        price: "",
        category: "Books",
        condition: "Good",
        image: "",
        description: "",
        forRent: false,
        rentPerDay: "",
      });
      setListingOpen(false);
      toast.success("Listing published", {
        description: "Your item is live for everyone browsing the catalog.",
      });
    } catch (e) {
      console.error(e);
      toast.error("Could not publish listing", {
        description:
          e instanceof Error ? e.message : "Check Firestore rules and network, then try again.",
      });
    } finally {
      setListingSubmitting(false);
    }
  };

  if (authLoading && !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">
          <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-24 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-soft">
              <div className="text-sm font-semibold">Loading your dashboard</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Fetching your account and profile details.
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-lg font-semibold text-primary-foreground shadow-elegant">
                {profile?.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt=""
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  avatarLabel
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Welcome back, {displayName}</p>
                <h1 className="mt-1 font-display text-3xl font-semibold italic tracking-tight sm:text-4xl">
                  Your dashboard
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">Signed in as {email}</p>
                {profile?.source === "firebase" ? (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                    Backend profile is unavailable; using Firebase fallback data.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/marketplace">
                <Button variant="outline" className="rounded-full">
                  Browse marketplace
                </Button>
              </Link>
              <Button
                className="rounded-full bg-brand-gradient text-primary-foreground shadow-elegant hover:opacity-90"
                onClick={() => setListingOpen(true)}
              >
                <Plus className="h-4 w-4" /> New listing
              </Button>
              <Button variant="ghost" className="rounded-full" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { i: Package, label: "Your listings", v: String(myListings.length), t: "Firestore" },
              { i: Heart, label: "Wishlist", v: String(wishlist.count), t: "This device" },
              { i: MessageCircle, label: "Messages", v: "Open", t: "Peer chat" },
              {
                i: TrendingUp,
                label: "Catalog size",
                v: String(products.length),
                t: "Merged feed",
              },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-foreground">
                    <s.i className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                    {s.t}
                  </span>
                </div>
                <div className="mt-4 text-2xl font-bold tracking-tight">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <AccountOverview profile={profile} />
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className="text-sm font-semibold">Quick actions</h3>
              <p className="text-xs text-muted-foreground">Shortcuts tied to your account</p>
              <div className="mt-5 grid gap-3">
                <Link to="/marketplace">
                  <Button variant="outline" className="w-full justify-start rounded-xl">
                    <ShoppingBag className="h-4 w-4" /> Browse marketplace
                  </Button>
                </Link>
                <Link
                  to="/chat"
                  search={{ peerUid: undefined, peerName: undefined, peerAvatar: undefined }}
                >
                  <Button variant="outline" className="w-full justify-start rounded-xl">
                    <MessageCircle className="h-4 w-4" /> Open messages
                  </Button>
                </Link>
                <Button className="w-full justify-start rounded-xl bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90">
                  <BadgeCheck className="h-4 w-4" /> Verify profile status
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Chart */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
              <div className="mb-2">
                <h3 className="text-sm font-semibold">Activity overview</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fine-grained analytics are not wired yet. Use{" "}
                  <span className="font-medium text-foreground">Your listings</span> below along
                  with Messages to coordinate deals in real time.
                </p>
              </div>
              <div className="mt-6 rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground">
                Charts activate automatically once view counts are stored alongside listings.
              </div>
            </div>

            {/* Activity feed */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
              <h3 className="text-sm font-semibold">Recent activity</h3>
              <ul className="mt-4 space-y-4">
                {[
                  {
                    i: Package,
                    t: "Publish inventory with New listing — it syncs to Firestore instantly.",
                    time: "Tip",
                  },
                  {
                    i: MessageCircle,
                    t: "Use Messages for meet-up coordination with Socket.IO chat.",
                    time: "Tip",
                  },
                  {
                    i: ShoppingBag,
                    t: "Browse /marketplace for campus-wide inventory merged with live uploads.",
                    time: "Tip",
                  },
                ].map((a, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
                      <a.i className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 text-sm">
                      <div className="text-foreground">{a.t}</div>
                      <div className="text-xs text-muted-foreground">{a.time}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* My listings */}
          <section className="mt-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">My listings</h2>
              <Link to="/marketplace" className="text-sm text-primary hover:underline">
                View all →
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Item</th>
                    <th className="px-5 py-3 text-left font-medium">Price</th>
                    <th className="px-5 py-3 text-left font-medium">Views</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {myListings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-10 text-center text-sm text-muted-foreground"
                      >
                        No listings yet. Use{" "}
                        <span className="font-medium text-foreground">New listing</span> to add your
                        first item.
                      </td>
                    </tr>
                  ) : (
                    myListings.map((p) => (
                      <tr key={p.id} className="hover:bg-secondary/30">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.image}
                              className="h-10 w-10 rounded-lg object-cover"
                              alt=""
                            />
                            <span className="line-clamp-1 font-medium">{p.title}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 font-semibold">
                          ₹{p.price.toLocaleString("en-IN")}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">—</td>
                        <td className="px-5 py-3">
                          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                            {p.availability ?? "Available"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Wishlist */}
          <section className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold">Wishlist</h3>
              <ul className="mt-4 space-y-3">
                {wishlist.count === 0 ? (
                  <li className="text-sm text-muted-foreground">
                    Save items from the marketplace with the heart icon.
                  </li>
                ) : (
                  wishlist.items.map((p) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <img src={p.image} className="h-12 w-12 rounded-lg object-cover" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="line-clamp-1 text-sm font-medium">{p.title}</div>
                        <div className="text-xs text-muted-foreground">
                          ₹{p.price.toLocaleString("en-IN")} · {p.seller.college}
                        </div>
                      </div>
                      <Heart className="h-4 w-4 shrink-0 fill-destructive text-destructive" />
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold">Recent chats</h3>
              <ul className="mt-4 space-y-3">
                {peerConversations.map((c) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <div className="relative">
                      <img src={c.avatar} alt="" className="h-10 w-10 rounded-full" />
                      {c.online && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground">{c.time}</div>
                      </div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">{c.lastMsg}</div>
                    </div>
                    {c.unread > 0 && (
                      <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Rental history */}
          <section className="mt-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold italic">Rental history</h2>
              <div className="text-sm text-muted-foreground">Manage returns and track status</div>
            </div>

            {rentals.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-foreground shadow-soft">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div className="mt-4 text-sm font-semibold">No rentals yet</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Rent items from the marketplace to see them here.
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {rentals.map((p, i) => {
                  const status = rentalStatus[p.id] ?? "Active Rental";
                  const chip =
                    status === "Returned Successfully"
                      ? "bg-success/15 text-success"
                      : status === "Return Requested"
                        ? "bg-warning/15 text-warning"
                        : "bg-primary/10 text-primary";
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                    >
                      <div className="flex items-start gap-4">
                        <img src={p.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="line-clamp-1 text-sm font-semibold">{p.title}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                ₹{p.rentPerDay}/day · {p.pickupLocation ?? p.seller.college}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${chip}`}
                            >
                              {status}
                            </span>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1 text-[11px] text-muted-foreground">
                              <CalendarDays className="h-3.5 w-3.5 text-foreground" />
                              Return by {returnDate}
                            </div>
                            <Link to="/product/$id" params={{ id: p.id }}>
                              <Button size="sm" variant="outline" className="rounded-full">
                                View listing
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              className="rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90"
                              disabled={status !== "Active Rental"}
                              onClick={() => {
                                setSelectedRentalId(p.id);
                                setReturnOpen(true);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                              Return item
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Return item</DialogTitle>
                  <DialogDescription>
                    Request a return pickup or hand-off for your rental. We'll notify the owner and
                    track status here.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {selectedRental ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
                      <img
                        src={selectedRental.image}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <div className="line-clamp-1 text-sm font-semibold">
                          {selectedRental.title}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Pickup: {selectedRental.pickupLocation ?? selectedRental.seller.college}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground">
                        Preferred return date
                      </div>
                      <input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </label>
                    <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
                      Status becomes{" "}
                      <span className="font-semibold text-foreground">Return Requested</span> after
                      confirmation.
                    </div>
                  </div>

                  <label className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Note (optional)
                    </div>
                    <textarea
                      value={returnNote}
                      onChange={(e) => setReturnNote(e.target.value)}
                      placeholder="e.g. Available after 6 PM, meet near Hostel Block B"
                      className="min-h-24 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setReturnOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90"
                    onClick={() => {
                      if (selectedRentalId) {
                        setRentalStatus((s) => ({ ...s, [selectedRentalId]: "Return Requested" }));
                      }
                      setReturnNote("");
                      setReturnOpen(false);
                    }}
                  >
                    Confirm return request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={listingOpen} onOpenChange={setListingOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>New listing</DialogTitle>
                  <DialogDescription>
                    Listings are stored in Firebase Firestore and merged with the curated demo
                    catalog everywhere shoppers browse.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 py-2">
                  <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                    Title
                    <input
                      value={listingForm.title}
                      onChange={(e) => setListingForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                      Price (₹)
                      <input
                        type="number"
                        min={1}
                        value={listingForm.price}
                        onChange={(e) => setListingForm((f) => ({ ...f, price: e.target.value }))}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </label>
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                      Category
                      <select
                        value={listingForm.category}
                        onChange={(e) =>
                          setListingForm((f) => ({ ...f, category: e.target.value as Category }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      >
                        {PRODUCT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                    Condition
                    <select
                      value={listingForm.condition}
                      onChange={(e) =>
                        setListingForm((f) => ({
                          ...f,
                          condition: e.target.value as Product["condition"],
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      {(["New", "Like New", "Good", "Fair"] as const).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                    Cover image URL
                    <input
                      value={listingForm.image}
                      onChange={(e) => setListingForm((f) => ({ ...f, image: e.target.value }))}
                      placeholder="https://…"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>

                  <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                    Description
                    <textarea
                      value={listingForm.description}
                      onChange={(e) =>
                        setListingForm((f) => ({ ...f, description: e.target.value }))
                      }
                      rows={3}
                      className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={listingForm.forRent}
                      onChange={(e) => setListingForm((f) => ({ ...f, forRent: e.target.checked }))}
                      className="rounded border-input"
                    />
                    Offer for rent (per day)
                  </label>

                  {listingForm.forRent ? (
                    <label className="space-y-1 text-xs font-semibold text-muted-foreground">
                      Rent per day (₹)
                      <input
                        type="number"
                        min={1}
                        value={listingForm.rentPerDay}
                        onChange={(e) =>
                          setListingForm((f) => ({ ...f, rentPerDay: e.target.value }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </label>
                  ) : null}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setListingOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90"
                    disabled={listingSubmitting}
                    onClick={() => void submitNewListing()}
                  >
                    {listingSubmitting ? "Publishing…" : "Publish listing"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
