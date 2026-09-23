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

export function checkRateLimit(): { allowed: boolean; retryAfterSeconds?: number; reason?: string } {
  const now = Date.now();

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

export async function askCampusAI(messages: ChatMessage[]): Promise<string> {
  // 1. Enforce Rate Limiting
  const limitCheck = checkRateLimit();
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.reason || "Rate limit exceeded. Please wait a moment.");
  }

  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error("Groq API key is not configured.");
  }

  recordRequest();

  // Prepare standard system prompt if not included
  const systemPrompt: ChatMessage = {
    role: "system",
    content:
      "You are the CampusKart AI Assistant for MGM College. " +
      "You assist students with campus marketplace listings, textbook recommendations, second-hand gear, cycle rentals, study spots, and campus safety tips on CampusKart. " +
      "Guidelines: " +
      "1. Keep responses clear, concise, and conversational (avoid huge wall-of-text tables; use clean bullet points or numbered lists instead). " +
      "2. When suggesting textbooks or prices, highlight 2-3 top recommended books with estimated campus second-hand prices (₹). " +
      "3. Use friendly emojis and clean markdown (bold, bullets). Never output raw markdown pipe tables (|---|) as they look cluttered in chat bubbles.",
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
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          error?: { message?: string; code?: string };
        };
        const errMsg = errorData.error?.message || `HTTP ${response.status}`;
        console.warn(`Groq model ${model} failed (${response.status}): ${errMsg}`);
        lastError = new Error(errMsg);

        // If rate limited by Groq API (429), try next model or report friendly message
        if (response.status === 429) {
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

  throw lastError || new Error("All Groq AI models are currently busy. Please try again in a moment.");
}
