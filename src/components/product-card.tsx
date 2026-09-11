import { Link } from "@tanstack/react-router";
import { Heart, BadgeCheck, MapPin, Clock, Tag } from "lucide-react";
import { motion } from "framer-motion";
import type { Product } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useWishlist } from "@/lib/wishlist";
import { ListingRiskBadge } from "@/components/listing-safety-banner";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const wishlist = useWishlist();
  const liked = wishlist.has(product.id);
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
    >
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:shadow-elegant"
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          <ListingRiskBadge product={product} />
          <img
            src={product.image}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              wishlist.toggle(product);
            }}
            aria-label="Wishlist"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/80 backdrop-blur transition hover:bg-background"
          >
            <Heart className={cn("h-4 w-4", liked && "fill-foreground text-foreground")} />
          </button>
          {discount && (
            <span className="absolute left-3 top-3 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
              {discount}% OFF
            </span>
          )}
          {product.forRent && (
            <span className="absolute bottom-3 left-3 rounded-full bg-brand-gradient px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-soft">
              Rent · ₹{product.rentPerDay}/day
            </span>
          )}
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
              <Tag className="h-3 w-3" /> {product.category}
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5">{product.condition}</span>
            {product.usedFor ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                <Clock className="h-3 w-3" /> {product.usedFor}
              </span>
            ) : null}
            {product.availability ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5",
                  product.availability === "Available"
                    ? "bg-success/15 text-success"
                    : product.availability === "Reserved"
                      ? "bg-warning/15 text-warning"
                      : "bg-destructive/15 text-destructive",
                )}
              >
                {product.availability}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{product.title}</h3>
          {product.shortDescription ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {product.shortDescription}
            </p>
          ) : null}

          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="text-lg font-bold tracking-tight">
                ₹{product.price.toLocaleString("en-IN")}
              </div>
              {product.originalPrice && (
                <div className="text-xs text-muted-foreground line-through">
                  ₹{product.originalPrice.toLocaleString("en-IN")}
                </div>
              )}
              {typeof product.negotiable === "boolean" ? (
                <div className="mt-1 text-[11px] font-medium text-muted-foreground">
                  {product.negotiable ? "Negotiable" : "Fixed price"}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <img src={product.seller.avatar} alt="" className="h-6 w-6 rounded-full" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-xs font-medium">
                <span className="truncate">{product.seller.name}</span>
                {product.seller.verified && (
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-foreground" />
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">
                  {product.pickupLocation ? product.pickupLocation : product.seller.college}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
