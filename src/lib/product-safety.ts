import type { Product } from "@/lib/mock-data";

export type ListingRiskLevel = "none" | "low" | "medium" | "high";

export type ListingRiskReport = {
  level: ListingRiskLevel;
  score: number;
  reasons: string[];
};

const SCAM_PHRASES = [
  "western union",
  "wire transfer only",
  "gift card only",
  "pay outside the app",
  "pay outside platform",
  "whatsapp payment first",
  "paytm first then",
  "no meetup",
  "crypto only",
  "bitcoin only",
  "pay half upfront",
  "bank transfer before meet",
  "send money first then",
  "outside india shipping only",
  "urgent sale today only wire",
];

/**
 * Heuristic-only screening (no ML). Intended to flag listings worth double-checking —
 * not a guarantee of fraud or safety.
 */
export function analyzeListingRisk(product: Product): ListingRiskReport {
  const reasons: string[] = [];
  let score = 0;

  const blob = `${product.title}\n${product.description}\n${product.shortDescription ?? ""}`.toLowerCase();

  for (const phrase of SCAM_PHRASES) {
    if (blob.includes(phrase)) {
      score += 28;
      reasons.push(`Language matches a common risky-payment pattern (“${phrase}”).`);
    }
  }

  const externalUrl = /\bhttps?:\/\/[^\s]+/i.test(blob);
  if (externalUrl) {
    score += 14;
    reasons.push("Listing contains external links — stay on in-app messaging when possible.");
  }

  if (product.originalPrice && product.originalPrice > 4000 && product.price < product.originalPrice * 0.12) {
    score += 22;
    reasons.push("Price is extremely low compared to the stated original price.");
  }

  const titleLower = product.title.toLowerCase();
  if (
    product.category === "Electronics" &&
    product.price > 0 &&
    product.price < 800 &&
    !product.forRent &&
    /macbook|iphone|ipad|laptop|airpods|galaxy s|pixel/i.test(titleLower)
  ) {
    score += 26;
    reasons.push("Electronics title suggests premium gear but the price looks unusually low.");
  }

  if (!product.seller.verified && product.price >= 12000) {
    score += 16;
    reasons.push("High-value item from an unverified seller — prefer verified peers or inspect in person.");
  }

  const letters = product.title.replace(/[^a-zA-Z]/g, "");
  const upper = product.title.replace(/[^A-Z]/g, "").length;
  if (letters.length >= 18 && upper / letters.length > 0.55) {
    score += 10;
    reasons.push("Title uses excessive capitals — sometimes seen in spam listings.");
  }

  if (product.negotiable === false && product.price > 20000 && blob.includes("firm")) {
    score += 8;
    reasons.push("Strict “firm price” on expensive items can be legitimate — still verify authenticity.");
  }

  let level: ListingRiskLevel = "none";
  if (score >= 48) level = "high";
  else if (score >= 26) level = "medium";
  else if (score >= 12) level = "low";

  return {
    level,
    score,
    reasons: reasons.slice(0, 6),
  };
}
