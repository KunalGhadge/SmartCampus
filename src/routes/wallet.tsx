import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useWalletBalance,
  useTransactionHistory,
  saveWalletBalance,
  addWalletTransaction,
} from "@/lib/economy";
import {
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Award,
  Zap,
  ShieldCheck,
  PlusCircle,
  CheckCircle2,
  Users,
  Share2,
  Tag,
  Star,
  Flame,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/lib/route-auth";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const { user, loading } = useRequireAuth("/login");
  const queryClient = useQueryClient();
  const {
    data: rawBalance = 150,
    isLoading: loadingBalance,
  } = useWalletBalance();
  const {
    data: transactions = [],
    isLoading: loadingTx,
  } = useTransactionHistory();

  // Local points balance state (initial balance + dynamic rewards)
  const [points, setPoints] = useState<number>(rawBalance);

  useEffect(() => {
    if (typeof rawBalance === "number") {
      setPoints(rawBalance);
    }
  }, [rawBalance]);

  const [claimedPerks, setClaimedPerks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`campuskart_claimed_perks_${user?.uid || "guest"}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleClaimPerk = async (perkId: string, cost: number, title: string) => {
    if (points < cost) {
      toast.error("Insufficient Campus Points", {
        description: `You need ${cost} points to redeem ${title}. Complete more campus deals to earn points!`,
      });
      return;
    }

    const newBalance = points - cost;
    setPoints(newBalance);
    const updatedPerks = [...claimedPerks, perkId];
    setClaimedPerks(updatedPerks);

    if (user?.uid) {
      try {
        localStorage.setItem(`campuskart_claimed_perks_${user.uid}`, JSON.stringify(updatedPerks));
        await saveWalletBalance(user.uid, newBalance);
        await addWalletTransaction(user.uid, {
          senderId: user.uid,
          receiverId: "campuskart_perks",
          amount: cost,
          type: "perk_redemption",
          description: `Perk Redeemed · ${title}`,
        });
        queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
        queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      } catch (err) {
        console.error("Failed to persist perk redemption", err);
      }
    }

    toast.success(`🎉 ${title} Claimed!`, {
      description: `${cost} points deducted. Perk is now active on your account.`,
    });
  };

  const handleShareInvite = () => {
    const inviteUrl = window.location.origin;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
      toast.success("Campus Invite Link Copied!", {
        description: "Share with classmates. Earn +30 points when they sign up with their campus email.",
      });
    }
  };

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading Campus Rewards Hub...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Campus Engagement & Loyalty
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Campus Rewards & Perks Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Earn points by trading, verifying, and reviewing on CampusKart. Redeem points for listing boosts and badges!
          </p>
        </div>

        <Link to="/dashboard">
          <Button className="rounded-full bg-brand-gradient text-primary-foreground shadow-elegant hover:opacity-90">
            <PlusCircle className="mr-2 h-4 w-4" /> Post a Listing (+20 pts)
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Points Balance Card */}
        <Card className="col-span-1 border-none bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-amber-100 flex items-center gap-2 text-sm uppercase tracking-wider font-semibold">
                <Award className="h-5 w-5 text-amber-200" /> Reward Points
              </CardTitle>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur">
                Silver Tier
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tracking-tight">
              {loadingBalance ? "..." : points.toLocaleString()}
            </div>
            <p className="mt-2 text-xs text-amber-100/90 leading-relaxed">
              Use points to boost your listings to the top of the campus feed or unlock verified seller badges.
            </p>

            <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between text-xs">
              <span className="text-amber-100/80">Next Tier: Gold Trader</span>
              <span className="font-semibold text-white">500 pts</span>
            </div>
          </CardContent>
        </Card>

        {/* Ways to Earn Points */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" /> Ways to Earn Points
            </CardTitle>
            <CardDescription>Participate in the campus marketplace to earn points</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/20 p-3.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>Verified Campus Email</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">+50 pts</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">Activated upon student account verification.</p>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                    <CheckCircle2 className="h-3 w-3" /> Completed
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/20 p-3.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Award className="h-5 w-5" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>Mark an Item as Sold</span>
                    <span className="font-bold text-primary">+25 pts</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">Complete a deal with a fellow student.</p>
                  <Link to="/dashboard" className="text-[11px] font-semibold text-primary hover:underline mt-1 inline-block">
                    Manage My Listings →
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/20 p-3.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
                  <Star className="h-5 w-5" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>Leave a Seller Review</span>
                    <span className="font-bold text-amber-500">+10 pts</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">Rate your experience after a campus meetup.</p>
                  <Link to="/marketplace" className="text-[11px] font-semibold text-primary hover:underline mt-1 inline-block">
                    Explore Marketplace →
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-secondary/20 p-3.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-purple-500/10 text-purple-500">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>Invite a Classmate</span>
                    <span className="font-bold text-purple-500">+30 pts</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">Share CampusKart with fellow students.</p>
                  <button
                    onClick={handleShareInvite}
                    className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    <Share2 className="h-3 w-3" /> Copy Invite Link
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Redeem Perks Section */}
      <div className="mt-10">
        <div className="mb-4">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Redeem Rewards & Listing Perks
          </h2>
          <p className="text-sm text-muted-foreground">
            Spend your earned points to boost visibility and accelerate your sales on campus.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Perk 1 */}
          <Card className="rounded-3xl border border-border bg-card shadow-soft transition hover:border-primary/50">
            <CardHeader>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-500 mb-2">
                <Flame className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-semibold">7-Day Listing Spotlight</CardTitle>
              <CardDescription className="text-xs">
                Pins your listing to the top of category feeds for 7 days. Gets 3x more buyer inquiries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">100 Points</span>
                <Button
                  size="sm"
                  variant={claimedPerks.includes("spotlight") ? "secondary" : "default"}
                  className="rounded-full"
                  disabled={claimedPerks.includes("spotlight")}
                  onClick={() => handleClaimPerk("spotlight", 100, "7-Day Listing Spotlight")}
                >
                  {claimedPerks.includes("spotlight") ? "Active" : "Redeem Perk"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Perk 2 */}
          <Card className="rounded-3xl border border-border bg-card shadow-soft transition hover:border-primary/50">
            <CardHeader>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-red-500/10 text-red-500 mb-2">
                <Tag className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-semibold">Urgent Sale Badge</CardTitle>
              <CardDescription className="text-xs">
                Adds a prominent Urgent tag to highlight items you need to sell quickly before semester ends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-sm font-bold text-red-600 dark:text-red-400">50 Points</span>
                <Button
                  size="sm"
                  variant={claimedPerks.includes("urgent") ? "secondary" : "default"}
                  className="rounded-full"
                  disabled={claimedPerks.includes("urgent")}
                  onClick={() => handleClaimPerk("urgent", 50, "Urgent Sale Badge")}
                >
                  {claimedPerks.includes("urgent") ? "Active" : "Redeem Perk"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Perk 3 */}
          <Card className="rounded-3xl border border-border bg-card shadow-soft transition hover:border-primary/50">
            <CardHeader>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500 mb-2">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <CardTitle className="text-base font-semibold">Verified Campus Pro Badge</CardTitle>
              <CardDescription className="text-xs">
                Displays a trusted Pro Trader badge on your profile and all your listings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">150 Points</span>
                <Button
                  size="sm"
                  variant={claimedPerks.includes("pro") ? "secondary" : "default"}
                  className="rounded-full"
                  disabled={claimedPerks.includes("pro")}
                  onClick={() => handleClaimPerk("pro", 150, "Verified Campus Pro Badge")}
                >
                  {claimedPerks.includes("pro") ? "Active" : "Redeem Perk"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity History */}
      <div className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" /> Points Activity Log
            </CardTitle>
            <CardDescription>Recent points earned and perks redeemed</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTx ? (
              <div className="flex h-24 items-center justify-center text-muted-foreground">
                Loading history...
              </div>
            ) : transactions.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary/20 p-3.5 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
                      <ArrowDownLeft className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Welcome Bonus & Email Verification</p>
                      <p className="text-muted-foreground">Initial student registration reward</p>
                    </div>
                  </div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">+150 pts</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => {
                  const isSender = tx.senderId === user?.uid;
                  const Icon = isSender ? ArrowUpRight : ArrowDownLeft;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary/20 p-3.5 text-xs transition-colors hover:bg-secondary/40"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-8 w-8 place-items-center rounded-full ${
                            isSender
                              ? "bg-red-500/10 text-red-500"
                              : "bg-emerald-500/10 text-emerald-500"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{tx.description}</p>
                          <p className="text-muted-foreground">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`font-bold ${
                          isSender ? "text-red-500" : "text-emerald-500"
                        }`}
                      >
                        {isSender ? "-" : "+"}
                        {tx.amount.toLocaleString()} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

