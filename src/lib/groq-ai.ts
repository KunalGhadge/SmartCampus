import { fetchSupabaseListings, fetchSupabaseItemRequests } from "@/lib/supabase-data";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Groq Free Models priority list
const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "groq/compound-mini",
];

// Rate Limiter Configuration: max 12 requests per 60 seconds
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const MIN_INTERVAL_BETWEEN_REQUESTS_MS = 2_000; // 2 seconds between clicks

const requestTimestamps: number[] = [];
let lastRequestTime = 0;
let botOfflineUntil = 0;
let botOfflineReason = "";

export function getAiAssistantStatus(): {
  isOnline: boolean;
  offlineReason?: string;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  if (now < botOfflineUntil) {
    const remaining = Math.max(1, Math.ceil((botOfflineUntil - now) / 1000));
    return {
      isOnline: false,
      offlineReason: botOfflineReason || "Bot is temporarily cooling down.",
      retryAfterSeconds: remaining,
    };
  }
  return { isOnline: true };
}

export function checkRateLimit(): { allowed: boolean; retryAfterSeconds?: number; reason?: string } {
  const now = Date.now();

  const status = getAiAssistantStatus();
  if (!status.isOnline) {
    return {
      allowed: false,
      retryAfterSeconds: status.retryAfterSeconds,
      reason: `🔴 Assistant is temporarily offline (${status.offlineReason}). Resetting in ${status.retryAfterSeconds}s.`,
    };
  }

  // Check minimum interval between requests
  if (now - lastRequestTime < MIN_INTERVAL_BETWEEN_REQUESTS_MS) {
    const waitSec = Math.ceil((MIN_INTERVAL_BETWEEN_REQUESTS_MS - (now - lastRequestTime)) / 1000);
    return {
      allowed: false,
      retryAfterSeconds: waitSec,
      reason: `Please wait ${waitSec} second(s) before sending another message.`,
    };
  }

  // Remove timestamps older than window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldest = requestTimestamps[0];
    const waitSec = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
    return {
      allowed: false,
      retryAfterSeconds: waitSec,
      reason: `Rate limit reached (max ${MAX_REQUESTS_PER_WINDOW} msgs/min). Please wait ${waitSec}s.`,
    };
  }

  return { allowed: true };
}

function recordRequest(): void {
  const now = Date.now();
  lastRequestTime = now;
  requestTimestamps.push(now);
}

export function getGroqApiKey(): string {
  const key =
    (import.meta.env.VITE_GROQ_API_KEY as string | undefined) ||
    (import.meta.env.GROQ_API_KEY as string | undefined) ||
    "";
  return key.trim();
}

// Cached campus context snapshot (refreshes every 30s)
let cachedContext = "";
let lastContextFetch = 0;

async function getLiveCampusContext(): Promise<string> {
  const now = Date.now();
  if (cachedContext && now - lastContextFetch < 30_000) {
    return cachedContext;
  }

  try {
    const [listings, requests] = await Promise.all([
      fetchSupabaseListings().catch(() => []),
      fetchSupabaseItemRequests().catch(() => []),
    ]);

    // 1. Available Products in Store (Ignoring sold/deleted)
    const activeListings = listings.filter((p) => p.availability !== "Sold");
    const listingsSummary =
      activeListings.length > 0
        ? activeListings
            .slice(0, 40)
            .map(
              (p) =>
                `• [${p.category}] "${p.title}" - ₹${p.price.toLocaleString("en-IN")}${
                  p.originalPrice && p.originalPrice > p.price ? ` (was ₹${p.originalPrice})` : ""
                } | Condition: ${p.condition} | Seller: ${p.seller.name} (${
                  p.seller.verified ? "Verified" : "Student"
                }) | College/Dept: ${p.seller?.college || p.pickupLocation || "MGM CET"} (${p.department || "General"})${
                  p.forRent && p.rentPerDay ? ` | Rent: ₹${p.rentPerDay}/day` : ""
                }${p.negotiable ? " | Negotiable" : ""}`,
            )
            .join("\n")
        : "No active listings currently available.";

    // 2. Active Student Item Requests
    const requestsSummary =
      requests.length > 0
        ? requests
            .slice(0, 30)
            .map(
              (r) =>
                `• [Wanted] "${r.itemName}" - Budget: ₹${r.budgetMin} to ₹${r.budgetMax} | Urgency: ${r.urgency} | Preferred Condition: ${r.condition} | Requested by: ${r.student.name} | Dept: ${r.department || "General"}`,
            )
            .join("\n")
        : "No active student requests currently posted.";

    cachedContext = `
=== LIVE CAMPUS INVENTORY (Active Store Items) ===
${listingsSummary}

=== LIVE STUDENT WANTED REQUESTS ===
${requestsSummary}
`;
    lastContextFetch = now;
    return cachedContext;
  } catch (err) {
    console.warn("Could not compile live campus context for AI:", err);
    return "";
  }
}

export async function askCampusAI(messages: ChatMessage[]): Promise<string> {
  // 1. Enforce Rate Limiting
  const limitCheck = checkRateLimit();
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.reason || "Rate limit exceeded. Please wait a moment.");
  }

  const apiKey = getGroqApiKey();
  if (!apiKey) {
    botOfflineUntil = Date.now() + 300_000;
    botOfflineReason = "Groq API key not configured";
    throw new Error("Groq API key is not configured. Assistant is currently offline.");
  }

  recordRequest();

  // Fetch live store inventory & requests context
  const liveContext = await getLiveCampusContext();

  // Prepare system prompt with live inventory, guardrails, personality & FAQs
  const systemPrompt: ChatMessage = {
    role: "system",
    content:
      `You are the SmartCampus AI Assistant for MGM CampusKart (MGM College / University).\n` +
      `You are a witty, smart, polite, and humorous campus buddy who knows everything happening on campus.\n\n` +
      `PERSONALITY & STYLE:\n` +
      `1. Keep answers SHORT, CRISP, and direct by default (1-3 sentences or concise bullet points). Only give medium-length explanations when the student explicitly asks for step-by-step guidance or comprehensive options.\n` +
      `2. Be polite, cheerful, and lightly humorous (use campus slang like "Yo!", "Hey campus mate!", "Pro tip:").\n` +
      `3. Never output raw markdown pipe tables (|---|). Use clean bullet points with bold highlights.\n\n` +
      `STRICT PRIVACY & SECURITY GUARDRAILS:\n` +
      `1. You only have access to public listing names, prices, condition, categories, campus/department, and public seller/requester display names.\n` +
      `2. NEVER disclose, invent, or guess private user data (passwords, phone numbers, email addresses, payment UPI IDs, private chats, or user account IDs).\n` +
      `3. If asked about personal data, politely state that student privacy is strictly protected by SmartCampus.\n\n` +
      `APP KNOWLEDGE & HOW-TO FAQs:\n` +
      `• How to list an item: Click "+ Sell / Rent Item" in the navbar or Dashboard -> fill title, price, condition, category, department, photos -> submit.\n` +
      `• How to request an item: Click "+ Request Item" or go to Marketplace > "Student Requests" tab -> submit what you need and your budget.\n` +
      `• How to buy or rent: Click any listing -> click "Message Seller" -> coordinate meet-up -> inspect item on campus -> pay via UPI on handover.\n` +
      `• Safe Meet-ups: Always meet in daytime at safe campus locations like the Central Library, Main Gate, or Campus Canteen.\n\n` +
      `LIVE STORE & REQUESTS CONTEXT:\n` +
      `${liveContext}\n\n` +
      `Use the real live data above to answer exact questions about products, prices, sellers, and active student requests!`,
  };

  const finalMessages: ChatMessage[] =
    messages[0]?.role === "system" ? messages : [systemPrompt, ...messages];

  let lastError: Error | null = null;

  // 2. Try primary and fallback Groq models
  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: finalMessages,
          temperature: 0.65,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: string };
        };
        const errMsg = errorData.error?.message || `HTTP ${response.status}`;
        console.warn(`Groq model ${model} failed (${response.status}): ${errMsg}`);
        lastError = new Error(errMsg);

        // If rate limited by Groq API (429), set offline timeout
        if (response.status === 429) {
          botOfflineUntil = Date.now() + 60_000;
          botOfflineReason = "API quota / rate limit reached";
          continue;
        }
        continue;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        return content;
      }
    } catch (err) {
      console.warn(`Error querying model ${model}:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  // If all failed, mark offline for 30s
  botOfflineUntil = Date.now() + 30_000;
  botOfflineReason = "All AI engines currently busy";

  throw lastError || new Error("Campus AI is currently taking a rest. Please check back in a moment.");
}
