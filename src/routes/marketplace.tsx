import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  Check,
  MapPin,
  HandHeart,
  ShoppingBag,
  Clock,
  IndianRupee,
  GraduationCap,
  BadgeCheck,
  MessageCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { type Category, type ItemRequest } from "@/lib/mock-data";
import { categorySummaries, useCatalog } from "@/lib/catalog";
import { useCampusItemRequests } from "@/lib/item-requests-catalog";
import { RequestItemModal } from "@/components/request-item-modal";
import { cn } from "@/lib/utils";
import { CAMPUSES } from "@/lib/campus";
import { toast } from "sonner";

type SearchParams = { category?: string; tab?: string };

export const Route = createFileRoute("/marketplace")({
  component: MarketplacePage,
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    category: typeof s.category === "string" ? s.category : undefined,
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
});

function MarketplacePage() {
  const search = Route.useSearch();
  const { products, loading, firestoreError } = useCatalog();
  const { requests, loading: requestsLoading } = useCampusItemRequests();
  const categories = useMemo(() => categorySummaries(products), [products]);

  const [activeTab, setActiveTab] = useState<"listings" | "requests">(
    search.tab === "requests" ? "requests" : "listings",
  );
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [provideFor, setProvideFor] = useState<ItemRequest | null>(null);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<Category | null>(
    (search.category as Category) ?? null,
  );
  const [conditions, setConditions] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(60000);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<"new" | "low" | "high">("new");

  const [buyRent, setBuyRent] = useState<"all" | "buy" | "rent">("all");
  const [departments, setDepartments] = useState<string[]>([]);
  const [availabilities, setAvailabilities] = useState<string[]>(["Available"]);
  const [recentlyAdded, setRecentlyAdded] = useState(false);
  const [negotiable, setNegotiable] = useState(false);
  const [selectedCampuses, setSelectedCampuses] = useState<string[]>([]);

  const normalizedConditions = useMemo(
    () => conditions.map((c) => (c === "Used" ? "Fair" : c)),
    [conditions],
  );

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (activeCat && p.category !== activeCat) return false;
      if (normalizedConditions.length && !normalizedConditions.includes(p.condition)) return false;
      if (p.price > maxPrice) return false;
      if (verifiedOnly && !p.seller.verified) return false;
      if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;

      if (buyRent === "buy" && p.forRent) return false;
      if (buyRent === "rent" && !p.forRent) return false;

      if (departments.length) {
        const dept = p.department ?? "";
        if (!dept || !departments.includes(dept)) return false;
      }

      const availability = p.availability ?? "Available";
      if (availabilities.length && !availabilities.includes(availability)) return false;

      if (recentlyAdded) {
        const pa = p.postedAgo.toLowerCase();
        const looksRecent =
          pa.includes("min ago") ||
          pa === "just now" ||
          pa.includes("hour") ||
          pa.includes("hours ago");
        if (!looksRecent) return false;
      }

      if (negotiable && !p.negotiable) return false;

      if (selectedCampuses.length) {
        const hay = `${p.seller.college} ${p.pickupLocation ?? ""}`.toLowerCase();
        const matchCampus = selectedCampuses.some((c) => hay.includes(c.toLowerCase()));
        if (!matchCampus) return false;
      }

      return true;
    });
    if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [
    activeCat,
    availabilities,
    buyRent,
    departments,
    maxPrice,
    negotiable,
    normalizedConditions,
    products,
    query,
    recentlyAdded,
    selectedCampuses,
    sort,
    verifiedOnly,
  ]);

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (activeCat && r.category !== activeCat) return false;
      if (departments.length) {
        const dept = r.department ?? "";
        if (!dept || !departments.includes(dept)) return false;
      }
      if (selectedCampuses.length) {
        const hay = `${r.campus} ${r.department ?? ""}`.toLowerCase();
        const matchCampus = selectedCampuses.some((c) => hay.includes(c.toLowerCase()));
        if (!matchCampus) return false;
      }
      if (query) {
        const q = query.toLowerCase();
        const match =
          r.itemName.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.student.name.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [requests, activeCat, departments, selectedCampuses, query]);

  const toggleArrayItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    item: string,
  ) => {
    setter((prev) => (prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]));
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-border bg-hero-gradient">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="font-display text-4xl font-semibold italic tracking-tight sm:text-5xl">
              Marketplace
            </h1>
            <p className="mt-2 text-muted-foreground">
              Discover what MGM College students are buying, selling and renting today on CampusKart.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-3 shadow-soft">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    activeTab === "requests"
                      ? "Search student requests, notes, gadgets..."
                      : "Search MGM College listings…"
                  }
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:contents">
                <Button
                  onClick={() => setRequestModalOpen(true)}
                  className="flex-1 rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90 sm:flex-none"
                >
                  <HandHeart className="mr-1.5 h-4 w-4" />
                  Request Item
                </Button>
                <button
                  onClick={() =>
                    document.getElementById("mobile-filters")?.classList.toggle("hidden")
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium shadow-soft transition hover:bg-secondary lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </button>
                {activeTab === "listings" && (
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as typeof sort)}
                    className="flex-1 rounded-full border border-border bg-card px-4 py-3 text-sm shadow-soft outline-none sm:flex-none"
                  >
                    <option value="new">Newest</option>
                    <option value="low">Price: low to high</option>
                    <option value="high">Price: high to low</option>
                  </select>
                )}
              </div>
            </div>

            {/* Top View Selector Tabs */}
            <div className="mt-8 flex items-center gap-2 border-b border-border/70">
              <button
                onClick={() => setActiveTab("listings")}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition -mb-px",
                  activeTab === "listings"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <ShoppingBag className="h-4 w-4" />
                Browse Catalog ({filtered.length})
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition -mb-px",
                  activeTab === "requests"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <HandHeart className="h-4 w-4" />
                Student Requests ({filteredRequests.length})
              </button>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
          <aside id="mobile-filters" className="hidden lg:block">
            <div className="sticky top-24 space-y-1 rounded-2xl border border-border bg-card p-5 shadow-soft">
              <div className="mb-2 flex items-center justify-between pb-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </div>
                {(activeCat ||
                  conditions.length > 0 ||
                  maxPrice < 60000 ||
                  verifiedOnly ||
                  buyRent !== "all" ||
                  departments.length > 0 ||
                  availabilities.length > 1 ||
                  recentlyAdded ||
                  negotiable ||
                  selectedCampuses.length > 0) && (
                  <button
                    onClick={() => {
                      setActiveCat(null);
                      setConditions([]);
                      setMaxPrice(60000);
                      setVerifiedOnly(false);
                      setBuyRent("all");
                      setDepartments([]);
                      setAvailabilities(["Available"]);
                      setRecentlyAdded(false);
                      setNegotiable(false);
                      setSelectedCampuses([]);
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>

              <FilterBlock title="Category">
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveCat(null)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                      !activeCat ? "bg-secondary font-medium" : "hover:bg-secondary/60",
                    )}
                  >
                    <span>All</span>
                    <span className="text-xs text-muted-foreground">{products.length}</span>
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setActiveCat(c.name)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                        activeCat === c.name ? "bg-secondary font-medium" : "hover:bg-secondary/60",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-secondary text-foreground transition group-hover:text-primary">
                          <CategoryIcon category={c.name} size={16} animated={false} />
                        </span>
                        {c.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{c.count}</span>
                    </button>
                  ))}
                </div>
              </FilterBlock>

              <FilterBlock title="Transaction Type">
                <div className="flex rounded-lg border border-border bg-secondary/50 p-1">
                  {["all", "buy", "rent"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setBuyRent(t as "all" | "buy" | "rent")}
                      className={cn(
                        "flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition",
                        buyRent === t
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </FilterBlock>

              <FilterBlock title={`Price range · ₹0 - ₹${maxPrice.toLocaleString("en-IN")}`}>
                <input
                  type="range"
                  min={100}
                  max={60000}
                  step={100}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <label className="flex cursor-pointer items-center gap-2">
                    <div
                      className={cn(
                        "grid h-4 w-4 place-items-center rounded border transition",
                        negotiable
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {negotiable && <Check className="h-3 w-3" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={negotiable}
                      onChange={(e) => setNegotiable(e.target.checked)}
                      className="hidden"
                    />
                    Negotiable only
                  </label>
                </div>
              </FilterBlock>

              <FilterBlock title="Condition">
                <div className="flex flex-wrap gap-2">
                  {["New", "Like New", "Good", "Fair"].map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleArrayItem(setConditions, c)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition",
                        conditions.includes(c)
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border hover:border-primary/40 bg-card hover:bg-secondary/50",
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </FilterBlock>

              <FilterBlock title="Department">
                <div className="space-y-2">
                  {["CSE", "Mechanical", "Civil", "ECE", "MBA"].map((d) => (
                    <label key={d} className="flex cursor-pointer items-center gap-2 text-sm">
                      <div
                        className={cn(
                          "grid h-4 w-4 place-items-center rounded border transition",
                          departments.includes(d)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input",
                        )}
                      >
                        {departments.includes(d) && <Check className="h-3 w-3" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={departments.includes(d)}
                        onChange={() => toggleArrayItem(setDepartments, d)}
                        className="hidden"
                      />
                      {d}
                    </label>
                  ))}
                </div>
              </FilterBlock>

              <FilterBlock title="Availability">
                <div className="space-y-2">
                  {["Available", "Sold", "Reserved"].map((a) => (
                    <label key={a} className="flex cursor-pointer items-center gap-2 text-sm">
                      <div
                        className={cn(
                          "grid h-4 w-4 place-items-center rounded border transition",
                          availabilities.includes(a)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input",
                        )}
                      >
                        {availabilities.includes(a) && <Check className="h-3 w-3" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={availabilities.includes(a)}
                        onChange={() => toggleArrayItem(setAvailabilities, a)}
                        className="hidden"
                      />
                      {a}
                    </label>
                  ))}
                </div>
              </FilterBlock>

              <FilterBlock title="Campus" defaultOpen={false}>
                <div className="space-y-2">
                  {CAMPUSES.map((campus) => (
                    <label key={campus} className="flex cursor-pointer items-center gap-2 text-sm">
                      <div
                        className={cn(
                          "grid h-4 w-4 place-items-center rounded border transition",
                          selectedCampuses.includes(campus)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input",
                        )}
                      >
                        {selectedCampuses.includes(campus) && <Check className="h-3 w-3" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedCampuses.includes(campus)}
                        onChange={() => toggleArrayItem(setSelectedCampuses, campus)}
                        className="hidden"
                      />
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {campus}
                    </label>
                  ))}
                </div>
              </FilterBlock>

              <FilterBlock title="Trust & Status" defaultOpen={false}>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <div
                      className={cn(
                        "grid h-4 w-4 place-items-center rounded border transition",
                        verifiedOnly
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {verifiedOnly && <Check className="h-3 w-3" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                      className="hidden"
                    />
                    Verified sellers only
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <div
                      className={cn(
                        "grid h-4 w-4 place-items-center rounded border transition",
                        recentlyAdded
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {recentlyAdded && <Check className="h-3 w-3" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={recentlyAdded}
                      onChange={(e) => setRecentlyAdded(e.target.checked)}
                      className="hidden"
                    />
                    Recently added
                  </label>
                </div>
              </FilterBlock>
            </div>
          </aside>

          <section>
            {activeTab === "listings" ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
                    listings
                    {activeCat && (
                      <>
                        {" "}
                        in <span className="font-semibold text-foreground">{activeCat}</span>
                      </>
                    )}
                  </p>
                  {(activeCat || conditions.length || verifiedOnly || query) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveCat(null);
                        setConditions([]);
                        setVerifiedOnly(false);
                        setQuery("");
                      }}
                    >
                      <X className="h-4 w-4" /> Clear
                    </Button>
                  )}
                </div>

                {firestoreError && (
                  <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm font-medium text-destructive">
                      Firestore connection issue
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Showing cached listings only. Live updates unavailable.
                    </p>
                  </div>
                )}

                {loading && filtered.length === 0 ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="h-48 rounded-2xl border border-border bg-secondary/30 animate-pulse"
                      />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <EmptyState />
                ) : (
                  <motion.div
                    layout
                    className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
                  >
                    {filtered.map((p, i) => (
                      <ProductCard key={p.id} product={p} index={i} />
                    ))}
                  </motion.div>
                )}

                <ListingCountFooter total={filtered.length} />
              </>
            ) : (
              /* Student Requests Tab */
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing{" "}
                    <span className="font-semibold text-foreground">
                      {filteredRequests.length}
                    </span>{" "}
                    active student request{filteredRequests.length === 1 ? "" : "s"}
                    {activeCat && (
                      <>
                        {" "}
                        in <span className="font-semibold text-foreground">{activeCat}</span>
                      </>
                    )}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setRequestModalOpen(true)}
                    className="rounded-full bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90"
                  >
                    <HandHeart className="mr-1.5 h-3.5 w-3.5" /> Post Request
                  </Button>
                </div>

                {requestsLoading && filteredRequests.length === 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="h-56 rounded-2xl border border-border bg-secondary/30 animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-foreground shadow-soft">
                      <HandHeart className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">No requests found</h3>
                    <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                      Need a textbook, lab drafter, or component? Post a request and campus peers will reach out.
                    </p>
                    <Button
                      onClick={() => setRequestModalOpen(true)}
                      className="mt-5 rounded-full bg-brand-gradient text-primary-foreground shadow-soft"
                    >
                      Post a Request
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredRequests.map((req, i) => (
                      <MarketplaceRequestCard
                        key={req.id}
                        request={req}
                        index={i}
                        onProvide={() => setProvideFor(req)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
      <RequestItemModal open={requestModalOpen} onClose={() => setRequestModalOpen(false)} />
      <MarketplaceProvideModal request={provideFor} onClose={() => setProvideFor(null)} />
      <Footer />
    </div>
  );
}

function MarketplaceRequestCard({
  request,
  index,
  onProvide,
}: {
  request: ItemRequest;
  index: number;
  onProvide: () => void;
}) {
  const urgencyColors: Record<string, string> = {
    Urgent: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    High: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
    Medium: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    Low: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:shadow-elegant"
    >
      <div>
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
              urgencyColors[request.urgency] || urgencyColors.Medium,
            )}
          >
            {request.urgency === "Urgent" && "🔥"} {request.urgency}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {request.postedAgo || "Recently"}
          </span>
        </div>

        <h3 className="mt-3 text-base font-semibold leading-snug">{request.itemName}</h3>
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
          {request.description || "No extra description provided."}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            <IndianRupee className="h-3 w-3" /> ₹{request.budgetMin.toLocaleString("en-IN")} - ₹
            {request.budgetMax.toLocaleString("en-IN")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
            <GraduationCap className="h-3 w-3" /> {request.department || "General"}
          </span>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Preferred: <span className="font-medium text-foreground">{request.condition}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <img
            src={
              request.student.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(request.id)}`
            }
            alt=""
            className="h-6 w-6 rounded-full"
          />
          <span className="text-xs font-medium text-foreground">{request.student.name}</span>
        </div>
        <Button
          size="sm"
          onClick={onProvide}
          className="rounded-full bg-brand-gradient px-3 py-1 text-xs text-primary-foreground shadow-soft hover:opacity-90"
        >
          I Can Provide
        </Button>
      </div>
    </motion.div>
  );
}

function MarketplaceProvideModal({
  request,
  onClose,
}: {
  request: ItemRequest | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    await new Promise((r) => setTimeout(r, 300));
    setSending(false);
    toast.success("Draft ready", {
      description: `Opening message thread with ${request?.student.name}.`,
    });
    setMessage("");
    onClose();
    void navigate({
      to: "/chat",
      search: { peerUid: undefined, peerName: undefined, peerAvatar: undefined },
    });
  };

  return (
    <AnimatePresence>
      {request && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-elegant"
          >
            <div className="absolute left-0 right-0 top-0 h-1 bg-brand-gradient" />
            <div className="p-6">
              <h3 className="text-base font-semibold">Respond to request</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Let <span className="font-medium text-foreground">{request.student.name}</span> know
                you can provide:
              </p>
              <div className="mt-3 rounded-xl border border-border bg-secondary/50 p-3">
                <div className="text-sm font-medium">{request.itemName}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Budget: ₹{request.budgetMin.toLocaleString("en-IN")} - ₹
                  {request.budgetMax.toLocaleString("en-IN")}
                </div>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! I have this item available. It's in great condition and I can meet you on campus..."
                rows={3}
                className="mt-4 w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!message.trim() || sending}
                  onClick={handleSend}
                  className="rounded-full bg-brand-gradient px-5 text-primary-foreground shadow-soft hover:opacity-90"
                >
                  <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  Send Message
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FilterBlock({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/60 py-3 last:border-0 last:pb-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-sm font-semibold text-foreground hover:text-primary transition-colors"
      >
        {title}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-4 pb-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-foreground shadow-soft">
        <Search className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No listings found</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Try adjusting your filters or search terms.
      </p>
    </div>
  );
}

function ListingCountFooter({ total }: { total: number }) {
  return (
    <p className="mt-10 text-center text-sm text-muted-foreground">
      Showing {total} listing{total === 1 ? "" : "s"}.
      {total > 48 ? (
        <span className="ml-1">
          Consider narrowing filters — classic paging can be added when the catalog grows further.
        </span>
      ) : null}
    </p>
  );
}
