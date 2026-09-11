import { createFileRoute, Link, notFound } from "@tanstack/react-router";
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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { useCatalog } from "@/lib/catalog";
import { useWishlist } from "@/lib/wishlist";
import { useAuth } from "@/lib/auth";
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
import { useTransferCoins } from "@/lib/economy";
import { Coins } from "lucide-react";

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
  const { products } = useCatalog();
  const product = products.find((p) => p.id === id);
  const { user } = useAuth();
  
  if (!product) throw notFound();
  
  const isOwner = user?.uid && product.sellerId === user.uid;
  
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
  const gallery = product.images?.length
    ? product.images
    : [product.image, product.image, product.image, product.image];
  const similar = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  const { mutate: transferCoins, isPending: transferring } = useTransferCoins();

  const handleBuyWithCoins = () => {
    if (!product.sellerId) {
      toast.error("Cannot buy: Seller not found.");
      return;
    }
    
    if (product.sellerId === user?.uid) {
      toast.error("You cannot purchase your own listing.");
      return;
    }
    
    transferCoins(
      {
        receiverId: product.sellerId,
        amount: product.price,
        type: "buy",
        referenceId: product.id,
        description: `Bought ${product.title}`,
      },
      {
        onSuccess: () => {
          toast.success("Purchase successful! Coins transferred.");
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  const aiPrice = Math.round(product.price * 0.96);
  const trend = [
    { m: "Apr", p: aiPrice + 400 },
    { m: "May", p: aiPrice + 280 },
    { m: "Jun", p: aiPrice + 150 },
    { m: "Jul", p: aiPrice + 80 },
    { m: "Aug", p: aiPrice + 30 },
    { m: "Sep", p: aiPrice },
  ];

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
                {product.availability ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5">
                    {product.availability}
                  </span>
                ) : null}
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
                      <div className="text-sm font-semibold">AI fair-price estimate</div>
                      <div className="text-xs text-muted-foreground">
                        Based on 142 similar campus listings
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success">
                    94% confidence
                  </span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Estimated value</div>
                    <div className="mt-1 text-lg font-bold">₹{aiPrice.toLocaleString("en-IN")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Demand</div>
                    <div className="mt-1 flex items-center gap-1 text-sm font-semibold text-success">
                      <TrendingUp className="h-3.5 w-3.5" /> High
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Condition impact</div>
                    <div className="mt-1 text-sm font-semibold">+8% premium</div>
                  </div>
                </div>
                <div className="mt-4 h-24">
                  <ResponsiveContainer>
                    <AreaChart data={trend} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
                      <defs>
                        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="m" hide />
                      <YAxis hide domain={["auto", "auto"]} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Avg"]}
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
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1 rounded-full"
                      aria-label="Edit listing"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit listing
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full"
                      aria-label="Delete listing"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="flex-1 rounded-full bg-brand-gradient text-primary-foreground shadow-elegant hover:opacity-90"
                      onClick={handleBuyWithCoins}
                      disabled={transferring || !product.sellerId}
                    >
                      <Coins className="mr-2 h-4 w-4" />
                      {transferring
                        ? "Processing..."
                        : `Buy with Coins · ${product.price.toLocaleString("en-IN")}`}
                    </Button>
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
                    <div className="flex items-center gap-1.5">
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
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {product.seller.college} · ★{" "}
                      {product.seller.rating}
                    </div>
                  </div>
                  {!isOwner && product.sellerId ? (
                    <Link
                      to="/chat"
                      search={{
                        peerUid: product.sellerId,
                        peerName: product.seller.name,
                        peerAvatar: product.seller.avatar,
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
                <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-50/5 p-5">
                  <div className="text-sm font-semibold">Listing management</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Button variant="outline" className="rounded-full" size="sm">
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit details
                    </Button>
                    <Button variant="outline" className="rounded-full" size="sm">
                      View analytics
                    </Button>
                    <Button variant="outline" className="rounded-full" size="sm">
                      Mark as sold
                    </Button>
                    <Button variant="destructive" className="rounded-full" size="sm">
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
                  onClick={() => setReturnStatus("Return Requested")}
                >
                  Confirm return request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Similar */}
          <section className="mt-20">
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
      </main>
      <Footer />
    </div>
  );
}
