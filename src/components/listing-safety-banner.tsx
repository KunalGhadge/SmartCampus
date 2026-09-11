import { AlertTriangle, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/mock-data";
import { analyzeListingRisk, type ListingRiskLevel } from "@/lib/product-safety";

function tone(level: ListingRiskLevel): {
  wrap: string;
  icon: typeof ShieldAlert;
  title: string;
} {
  switch (level) {
    case "high":
      return {
        wrap: "border-destructive/50 bg-destructive/10 text-destructive",
        icon: ShieldAlert,
        title: "High — review carefully before paying or meeting",
      };
    case "medium":
      return {
        wrap: "border-warning/40 bg-warning/10 text-foreground",
        icon: AlertTriangle,
        title: "Medium — extra caution advised",
      };
    case "low":
      return {
        wrap: "border-primary/30 bg-primary/5 text-foreground",
        icon: Info,
        title: "Low — minor signals only",
      };
    default:
      return { wrap: "", icon: Info, title: "" };
  }
}

export function ListingSafetyBanner({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const report = analyzeListingRisk(product);
  if (report.level === "none") return null;

  const { wrap, icon: Icon, title } = tone(report.level);

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        wrap,
        className,
      )}
    >
      <div className="flex gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <div className="font-semibold">Safety check · {title}</div>
          <p className="mt-1 text-xs opacity-90">
            Automated screening only — not proof of fraud. Prefer verified sellers, meet on campus,
            and never send prepaid transfers to strangers.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs opacity-95">
            {report.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function ListingRiskBadge({ product }: { product: Product }) {
  const { level } = analyzeListingRisk(product);
  if (level === "none" || level === "low") return null;

  return (
    <span
      className={cn(
        "absolute left-3 top-3 z-[1] inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm",
        level === "high"
          ? "bg-destructive text-destructive-foreground"
          : "bg-warning text-warning-foreground",
      )}
      title="Automated listing risk flag — tap listing for details"
    >
      <AlertTriangle className="h-3 w-3" />
      {level === "high" ? "Risk" : "Review"}
    </span>
  );
}
