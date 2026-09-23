import { useState, useEffect } from "react";
import { Instagram, Sparkles, CheckCircle2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  CAMPUSKART_INSTAGRAM_URL,
  claimInstagramBonus,
  isInstagramClaimed,
} from "@/lib/economy";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface InstagramFollowBannerProps {
  compact?: boolean;
  className?: string;
}

export function InstagramFollowBanner({
  compact = false,
  className = "",
}: InstagramFollowBannerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [claimed, setClaimed] = useState<boolean>(false);
  const [claiming, setClaiming] = useState<boolean>(false);

  useEffect(() => {
    if (user?.uid) {
      setClaimed(isInstagramClaimed(user.uid));
    }
  }, [user?.uid]);

  const handleFollowAndClaim = async () => {
    // Open Instagram in new window
    window.open(CAMPUSKART_INSTAGRAM_URL, "_blank", "noopener,noreferrer");

    if (!user?.uid) {
      toast.info("Follow @campuskart.business on Instagram!", {
        description: "Sign in to CampusKart to claim your +50 points reward.",
      });
      return;
    }

    if (claimed) {
      toast.success("Already following @campuskart.business!", {
        description: "Your +50 points reward is active in your rewards wallet.",
      });
      return;
    }

    setClaiming(true);
    try {
      const success = await claimInstagramBonus(user.uid);
      if (success) {
        setClaimed(true);
        queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
        queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
        toast.success("🎉 +50 Campus Points Added!", {
          description: "Thank you for following @campuskart.business! Points added to your Rewards Hub.",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClaiming(false);
    }
  };

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-2xl border border-pink-500/20 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 p-3.5 ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white shadow-sm">
            <Instagram className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span>Follow @campuskart.business</span>
              <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold text-pink-700 dark:text-pink-300">
                +50 pts
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Official campus deals & updates</p>
          </div>
        </div>

        <Button
          size="sm"
          variant={claimed ? "secondary" : "default"}
          className="rounded-full text-xs shrink-0"
          onClick={handleFollowAndClaim}
          disabled={claiming}
        >
          {claimed ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Followed
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Instagram className="h-3.5 w-3.5" /> Follow (+50 pts)
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-pink-500/20 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-amber-500/10 p-5 shadow-soft transition-all duration-300 hover:border-pink-500/40 ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white shadow-md">
            <Instagram className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-foreground text-sm sm:text-base">
                Follow @campuskart.business on Instagram
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 px-2.5 py-0.5 text-xs font-bold text-pink-700 dark:text-pink-300">
                <Sparkles className="h-3 w-3" /> +50 Bonus Points
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Stay ahead of campus item drops, seller giveaways, and peer announcements. Follow now to instantly claim 50 reward points!
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5 sm:self-center">
          <Button
            onClick={handleFollowAndClaim}
            disabled={claiming}
            className={`rounded-full shadow-md text-xs font-semibold px-4 py-2 transition-all ${
              claimed
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : "bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] text-white hover:opacity-95"
            }`}
          >
            {claimed ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Following @campuskart.business (50 pts Claimed)
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Instagram className="h-4 w-4" /> Follow & Claim +50 pts <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
