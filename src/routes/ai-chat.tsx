import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Bot, Loader, Trash2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/lib/route-auth";
import { askCampusAI, getAiAssistantStatus, type ChatMessage } from "@/lib/groq-ai";
import { ChatMarkdown } from "@/components/chat-markdown";

export const Route = createFileRoute("/ai-chat")({ component: AIChatPage });

const SUGGESTED_PROMPTS = [
  "What active textbooks are listed right now?",
  "Show me open student item requests",
  "How do I list an item for sale/rent?",
  "Recommend affordable calculators or drafters",
];

interface AIChatMessage {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

const DEFAULT_WELCOME_MSG: AIChatMessage = {
  id: "welcome",
  text: "Yo! 👋 I'm your SmartCampus AI Assistant. I know all active items in the campus store, who's selling them, active student requests, and how to get anything sorted on CampusKart. What can I look up for you today?",
  sender: "assistant",
  timestamp: new Date(),
};

const getStoredAiMessages = (userId: string): AIChatMessage[] => {
  try {
    const raw = localStorage.getItem(`smartcampus_ai_chat_${userId}`);
    if (!raw) return [DEFAULT_WELCOME_MSG];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [DEFAULT_WELCOME_MSG];
    return parsed.map((m: any) => ({
      id: m.id || crypto.randomUUID(),
      text: m.text || "",
      sender: m.sender || "assistant",
      timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
    }));
  } catch {
    return [DEFAULT_WELCOME_MSG];
  }
};

const saveStoredAiMessages = (userId: string, msgs: AIChatMessage[]) => {
  try {
    localStorage.setItem(`smartcampus_ai_chat_${userId}`, JSON.stringify(msgs.slice(-80)));
  } catch {
    // ignore
  }
};

function AIChatPage() {
  const navigate = useNavigate();
  const { user, loading } = useRequireAuth("/login");

  const [botStatus, setBotStatus] = useState(() => getAiAssistantStatus());

  useEffect(() => {
    const timer = setInterval(() => {
      setBotStatus(getAiAssistantStatus());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [messages, setMessages] = useState<AIChatMessage[]>([DEFAULT_WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Load user-isolated chat history on mount or auth change
  useEffect(() => {
    if (user?.uid) {
      setMessages(getStoredAiMessages(user.uid));
    }
  }, [user?.uid]);

  const updateAndPersistMessages = useCallback(
    (updater: (prev: AIChatMessage[]) => AIChatMessage[]) => {
      setMessages((prev) => {
        const next = updater(prev);
        if (user?.uid) {
          saveStoredAiMessages(user.uid, next);
        }
        return next;
      });
    },
    [user?.uid],
  );

  const clearChatHistory = () => {
    if (confirm("Clear your AI chat history?")) {
      const reset = [DEFAULT_WELCOME_MSG];
      setMessages(reset);
      if (user?.uid) {
        saveStoredAiMessages(user.uid, reset);
      }
    }
  };

  const addMessage = (text: string, sender: "user" | "assistant") => {
    const newMessage: AIChatMessage = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
    };
    updateAndPersistMessages((prev) => [...prev, newMessage]);
  };

  const callAssistant = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setErrorText("");
    addMessage(trimmed, "user");
    setInput("");
    setIsLoading(true);

    try {
      const history: ChatMessage[] = [
        ...messages.slice(-8).map((message) => ({
          role: message.sender === "user" ? ("user" as const) : ("assistant" as const),
          content: message.text,
        })),
        { role: "user" as const, content: trimmed },
      ];

      const response = await askCampusAI(history);
      addMessage(response, "assistant");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "AI service is currently unavailable.";
      setErrorText(message);
      addMessage(
        message.includes("Rate limit") || message.includes("Please wait")
          ? message
          : "I could not process that right now. Please try again in a moment.",
        "assistant",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    void callAssistant(input);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    void callAssistant(prompt);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (loading || !user) {
    return (
      <div className="flex h-screen flex-col bg-background">
        <Navbar />
        <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-6 py-10">
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Preparing your assistant session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Container */}
        <div className="flex w-full flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  navigate({
                    to: "/chat",
                    search: { peerUid: undefined, peerName: undefined, peerAvatar: undefined },
                  })
                }
                className="rounded-lg p-2 hover:bg-accent"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src="https://api.dicebear.com/7.x/bottts/svg?seed=smartcampus-ai"
                    alt="AI Assistant"
                    className="h-10 w-10 rounded-full bg-secondary border border-border/80 object-cover"
                  />
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-card",
                      botStatus.isOnline ? "bg-emerald-500" : "bg-amber-500 animate-pulse",
                    )}
                  />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Campus AI Assistant</h2>
                  <p className="text-xs text-muted-foreground">
                    {botStatus.isOnline ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        🟢 Online • Store & Requests Aware
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        🔴 Offline (Cooling down · {botStatus.retryAfterSeconds}s)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {messages.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChatHistory}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear Chat</span>
              </Button>
            )}
          </div>

          {!botStatus.isOnline && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
              <span>
                ⏳ AI rate limit reached. Assistant is resting and will be back online in{" "}
                <strong>{botStatus.retryAfterSeconds}s</strong>.
              </span>
            </div>
          )}

          {/* Messages Area */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      "flex gap-3",
                      msg.sender === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    {msg.sender === "assistant" && (
                      <img
                        src="https://api.dicebear.com/7.x/bottts/svg?seed=smartcampus-ai"
                        alt="AI"
                        className="h-8 w-8 shrink-0 rounded-full bg-secondary border border-border/60 object-cover"
                      />
                    )}

                    <div
                      className={cn(
                        "max-w-md sm:max-w-xl rounded-2xl px-4 py-3 text-sm shadow-sm",
                        msg.sender === "user"
                          ? "bg-brand-gradient text-primary-foreground"
                          : "border border-border bg-card text-foreground",
                      )}
                    >
                      <ChatMarkdown content={msg.text} isMe={msg.sender === "user"} />
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          msg.sender === "user"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
                    <Loader className="h-4 w-4 animate-spin text-secondary-foreground" />
                    <span className="text-sm text-secondary-foreground">Thinking...</span>
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Suggested Prompts (only show if few messages) */}
          {messages.length <= 2 && !isLoading && (
            <div className="border-t border-border px-6 py-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">Quick suggestions:</p>
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-accent"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorText ? <div className="px-6 pb-2 text-xs text-destructive">{errorText}</div> : null}

          {/* Input Area */}
          <div className="border-t border-border bg-card px-6 py-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask me anything..."
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm placeholder-muted-foreground focus:border-primary focus:outline-none"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="gap-2"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
