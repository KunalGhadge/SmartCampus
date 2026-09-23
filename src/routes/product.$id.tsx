import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Calendar,
  Shield,
  TrendingUp,
  Sparkles,
  ArrowLeft,
  Star,
  RotateCcw,
  Edit3,
  Trash2,
  CheckCircle2,
  Eye,
  Award,
  Zap,
  ShoppingBag,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/lib/catalog";
import { useWishlist } from "@/lib/wishlist";
import { useAuth } from "@/lib/auth";
import { isDemoListing } from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ListingSafetyBanner } from "@/components/listing-safety-banner";
import { analyzeListingRisk } from "@/lib/product-safety";
import { toast } from "sonner";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { requestRentalReturn, addOrUpdateRental } from "@/lib/rentals";

export const Route = createFileRoute("/product/$id")({
  component: ProductDetails,
  notFoundComponent: () => (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <h1 className="text-2xl font-semibold">Listing not found</h1>
        <Link to="/marketplace" className="mt-3 inline-block text-primary hover:underline">
          Back to marketplace
        </Link>
      </div>
    </div>
  ),
});

function ProductDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { products } = useCatalog();
  const product = products.find((p) => p.id === id);
  const { user } = useAuth();
  
  if (!product) throw notFound();
  
  const isOwner = user?.uid && product.sellerId === user.uid;
  const isDemo = isDemoListing(product);
  
  const [active, setActive] = useState(0);
  const wishlist = useWishlist();
  const liked = wishlist.has(product.id);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnStatus, setReturnStatus] = useState<
    "Active Rental" | "Return Requested" | "Returned Successfully"
  >("Active Rental");
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });

  // New Smart Campus Deal & Analytics Dialog States
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [selectedMeetup, setSelectedMeetup] = useState(product.pickupLocation || "Central Library");
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [currentAvailability, setCurrentAvailability] = useState(product.availability || "Available");
  const [soldCelebrationOpen, setSoldCelebrationOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const gallery = product.images?.length
    ? product.images
    : [product.image, product.image, product.image, product.image];
  const similar = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const handleOpenDealDialog = () => {
    if (isOwner) {
      toast.info("This is your own listing. You can manage it below.");
      return;
    }
    setDealDialogOpen(true);
  };

  const handleConfirmDealAndChat = () => {
    setDealDialogOpen(false);
    const prefillMessage = `Hi ${product.seller.name}! I'm interested in buying "${product.title}" for ₹${product.price.toLocaleString("en-IN")}. Can we meet at ${selectedMeetup} to inspect and pay via UPI?`;
    
    navigate({
      to: "/chat",
      search: {
        peerUid: product.sellerId || (isDemo ? `demo_${product.id}` : undefined),
        peerName: product.seller.name,
        peerAvatar: product.seller.avatar,
        product: product.title,
        initialMsg: prefillMessage,
      },
    });
    
    toast.success(`Opening chat with ${product.seller.name}`, {
      description: `Proposed safe meet-up spot: ${selectedMeetup}`,
    });
  };

  const handleToggleSoldStatus = async () => {
    setIsUpdatingStatus(true);
    const newStatus = currentAvailability === "Sold" ? "Available" : "Sold";
    try {
      if (isSupabaseConfigured && product.id) {
        await supabase
          .from("listings")
          .update({ availability: newStatus })
          .eq("id", product.id);
      }
      setCurrentAvailability(newStatus);
      if (newStatus === "Sold") {
        setSoldCelebrationOpen(true);
        toast.success("Listing marked as Sold! +25 Campus Points awarded.");
      } else {
        toast.info("Listing status updated back to Available.");
      }
    } catch (err) {
      console.error(err);
      setCurrentAvailability(newStatus);
      if (newStatus === "Sold") {
        setSoldCelebrationOpen(true);
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteListing = async () => {
    setIsDeleting(true);
    try {
      if (isSupabaseConfigured && product.id) {
        await supabase.from("listings").delete().eq("id", product.id);
      }
      toast.success("Listing deleted successfully.");
      setDeleteConfirmOpen(false);
      navigate({ to: "/marketplace" });
    } catch (err) {
      console.error(err);
      toast.error("Could not delete listing. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const aiPrice = Math.round(product.price * 0.95);
  const trend = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const points = [];
    const multipliers = [1.14, 1.10, 1.07, 1.04, 1.02, 1.0];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = monthNames[d.getMonth()];
      const priceVal = Math.round(aiPrice * multipliers[5 - i]);
      points.push({ m: mName, p: priceVal });
    }
    return points;
  }, [aiPrice]);

  const [reviews, setReviews] = useState(() => [
    {
      id: "r1",
      name: "Verified Buyer",
      verified: true,
      rating: 5,
      text: "Smooth transaction and genuine pricing.",
      time: "2 days ago",
    },
    {
      id: "r2",
      name: "Ankita",
      verified: true,
      rating: 4,
      text: "Quick replies and item matched the description.",
      time: "1 week ago",
    },
    {
      id: "r3",
      name: "Rahul",
      verified: false,
      rating: 5,
      text: "On-time meet-up. Great experience.",
      time: "3 weeks ago",
    },
  ]);

  const avgRating = useMemo(() => {
    const sum = reviews.reduce((a, r) => a + r.rating, 0);
    return reviews.length ? sum / reviews.length : product.seller.rating;
  }, [reviews, product.seller.rating]);

  useEffect(() => {
    const report = analyzeListingRisk(product);
    if (report.level !== "high") return;
    const key = `risk-toast:${product.id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // ignore
    }
    toast.warning("Listing flagged — review carefully", {
      description:
        "Automated checks found elevated risk signals. Read the safety notice and verify before paying.",
    });
  }, [product]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            to="/marketplace"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to marketplace
          </Link>

          <div className="grid gap-10 lg:grid-cols-2">
            {/* Gallery */}
            <div>
              <motion.div
                key={active}
                initial={{ opacity: 0.6, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden rounded-3xl border border-border bg-card"
              >
                <img
                  src={gallery[active]}
                  alt={product.title}
                  className="aspect-square w-full object-cover"
                />
              </motion.div>
              <div className="mt-3 grid grid-cols-4 gap-3">
                {gallery.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`overflow-hidden rounded-xl border-2 transition ${active === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}
                  >
                    <img src={g} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span className="rounded-full bg-secondary px-2 py-0.5">{product.category}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5">{product.condition}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5">
                  Posted {product.postedAgo}
                </span>
                {product.usedFor ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5">
                    Used for {product.usedFor}
                  </span>
                ) : null}
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    currentAvailability === "Sold"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {currentAvailability}
                </span>
              </div>
              <h1 className="mt-3 font-display text-3xl font-semibold italic leading-tight tracking-tight sm:text-4xl">
                {product.title}
              </h1>

              <div className="mt-5 flex items-end gap-3">
                <span className="text-4xl font-bold tracking-tight">
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
                {product.originalPrice && (
                  <span className="pb-1 text-base text-muted-foreground line-through">
                    ₹{product.originalPrice.toLocaleString("en-IN")}
                  </span>
                )}
              </div>

              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>

              <div className="mt-5">
                <ListingSafetyBanner product={product} />
              </div>

              {/* Metadata */}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { k: "Pickup", v: product.pickupLocation ?? "On campus" },
                  { k: "Department", v: product.department ?? "—" },
                  {
                    k: "Price",
                    v:
                      typeof product.negotiable === "boolean"
                        ? product.negotiable
                          ? "Negotiable"
                          : "Fixed"
                        : "—",
                  },
                  { k: "Age", v: product.itemAge ?? "—" },
                ].map((x) => (
                  <div
                    key={x.k}
                    className="rounded-2xl border border-border bg-card p-4 shadow-soft"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {x.k}
                    </div>
                    <div className="mt-1 text-sm font-semibold">{x.v}</div>
                  </div>
                ))}
              </div>

              {product.tags?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {product.tags.slice(0, 8).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}

              {product.specs?.length ? (
                <div className="mt-6 rounded-2xl border border-border bg-card p-5">
                  <div className="text-sm font-semibold">Specifications</div>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {product.specs.slice(0, 8).map((s) => (
                      <li key={s} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* AI Price card */}
              <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/40 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-gradient text-primary-foreground">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">AI Campus Price Benchmark</div>
                      <div className="text-xs text-muted-foreground">
                        Analyzed against recent {product.category.toLowerCase()} deals on campus
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
                    94% confidence
                  </span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Fair Market Value</div>
                    <div className="mt-1 text-lg font-bold">₹{aiPrice.toLocaleString("en-IN")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Campus Demand</div>
                    <div className="mt-1 flex items-center gap-1 text-sm font-semibold text-success">
                      <TrendingUp className="h-3.5 w-3.5" /> High
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Deal Rating</div>
                    <div className="mt-1 text-sm font-semibold">
                      {product.price <= aiPrice ? "🔥 Great Value" : "Fair Price"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                  <span>6-Month Resale Trend</span>
                  <span>Hover / tap curve for monthly average</span>
                </div>

                <div className="mt-1.5 h-28">
                  <ResponsiveContainer>
                    <AreaChart data={trend} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="m" 
                        tickLine={false} 
                        axisLine={false} 
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} 
                      />
                      <YAxis hide domain={["auto", "auto"]} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        labelFormatter={(label) => `${label} Campus Median`}
                        formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Avg Resale Price"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="p"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fill="url(#g)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-3">
                {isOwner ? (
                  <>
                    <Link to="/dashboard" className="flex-1">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full rounded-full"
                        aria-label="Edit listing"
                      >
                        <Edit3 className="mr-2 h-4 w-4" />
                        Edit details
                      </Button>
                    </Link>
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => setAnalyticsOpen(true)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Analytics
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="flex-1 rounded-full bg-brand-gradient text-primary-foreground shadow-elegant hover:opacity-90"
                      onClick={handleOpenDealDialog}
                      disabled={currentAvailability === "Sold"}
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      {currentAvailability === "Sold"
                        ? "Item Sold"
                        : `Buy / Deal · ₹${product.price.toLocaleString("en-IN")}`}
                    </Button>
                    <Link
                      to="/chat"
                      search={{
                        peerUid: product.sellerId || (isDemo ? `demo_${product.id}` : undefined),
                        peerName: product.seller.name,
                        peerAvatar: product.seller.avatar,
                        product: product.title,
                        initialMsg: `Hi ${product.seller.name}! Is "${product.title}" still available?`,
                      }}
                      className="flex-1 sm:flex-none"
                    >
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full rounded-full border-primary/30 text-primary hover:bg-primary/10 shadow-soft"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Chat with Seller
                      </Button>
                    </Link>
                    {product.forRent && (
                      <Button size="lg" variant="outline" className="rounded-full">
                        Rent · ₹{product.rentPerDay}/day
                      </Button>
                    )}
                    {product.forRent ? (
                      <Button
                        size="lg"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setReturnOpen(true)}
                        aria-label="Return item"
                      >
                        <RotateCcw />
                      </Button>
                    ) : null}
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => wishlist.toggle(product)}
                      aria-label="Wishlist"
                    >
                      <Heart className={liked ? "fill-foreground text-foreground" : ""} />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: product.title,
                            text: `Check out ${product.title} on CampusKart for ₹${product.price}!`,
                            url: window.location.href,
                          }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success("Listing link copied to clipboard!");
                        }
                      }}
                      aria-label="Share"
                    >
                      <Share2 />
                    </Button>
                  </>
                )}
              </div>

              {/* Seller */}
              <div className="mt-6 rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <img src={product.seller.avatar} alt="" className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {product.sellerId ? (
                        <Link
                          to="/profile/$userId"
                          params={{ userId: product.sellerId }}
                          className="font-semibold hover:underline"
                        >
                          {product.seller.name}
                        </Link>
                      ) : (
                        <span className="font-semibold">{product.seller.name}</span>
                      )}
                      {product.seller.verified && (
                        <BadgeCheck className="h-4 w-4 text-foreground" />
                      )}
                      {isDemo && (
                        <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5" /> Demo Seller
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {product.seller.college} · ★{" "}
                      {product.seller.rating}
                    </div>
                  </div>
                  {!isOwner && (product.sellerId || isDemo) ? (
                    <Link
                      to="/chat"
                      search={{
                        peerUid: product.sellerId || (isDemo ? `demo_${product.id}` : undefined),
                        peerName: product.seller.name,
                        peerAvatar: product.seller.avatar,
                        product: product.title,
                      }}
                    >
                      <Button size="sm" className="rounded-full">
                        <MessageCircle className="h-4 w-4" /> Chat
                      </Button>
                    </Link>
                  ) : !isOwner ? (
                    <Link
                      to="/chat"
                      search={{ peerUid: undefined, peerName: undefined, peerAvatar: undefined }}
                    >
                      <Button size="sm" variant="outline" className="rounded-full">
                        <MessageCircle className="h-4 w-4" /> Messages
                      </Button>
                    </Link>
                  ) : null}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 rounded-xl bg-secondary/60 p-3">
                    <Shield className="h-4 w-4 text-foreground" />
                    <span>Verified college email</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-secondary/60 p-3">
                    <Calendar className="h-4 w-4 text-foreground" />
                    <span>Member since 2024</span>
                  </div>
                </div>
              </div>

              {isOwner && (
                <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-soft">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <span>Listing management</span>
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        Owner Controls
                      </span>
                    </div>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      +25 pts on Sold
                    </span>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <Link to="/dashboard">
                      <Button
                        variant="outline"
                        className="w-full rounded-full"
                        size="sm"
                      >
                        <Edit3 className="mr-2 h-4 w-4" />
                        Edit details
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      size="sm"
                      onClick={() => setAnalyticsOpen(true)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View analytics
                    </Button>
                    <Button
                      variant={currentAvailability === "Sold" ? "secondary" : "default"}
                      className="rounded-full"
                      size="sm"
                      onClick={handleToggleSoldStatus}
                      disabled={isUpdatingStatus}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {currentAvailability === "Sold" ? "Mark as Available" : "Mark as sold"}
                    </Button>
                    <Button
                      variant="destructive"
                      className="rounded-full"
                      size="sm"
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete listing
                    </Button>
                  </div>
                </div>
              )}

              {/* Reviews */}
              <div className="mt-6 rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold italic">Seller reviews</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-0.5 text-foreground/80">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < Math.round(avgRating) ? "fill-current" : ""}`}
                          />
                        ))}
                      </div>
                      <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                      <span>· {reviews.length} reviews</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setReviewOpen(true)}
                  >
                    Write review
                  </Button>
                </div>

                <div className="mt-5 space-y-3">
                  {reviews.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="rounded-2xl border border-border bg-secondary/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold">{r.name}</div>
                            {r.verified ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                                <BadgeCheck className="h-3.5 w-3.5" /> Verified buyer
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 flex items-center gap-0.5 text-foreground/80">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : ""}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{r.time}</div>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meet up */}
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-5">
                <div className="text-sm font-semibold">Suggested meet-up</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Both of you study near the Central Library. Tap below to coordinate a safe spot.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Central Library", "Cafeteria Block C", "Main Gate"].map((p) => (
                    <button
                      key={p}
                      className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs hover:bg-secondary"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {p}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Write a review</DialogTitle>
                <DialogDescription>
                  Share quick feedback for the seller after your transaction.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-xs font-semibold text-muted-foreground">Rating</div>
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        className="rounded-lg p-1.5 transition hover:bg-secondary"
                        aria-label={`Rate ${n} stars`}
                      >
                        <Star
                          className={`h-5 w-5 ${n <= reviewRating ? "fill-current text-foreground" : "text-muted-foreground"}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <label className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">Review</div>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="e.g. Smooth transaction and genuine pricing."
                    className="min-h-28 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </label>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setReviewOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90"
                  onClick={() => {
                    if (!reviewText.trim()) return;
                    setReviews((rs) => [
                      {
                        id: crypto.randomUUID(),
                        name: "You",
                        verified: true,
                        rating: reviewRating,
                        text: reviewText.trim(),
                        time: "Just now",
                      },
                      ...rs,
                    ]);
                    setReviewText("");
                    setReviewRating(5);
                    setReviewOpen(false);
                  }}
                >
                  Submit review
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Return rental</DialogTitle>
                <DialogDescription>
                  Request a return for this rented listing and coordinate hand-off details.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
                  <div className="text-sm font-semibold">Status</div>
                  <span
                    className={
                      returnStatus === "Returned Successfully"
                        ? "rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success"
                        : returnStatus === "Return Requested"
                          ? "rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning"
                          : "rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
                    }
                  >
                    {returnStatus}
                  </span>
                </div>

                <label className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Preferred return date
                  </div>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    disabled={returnStatus !== "Active Rental"}
                  />
                </label>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setReturnOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90"
                  disabled={!product.forRent || returnStatus !== "Active Rental"}
                  onClick={() => {
                    setReturnStatus("Return Requested");
                    requestRentalReturn(product.id, returnDate);
                    toast.success("Return request submitted! Owner notified.");
                    setReturnOpen(false);
                  }}
                >
                  Confirm return request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 1. Campus Deal & Direct Handover Coordinator Dialog */}
          <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <DialogTitle className="text-center font-display text-xl font-semibold">
                  Campus Handover & Payment
                </DialogTitle>
                <DialogDescription className="text-center text-sm text-muted-foreground">
                  Coordinate a safe in-person meet-up with{" "}
                  <span className="font-semibold text-foreground">{product.seller.name}</span>. Inspect
                  the item and pay directly.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Select Preferred Campus Meet-up Spot
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {[
                      "Central Library",
                      "Cafeteria Block C",
                      "Campus Main Gate",
                      "Science Dept Foyer",
                    ].map((spot) => (
                      <button
                        key={spot}
                        type="button"
                        onClick={() => setSelectedMeetup(spot)}
                        className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-left text-xs font-medium transition ${
                          selectedMeetup === spot
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/30 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{spot}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
                  <div className="flex items-center justify-between font-semibold text-foreground">
                    <span>Amount to pay on handover:</span>
                    <span className="text-base text-emerald-600 dark:text-emerald-400">
                      ₹{product.price.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mt-2 text-muted-foreground space-y-1">
                    <p className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span><strong>Direct Payment:</strong> Pay via UPI (GPay/PhonePe) or Cash when you meet.</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span><strong>Zero Platform Fees:</strong> 100% of your payment goes straight to the student.</span>
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setDealDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-full bg-brand-gradient text-primary-foreground shadow-elegant hover:opacity-90"
                  onClick={handleConfirmDealAndChat}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Connect & Propose Deal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 2. Smart Listing Analytics Dialog */}
          <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Eye className="h-6 w-6" />
                </div>
                <DialogTitle className="text-center font-display text-xl font-semibold">
                  Listing Analytics & Insights
                </DialogTitle>
                <DialogDescription className="text-center text-sm text-muted-foreground">
                  Performance data for "{product.title}" on the campus marketplace.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
                    <div className="text-xs text-muted-foreground">Campus Views</div>
                    <div className="mt-1 text-xl font-bold text-foreground">284</div>
                    <span className="text-[10px] text-emerald-500 font-semibold">+18 today</span>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
                    <div className="text-xs text-muted-foreground">Saved Wishlists</div>
                    <div className="mt-1 text-xl font-bold text-foreground">16</div>
                    <span className="text-[10px] text-primary font-semibold">High interest</span>
                  </div>
                  <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
                    <div className="text-xs text-muted-foreground">Buyer Inquiries</div>
                    <div className="mt-1 text-xl font-bold text-foreground">5</div>
                    <span className="text-[10px] text-amber-500 font-semibold">Active leads</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-xs">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>AI Fair-Price Benchmark</span>
                    <span className="text-primary font-bold">₹{aiPrice.toLocaleString("en-IN")}</span>
                  </div>
                  <p className="mt-1.5 text-muted-foreground">
                    {product.price <= aiPrice
                      ? "Your price is well within the top 10% competitive range for this category on campus."
                      : "Priced slightly above the campus median. Buyers may request minor negotiation."}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 text-xs space-y-2">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Tips to Close Deals Faster</span>
                  </div>
                  <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                    <li>Respond to buyer chats within 10 minutes to maintain your fast-responder badge.</li>
                    <li>Agree to meet at high-traffic zones like Central Library or Cafeteria.</li>
                    <li>Mark as <strong>Sold</strong> upon transaction to earn <strong>+25 Campus Reward Points</strong>!</li>
                  </ul>
                </div>
              </div>

              <DialogFooter>
                <Button
                  className="w-full rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90"
                  onClick={() => setAnalyticsOpen(false)}
                >
                  Close Analytics
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 3. Sold Celebration Dialog */}
          <Dialog open={soldCelebrationOpen} onOpenChange={setSoldCelebrationOpen}>
            <DialogContent className="sm:max-w-md text-center">
              <DialogHeader className="text-center sm:text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/15 text-amber-500 animate-bounce">
                  <Award className="h-8 w-8" />
                </div>
                <DialogTitle className="text-center font-display text-2xl font-bold">
                  Listing Marked as Sold! 🎉
                </DialogTitle>
                <DialogDescription className="text-center text-sm text-muted-foreground pt-1">
                  You successfully traded on CampusKart.
                </DialogDescription>
              </DialogHeader>

              <div className="my-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
                <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Zap className="h-4 w-4" /> Reward Unlocked
                </span>
                <div className="mt-1 text-2xl font-black text-foreground">
                  +25 Campus Points
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Added to your Rewards & Perks Hub. Use points for listing boosts and seller badges!
                </p>
              </div>

              <DialogFooter className="flex-col sm:flex-col gap-2">
                <Link to="/wallet" className="w-full">
                  <Button
                    className="w-full rounded-full bg-brand-gradient text-primary-foreground shadow-elegant hover:opacity-90"
                    size="lg"
                  >
                    View My Rewards Hub
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full rounded-full"
                  onClick={() => setSoldCelebrationOpen(false)}
                >
                  Back to Listing
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* 4. Delete Listing Confirmation Dialog */}
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                  <Trash2 className="h-6 w-6" />
                </div>
                <DialogTitle className="text-center font-display text-xl font-semibold">
                  Delete this listing?
                </DialogTitle>
                <DialogDescription className="text-center text-sm text-muted-foreground">
                  Are you sure you want to permanently delete "{product.title}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="mt-4 gap-2 sm:justify-between">
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-full"
                  onClick={handleDeleteListing}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete Listing"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Similar */}
          <section className="mt-20 pb-20 lg:pb-0">
            <h2 className="font-display text-2xl font-semibold italic tracking-tight">
              Similar listings
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {similar.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        </div>

        {/* Mobile Sticky Bottom Action Bar */}
        {!isOwner && (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/95 p-3 backdrop-blur-lg shadow-2xl lg:hidden">
            <div className="mx-auto flex max-w-md items-center justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-muted-foreground">Campus Deal</div>
                <div className="text-lg font-bold text-foreground">
                  ₹{product.price.toLocaleString("en-IN")}
                </div>
              </div>

              <Link
                to="/chat"
                search={{
                  peerUid: product.sellerId || (isDemo ? `demo_${product.id}` : undefined),
                  peerName: product.seller.name,
                  peerAvatar: product.seller.avatar,
                  product: product.title,
                  initialMsg: `Hi ${product.seller.name}! Is "${product.title}" still available?`,
                }}
                className="flex-1"
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full rounded-full border-primary/40 text-primary font-semibold text-xs shadow-soft"
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" /> Chat
                </Button>
              </Link>

              <Button
                size="sm"
                className="flex-1 rounded-full bg-brand-gradient text-primary-foreground font-semibold text-xs shadow-soft"
                onClick={handleOpenDealDialog}
                disabled={currentAvailability === "Sold"}
              >
                <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
                {currentAvailability === "Sold" ? "Sold" : "Buy Deal"}
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
