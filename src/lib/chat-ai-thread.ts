import type { ChatThread } from "@/lib/chat-socket";

/** Kept out of Socket.IO so server stays peer-to-peer only; UI merges this row locally. */
export const AI_ASSISTANT_THREAD: ChatThread = {
  id: "ai-chat",
  name: "Campus Assistant",
  lastMsg: "I can help with pricing, negotiation drafts, and safe meetup messages.",
  time: "now",
  online: true,
  unread: 0,
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=bot",
  product: "AI Assistant",
  isBot: true,
};
