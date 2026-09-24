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
  Edit3,
  Tag,
  Percent,
  Trash2,
  HandHeart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Category, type Product, type ItemRequest } from "@/lib/mock-data";
import { createListing, fetchListingsBySeller } from "@/lib/firestore-listings";
import {
  updateSupabaseListingStatus,
  deleteSupabaseListing,
  fetchSupabaseUserItemRequests,
  deleteSupabaseItemRequest,
} from "@/lib/supabase-data";
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
import { useEffect, useMemo, useState, useCallback } from "react";
import { buildFallbackUserProfile, useCurrentUserProfile } from "@/lib/user-profile";
import { useAuth } from "@/lib/auth";
import { fetchUserChatThreads } from "@/lib/supabase-chat";
import type { ChatThread } from "@/lib/chat-socket";
import { getUserRentals, saveUserRentals, requestRentalReturn, type CampusRental } from "@/lib/rentals";
import AccountOverview from "@/components/account-overview";
import { EditProfileModal } from "@/components/edit-profile-modal";
import { RequestItemModal } from "@/components/request-item-modal";
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
  const [realThreads, setRealThreads] = useState<ChatThread[]>([]);
  const [userRentals, setUserRentals] = useState<CampusRental[]>(() => {
    const saved = getUserRentals();
    if (saved.length > 0) return saved;
    // Initialize with demo rentals if none
    const demo = products.filter((p) => p.forRent).slice(0, 2).map((p, idx) => ({
      id: p.id,
      productId: p.id,
      productTitle: p.title,
      productImage: p.image,
      rentPerDay: p.rentPerDay || 80,
      pickupLocation: p.pickupLocation || "Campus Main Gate",
      startDate: new Date().toISOString().slice(0, 10),
      returnByDate: new Date(Date.now() + (idx + 3) * 86400000).toISOString().slice(0, 10),
      status: (idx === 0 ? "Active Rental" : "Return Requested") as CampusRental["status"],
    }));
    saveUserRentals(demo);
    return demo;
  });

  const [listingOpen, setListingOpen] = useState(false);
  const [requestItemModalOpen, setRequestItemModalOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [listingSubmitting, setListingSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<ItemRequest[]>([]);
  const [listingForm, setListingForm] = useState({
    title: "",
    price: "",
    originalPrice: "",
    negotiable: true,
    availability: "Available" as Product["availability"],
    category: "Books" as Category,
    condition: "Good" as Product["condition"],
    image: "",
    description: "",
    forRent: false,
    rentPerDay: "",
  });

  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
  const [returnDate, setReturnDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [returnNote, setReturnNote] = useState("");
  const profile = profileQuery.data ?? (user ? buildFallbackUserProfile(user) : null);

  const loadUserRequests = useCallback(async () => {
    if (!user?.uid) return;
    const reqs = await fetchSupabaseUserItemRequests(user.uid);
    setMyRequests(reqs);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setMyListings([]);
      setMyRequests([]);
      return;
    }
    void fetchListingsBySeller(user.uid).then(setMyListings);
    void loadUserRequests();
  }, [user?.uid, loadUserRequests]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [authLoading, navigate, user]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const handleStatusChange = async (listingId: string, newStatus: Product["availability"]) => {
    const statusToSet = newStatus || "Available";
    const success = await updateSupabaseListingStatus(listingId, statusToSet);
    if (success) {
      setMyListings((prev) =>
        prev.map((item) => (item.id === listingId ? { ...item, availability: statusToSet } : item))
      );
      toast.success(`Listing status updated to ${statusToSet}`);
    } else {
      toast.error("Could not update listing status");
    }
  };

  const handleDeleteListing = async (listingId: string, title: string) => {
    if (!confirm(`Are you sure you want to remove "${title}"?`)) return;
    const success = await deleteSupabaseListing(listingId);
    if (success) {
      setMyListings((prev) => prev.filter((item) => item.id !== listingId));
      toast.success("Listing removed successfully");
    } else {
      toast.error("Could not delete listing");
    }
  };

  const handleDeleteRequest = async (requestId: string, itemName: string) => {
    if (!confirm(`Are you sure you want to remove your request for "${itemName}"?`)) return;
    const success = await deleteSupabaseItemRequest(requestId);
    if (success) {
      setMyRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success("Request removed successfully");
    } else {
      toast.error("Could not remove request");
    }
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

  useEffect(() => {
    if (!user?.uid) {
      setRealThreads([]);
      return;
    }
    void fetchUserChatThreads(user.uid).then((threads) => {
      setRealThreads(threads.filter((t) => !t.isBot));
    });
  }, [user?.uid]);

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
      const origPrice = Number(listingForm.originalPrice);
      await createListing({
        title: listingForm.title.trim(),
        price,
        originalPrice: Number.isFinite(origPrice) && origPrice > price ? origPrice : undefined,
        negotiable: listingForm.negotiable,
        availability: listingForm.availability,
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
        originalPrice: "",
        negotiable: true,
        availability: "Available",
        category: "Books",
        condition: "Good",
        image: "",
        description: "",
        forRent: false,
        rentPerDay: "",
      });
      setListingOpen(false);
      toast.success("Listing published", {
        description: "Your item is live with price discounts and availability options.",
      });
    } catch (e) {
      console.error(e);
      toast.error("Could not publish listing", {
        description:
          e instanceof Error ? e.message : "Check network, then try again.",
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
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-full flex items-center gap-1.5"
                onClick={() => setEditProfileOpen(true)}
              >
                <Edit3 className="h-4 w-4 text-primary" /> Edit profile
              </Button>
              <Button
                variant="outline"
                className="rounded-full flex items-center gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => setRequestItemModalOpen(true)}
              >
                <HandHeart className="h-4 w-4" /> Request item
              </Button>
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
              { i: Package, label: "Your listings", v: String(myListings.length), t: "Live on campus" },
              { i: HandHeart, label: "Your requests", v: String(myRequests.length), t: "Active wants" },
              { i: Heart, label: "Wishlist", v: String(wishlist.count), t: "Saved items" },
              { i: MessageCircle, label: "Messages", v: "Open", t: "Peer chat" },
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
                <Button
                  onClick={() => setRequestItemModalOpen(true)}
                  className="w-full justify-start rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/25"
                >
                  <HandHeart className="h-4 w-4" /> Post a wanted item request
                </Button>
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
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5 text-left font-medium">Item Details</th>
                      <th className="px-5 py-3.5 text-left font-medium">Selling Price</th>
                      <th className="px-5 py-3.5 text-left font-medium">Type</th>
                      <th className="px-5 py-3.5 text-left font-medium">Availability / Status</th>
                      <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {myListings.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-12 text-center text-sm text-muted-foreground"
                        >
                          No listings posted yet. Click{" "}
                          <span className="font-semibold text-primary">New listing</span> above to post textbooks, gadgets, or campus notes.
                        </td>
                      </tr>
                    ) : (
                      myListings.map((p) => {
                        const discount =
                          p.originalPrice && p.originalPrice > p.price
                            ? Math.round((1 - p.price / p.originalPrice) * 100)
                            : null;

                        return (
                          <tr key={p.id} className="hover:bg-secondary/30 transition">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.image}
                                  className="h-12 w-12 rounded-xl object-cover ring-1 ring-border bg-secondary shrink-0"
                                  alt={p.title}
                                />
                                <div className="min-w-0">
                                  <Link
                                    to="/product/$id"
                                    params={{ id: p.id }}
                                    className="line-clamp-1 font-semibold text-foreground hover:text-primary transition"
                                  >
                                    {p.title}
                                  </Link>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>{p.category}</span>
                                    <span>·</span>
                                    <span className="rounded bg-secondary px-1.5 py-0.2 text-[10px] font-medium">
                                      {p.condition}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-foreground">
                                  ₹{p.price.toLocaleString("en-IN")}
                                </span>
                                {p.originalPrice && p.originalPrice > p.price ? (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <span className="text-muted-foreground line-through">
                                      ₹{p.originalPrice.toLocaleString("en-IN")}
                                    </span>
                                    {discount ? (
                                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[10px]">
                                        {discount}% OFF
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}
                                {p.forRent && p.rentPerDay ? (
                                  <span className="text-xs text-primary font-medium mt-0.5">
                                    Rent: ₹{p.rentPerDay}/day
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-1">
                                {p.negotiable ? (
                                  <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                    Negotiable
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                                    Fixed
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <select
                                value={p.availability || "Available"}
                                onChange={(e) =>
                                  void handleStatusChange(
                                    p.id,
                                    e.target.value as Product["availability"],
                                  )
                                }
                                className={cn(
                                  "rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none transition cursor-pointer",
                                  (p.availability === "Available" || !p.availability) &&
                                    "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                                  p.availability === "Reserved" &&
                                    "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                                  p.availability === "Sold" &&
                                    "border-neutral-500/40 bg-neutral-500/10 text-neutral-600 dark:text-neutral-400",
                                )}
                              >
                                <option value="Available">🟢 Available</option>
                                <option value="Reserved">🟡 Reserved</option>
                                <option value="Sold">⚪ Sold</option>
                              </select>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void handleDeleteListing(p.id, p.title)}
                                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                aria-label="Delete listing"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* My Requested Items (Wanted Board) */}
          <section className="mt-12">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <HandHeart className="h-5 w-5 text-primary" /> My Requested Items ({myRequests.length})
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Items you're looking for that campus sellers and peers can fulfill
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setRequestItemModalOpen(true)}
                className="rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Request Item
              </Button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5 text-left font-medium">Requested Item</th>
                      <th className="px-5 py-3.5 text-left font-medium">Budget Range</th>
                      <th className="px-5 py-3.5 text-left font-medium">Urgency</th>
                      <th className="px-5 py-3.5 text-left font-medium">Campus / Department</th>
                      <th className="px-5 py-3.5 text-left font-medium">Date Posted</th>
                      <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {myRequests.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-10 text-center text-sm text-muted-foreground"
                        >
                          You haven't requested any items yet. Need a book, drafter, or component? Click{" "}
                          <button
                            onClick={() => setRequestItemModalOpen(true)}
                            className="font-semibold text-primary hover:underline"
                          >
                            Request Item
                          </button>{" "}
                          to broadcast to campus sellers.
                        </td>
                      </tr>
                    ) : (
                      myRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-secondary/30 transition">
                          <td className="px-5 py-4">
                            <div>
                              <div className="font-semibold text-foreground">{req.itemName}</div>
                              {req.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {req.description}
                                </div>
                              )}
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                <span className="font-medium text-foreground">{req.category}</span> · Preferred: {req.condition}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-semibold text-foreground">
                              ₹{req.budgetMin.toLocaleString("en-IN")} - ₹{req.budgetMax.toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                                req.urgency === "Urgent" && "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
                                req.urgency === "High" && "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
                                req.urgency === "Medium" && "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
                                req.urgency === "Low" && "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                              )}
                            >
                              {req.urgency === "Urgent" && "🔥"} {req.urgency}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-muted-foreground">
                            <div>{req.campus || campus || "Campus"}</div>
                            <div className="text-[11px]">{req.department || "General"}</div>
                          </td>
                          <td className="px-5 py-4 text-xs text-muted-foreground">
                            {req.postedAgo || "Recently"}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleDeleteRequest(req.id, req.itemName)}
                              className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete request"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Wishlist */}
          <section className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Wishlist ({wishlist.count})</h3>
                <Link to="/marketplace" className="text-xs text-primary hover:underline">
                  Browse more
                </Link>
              </div>
              <ul className="mt-4 space-y-3">
                {wishlist.count === 0 ? (
                  <li className="text-sm text-muted-foreground py-4 text-center">
                    Save items from the marketplace with the heart icon.
                  </li>
                ) : (
                  wishlist.items.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 group">
                      <Link
                        to="/product/$id"
                        params={{ id: p.id }}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <img src={p.image} className="h-12 w-12 rounded-xl object-cover" alt="" />
                        <div className="flex-1 min-w-0">
                          <div className="line-clamp-1 text-sm font-medium group-hover:text-primary transition">
                            {p.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ₹{p.price.toLocaleString("en-IN")} · {p.seller.college}
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={() => {
                          wishlist.toggle(p);
                          toast.info(`Removed "${p.title}" from wishlist.`);
                        }}
                        className="p-2 hover:bg-secondary rounded-full transition"
                        aria-label="Remove from wishlist"
                      >
                        <Heart className="h-4 w-4 shrink-0 fill-destructive text-destructive" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Recent chats</h3>
                <Link to="/chat" search={{ peerUid: undefined, peerName: undefined, peerAvatar: undefined }} className="text-xs text-primary hover:underline">
                  Open inbox
                </Link>
              </div>
              <ul className="mt-4 space-y-3">
                {realThreads.length === 0 ? (
                  <li className="text-sm text-muted-foreground py-4 text-center">
                    No recent chats yet. Direct conversations with sellers will appear here.
                  </li>
                ) : (
                  realThreads.slice(0, 5).map((c) => {
                    const parts = c.id.replace("dm_", "").split("_");
                    const peerUid = parts.find((id) => id !== user?.uid);
                    return (
                      <li key={c.id}>
                        <Link
                          to="/chat"
                          search={{
                            peerUid: peerUid,
                            peerName: c.name,
                            peerAvatar: c.avatar,
                            product: c.product,
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition"
                        >
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
                        </Link>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </section>

          {/* Rental history */}
          <section className="mt-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold italic">Rental history</h2>
              <div className="text-sm text-muted-foreground">Manage returns and track status</div>
            </div>

            {userRentals.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-foreground shadow-soft">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div className="mt-4 text-sm font-semibold">No rentals yet</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Rent cycles, gadgets or calculators from the marketplace to track them here.
                </div>
                <Link to="/marketplace" className="mt-4">
                  <Button size="sm" variant="outline" className="rounded-full">
                    Browse marketplace
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {userRentals.map((r, i) => {
                  const chip =
                    r.status === "Returned Successfully"
                      ? "bg-success/15 text-success"
                      : r.status === "Return Requested"
                        ? "bg-warning/15 text-warning"
                        : "bg-primary/10 text-primary";
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-2xl border border-border bg-card p-5 shadow-soft"
                    >
                      <div className="flex items-start gap-4">
                        <img src={r.productImage} alt="" className="h-16 w-16 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="line-clamp-1 text-sm font-semibold">{r.productTitle}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                ₹{r.rentPerDay}/day · {r.pickupLocation}
                              </div>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${chip}`}
                            >
                              {r.status}
                            </span>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1 text-[11px] text-muted-foreground">
                              <CalendarDays className="h-3.5 w-3.5 text-foreground" />
                              Return by {r.returnByDate}
                            </div>
                            <Link to="/product/$id" params={{ id: r.productId }}>
                              <Button size="sm" variant="outline" className="rounded-full">
                                View listing
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              className="rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90"
                              disabled={r.status !== "Active Rental"}
                              onClick={() => {
                                setSelectedRentalId(r.productId);
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
                        requestRentalReturn(selectedRentalId, returnDate, returnNote);
                        setUserRentals(getUserRentals());
                        toast.success("Return request submitted! Owner notified.");
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
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                    <Tag className="h-5 w-5 text-primary" /> Create New Listing
                  </DialogTitle>
                  <DialogDescription>
                    Listings are published in real-time and visible across CampusKart to all verified students.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                  <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                    Title *
                    <input
                      value={listingForm.title}
                      onChange={(e) => setListingForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Engineering Mathematics Vol 1 by BS Grewal"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                      Selling Price (₹) *
                      <input
                        type="number"
                        min={1}
                        value={listingForm.price}
                        onChange={(e) => setListingForm((f) => ({ ...f, price: e.target.value }))}
                        placeholder="e.g. 450"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </label>

                    <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                      Original / MRP Price (₹){" "}
                      <span className="text-[11px] font-normal text-muted-foreground">
                        (Optional for % OFF)
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={listingForm.originalPrice}
                        onChange={(e) =>
                          setListingForm((f) => ({ ...f, originalPrice: e.target.value }))
                        }
                        placeholder="e.g. 800"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </label>
                  </div>

                  {/* Live discount badge preview if originalPrice > price */}
                  {Number(listingForm.originalPrice) > Number(listingForm.price) &&
                    Number(listingForm.price) > 0 && (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        <Percent className="h-4 w-4" />
                        <span>
                          Calculated Discount:{" "}
                          <strong>
                            {Math.round(
                              ((Number(listingForm.originalPrice) - Number(listingForm.price)) /
                                Number(listingForm.originalPrice)) *
                                100,
                            )}
                            % OFF
                          </strong>{" "}
                          (Buyers will see ₹{listingForm.originalPrice} crossed out)
                        </span>
                      </div>
                    )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
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

                    <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
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
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                      Status / Availability
                      <select
                        value={listingForm.availability}
                        onChange={(e) =>
                          setListingForm((f) => ({
                            ...f,
                            availability: e.target.value as Product["availability"],
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      >
                        <option value="Available">Available (Active for sale)</option>
                        <option value="Reserved">Reserved (Holding / In Rental)</option>
                        <option value="Sold">Sold (Archived)</option>
                      </select>
                    </label>

                    <div className="flex flex-col justify-end">
                      <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background/60 p-2.5 text-sm font-medium transition hover:bg-muted/40">
                        <input
                          type="checkbox"
                          checked={listingForm.negotiable}
                          onChange={(e) =>
                            setListingForm((f) => ({ ...f, negotiable: e.target.checked }))
                          }
                          className="h-4 w-4 rounded border-input text-primary accent-primary"
                        />
                        <div>
                          <div className="text-xs font-semibold text-foreground">
                            Price is Negotiable
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Allows students to make counter offers
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                    Cover image URL *
                    <input
                      value={listingForm.image}
                      onChange={(e) => setListingForm((f) => ({ ...f, image: e.target.value }))}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>

                  <label className="space-y-1.5 text-xs font-semibold text-muted-foreground">
                    Description
                    <textarea
                      value={listingForm.description}
                      onChange={(e) =>
                        setListingForm((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="Mention details like edition, subject, any marks or notes, accessories included..."
                      rows={3}
                      className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </label>

                  <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={listingForm.forRent}
                        onChange={(e) =>
                          setListingForm((f) => ({ ...f, forRent: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-input text-primary accent-primary"
                      />
                      <span>Offer this item for Rent (Rentable)</span>
                    </label>

                    {listingForm.forRent ? (
                      <label className="block space-y-1 text-xs font-semibold text-muted-foreground">
                        Rent per day (₹)
                        <input
                          type="number"
                          min={1}
                          value={listingForm.rentPerDay}
                          onChange={(e) =>
                            setListingForm((f) => ({ ...f, rentPerDay: e.target.value }))
                          }
                          placeholder="e.g. 50"
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </label>
                    ) : null}
                  </div>
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
      <EditProfileModal open={editProfileOpen} onOpenChange={setEditProfileOpen} />
      <RequestItemModal
        open={requestItemModalOpen}
        onClose={() => {
          setRequestItemModalOpen(false);
          void loadUserRequests();
        }}
      />
      <Footer />
    </div>
  );
}
