import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  Send,
  Paperclip,
  Smile,
  MapPin,
  Calendar,
  Phone,
  Video,
  MoreHorizontal,
  ArrowLeft,
  Image as ImageIcon,
  Mic,
  Reply,
  Pencil,
  Trash2,
  Check,
  CheckCheck,
  Plus,
  X,
  Bot,
  ChevronDown,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { AI_ASSISTANT_THREAD } from "@/lib/chat-ai-thread";
import { dmThreadId } from "@/lib/chat-dm";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buildFallbackUserProfile, useCurrentUserProfile } from "@/lib/user-profile";
import { useRequireAuth } from "@/lib/route-auth";
import {
  fetchSupabaseThreadMessages,
  sendSupabaseDirectMessage,
  subscribeToSupabaseThread,
  subscribeToSupabasePresence,
  fetchUserChatThreads,
  subscribeToUserNewMessages,
} from "@/lib/supabase-chat";
import { askCampusAI } from "@/lib/groq-ai";
import {
  getChatSocket,
  useSocketStatus,
  type ChatAttachment,
  type ChatMessage,
  type ChatThread,
} from "@/lib/chat-socket";
import { ChatMarkdown } from "@/components/chat-markdown";

const getCachedThreadMessages = (threadId: string): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(`smartcampus_thread_msgs_${threadId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveCachedThreadMessages = (threadId: string, msgs: ChatMessage[]) => {
  try {
    localStorage.setItem(`smartcampus_thread_msgs_${threadId}`, JSON.stringify(msgs.slice(-100)));
  } catch {
    // ignore
  }
};

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>): {
    peerUid?: string;
    peerName?: string;
    peerAvatar?: string;
    product?: string;
    initialMsg?: string;
  } => ({
    peerUid: typeof search.peerUid === "string" ? search.peerUid : undefined,
    peerName: typeof search.peerName === "string" ? search.peerName : undefined,
    peerAvatar: typeof search.peerAvatar === "string" ? search.peerAvatar : undefined,
    product: typeof search.product === "string" ? search.product : undefined,
    initialMsg: typeof search.initialMsg === "string" ? search.initialMsg : undefined,
  }),
  component: ChatPage,
});

const EMOJIS = ["👍", "❤️", "😂", "🔥", "👏", "😮", "😅", "🙏", "🎉", "✅", "💯", "✨"];
const AI_AVATAR = "https://api.dicebear.com/7.x/bottts/svg?seed=smartcampus-ai";
const AI_NAME = "Campus Assistant";

function ChatPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const socket = useMemo(() => getChatSocket(), []);
  const { user, loading: authLoading } = useRequireAuth("/login");
  const profileQuery = useCurrentUserProfile();
  const profile = profileQuery.data ?? (user ? buildFallbackUserProfile(user) : null);
  const currentUser = useMemo(
    () => ({
      id: profile?.firebaseUid ?? user?.uid ?? "guest",
      name: profile?.displayName ?? user?.displayName ?? "You",
      avatar: profile?.photoUrl ?? user?.photoURL ?? null,
    }),
    [profile, user],
  );
  const socketStatus = useSocketStatus();

  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());
  const [meetupBoxDismissed, setMeetupBoxDismissed] = useState(false);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  const targetPeerThread = useMemo<ChatThread | null>(() => {
    if (!search.peerUid || !user?.uid || search.peerUid === user.uid) return null;
    const tid = dmThreadId(user.uid, search.peerUid);
    return {
      id: tid,
      name: search.peerName || "Campus Student",
      avatar:
        search.peerAvatar?.trim() ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(search.peerName || search.peerUid)}`,
      product: search.product || "Direct message",
      online: true,
      lastMsg: search.initialMsg || "Direct conversation",
      time: "Now",
      unread: 0,
    };
  }, [search.peerUid, search.peerName, search.peerAvatar, search.product, search.initialMsg, user?.uid]);

  const [threads, setThreads] = useState<ChatThread[]>(() => {
    if (targetPeerThread) {
      return [targetPeerThread, AI_ASSISTANT_THREAD];
    }
    return [AI_ASSISTANT_THREAD];
  });
  const [activeId, setActiveId] = useState(() => targetPeerThread?.id || AI_ASSISTANT_THREAD.id);
  const [showThread, setShowThread] = useState(() => Boolean(targetPeerThread));
  const active = threads.find((c) => c.id === activeId) ?? targetPeerThread ?? threads[0];
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const isAutoScrollRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const [text, setText] = useState(() => search.initialMsg || "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage["replyTo"] | null>(null);
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const activeIdRef = useRef(activeId);
  const messagesRef = useRef(messages);

  const isThreadOnline = (thread: ChatThread) => {
    if (thread.isBot) return true;
    const parts = thread.id.replace("dm_", "").split("_");
    const peerUid = parts.find((id) => id !== user?.uid) || search.peerUid;
    if (!peerUid) return false;
    if (onlineUserIds.has(peerUid)) return true;
    if (
      peerUid.startsWith("a1111111-") ||
      peerUid.startsWith("demo_") ||
      thread.online
    ) {
      return true;
    }
    return false;
  };

  const scrollToBottom = (smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  useEffect(() => {
    if (!user?.uid) return;
    const unsubPresence = subscribeToSupabasePresence(user.uid, (nextOnline) => {
      setOnlineUserIds(nextOnline);
    });
    return unsubPresence;
  }, [user?.uid]);

  useEffect(() => {
    setMeetupBoxDismissed(false);
  }, [activeId]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Loading your messages...
          </div>
        </main>
      </div>
    );
  }

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const revokeMessagePreviews = (ms: ChatMessage[]) => {
    ms.forEach((m) =>
      m.attachments?.forEach((a) => a.previewUrl && URL.revokeObjectURL(a.previewUrl)),
    );
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // only auto-scroll if user is near bottom or the last message is from the current user
    const last = messages.at(-1);
    const lastFromMe = last ? last.from === currentUser.id || last.from === "me" : false;
    const shouldAuto = isAutoScrollRef.current || lastFromMe;
    if (!shouldAuto) return;

    // wait for DOM updates and any images to settle
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" }),
      ),
    );
  }, [messages.length, typing, pending.length, replyTo?.id, editingId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onScroll = () => {
      const threshold = 64; // px
      const nearBottom =
        container.scrollTop + container.clientHeight + threshold >= container.scrollHeight;
      isAutoScrollRef.current = nearBottom;
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleThreads = ({ threads: nextThreads }: { threads: ChatThread[] }) => {
      setThreads([
        AI_ASSISTANT_THREAD,
        ...nextThreads.filter((t) => t.id !== AI_ASSISTANT_THREAD.id),
      ]);
    };

    const handleThreadMessages = ({
      thread,
      messages: nextMessages,
    }: {
      thread: ChatThread;
      messages: ChatMessage[];
    }) => {
      if (thread.id !== activeIdRef.current) return;
      setMessages(nextMessages);
    };

    const handleThreadUpdate = ({
      thread,
      messages: nextMessages,
    }: {
      thread: ChatThread;
      messages: ChatMessage[];
    }) => {
      const threadId = thread.id;
      setThreads((current) =>
        current.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                lastMsg: nextMessages.at(-1)?.text ?? thread.lastMsg,
                time: nextMessages.at(-1)?.time ?? thread.time,
              }
            : thread,
        ),
      );
      if (threadId === activeIdRef.current) {
        setMessages(nextMessages);
      }
    };

    socket.on("chat:threads", handleThreads);
    socket.on("chat:thread:messages", handleThreadMessages);
    socket.on("chat:thread:update", handleThreadUpdate);
    socket.emit("chat:threads:load");

    return () => {
      socket.off("chat:threads", handleThreads);
      socket.off("chat:thread:messages", handleThreadMessages);
      socket.off("chat:thread:update", handleThreadUpdate);
      socket.disconnect();
    };
  }, [socket]);

  const messageById = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);

  useEffect(() => {
    if (!targetPeerThread) return;
    setThreads((current) => {
      const exists = current.some((t) => t.id === targetPeerThread.id);
      if (exists) {
        return current.map((t) => (t.id === targetPeerThread.id ? { ...t, ...targetPeerThread } : t));
      }
      return [targetPeerThread, ...current.filter((t) => t.id !== targetPeerThread.id)];
    });
    setActiveId(targetPeerThread.id);
    setShowThread(true);
    if (search.initialMsg) {
      setText(search.initialMsg);
    }
  }, [targetPeerThread, search.initialMsg]);

  useEffect(() => {
    if (!targetPeerThread || authLoading) {
      return undefined;
    }

    const ensureDm = () => {
      socket.emit("chat:dm:ensure", { threadId: targetPeerThread.id, thread: targetPeerThread });
    };

    if (socket.connected) ensureDm();
    socket.on("connect", ensureDm);

    return () => {
      socket.off("connect", ensureDm);
    };
  }, [authLoading, socket, targetPeerThread]);

  useEffect(() => {
    if (!user?.uid) return;

    const reloadThreads = () => {
      void fetchUserChatThreads(user.uid).then((loadedThreads) => {
        setThreads((current) => {
          const map = new Map<string, ChatThread>();
          if (targetPeerThread) {
            map.set(targetPeerThread.id, targetPeerThread);
          }
          loadedThreads.forEach((t) => map.set(t.id, t));
          current.forEach((t) => {
            if (!map.has(t.id)) map.set(t.id, t);
          });
          return Array.from(map.values());
        });
      });
    };

    reloadThreads();
    const unsub = subscribeToUserNewMessages(user.uid, () => {
      reloadThreads();
    });

    return unsub;
  }, [user?.uid, targetPeerThread]);

  useEffect(() => {
    if (authLoading || !user?.uid) return;

    revokeMessagePreviews(messagesRef.current);

    // 1. Instantly load cached messages for active thread (guarantees zero disappearance)
    const cached = getCachedThreadMessages(activeId);
    if (cached.length > 0) {
      setMessages(cached);
    } else if (activeId === AI_ASSISTANT_THREAD.id) {
      const initialAiMsg: ChatMessage = {
        id: "ai_welcome",
        threadId: AI_ASSISTANT_THREAD.id,
        from: "ai",
        text: "Hi! 👋 I'm your MGM CampusKart AI Assistant. Ask me about textbook recommendations, fair prices, hostel gear, or campus survival tips!",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        delivery: "delivered",
        authorId: "smartcampus_ai",
        authorName: AI_NAME,
        authorAvatar: AI_AVATAR,
      };
      setMessages([initialAiMsg]);
      saveCachedThreadMessages(AI_ASSISTANT_THREAD.id, [initialAiMsg]);
    } else {
      setMessages([]);
    }

    setText("");
    setEditingId(null);
    setReplyTo(null);
    setTyping(false);
    setPending((current) => {
      current.forEach(
        (attachment) => attachment.previewUrl && URL.revokeObjectURL(attachment.previewUrl),
      );
      return [];
    });

    if (activeId === AI_ASSISTANT_THREAD.id) {
      return;
    }

    // 2. Fetch and merge latest Supabase messages
    let isMounted = true;
    void fetchSupabaseThreadMessages(activeId, user.uid).then((fetched) => {
      if (isMounted && fetched.length > 0) {
        setMessages((prev) => {
          const map = new Map<string, ChatMessage>();
          prev.forEach((m) => map.set(m.id, m));
          fetched.forEach((m) => map.set(m.id, m));
          const merged = Array.from(map.values());
          saveCachedThreadMessages(activeId, merged);
          return merged;
        });
      }
    });

    const unsubscribe = subscribeToSupabaseThread(activeId, user.uid, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        const next = [...prev, newMsg];
        saveCachedThreadMessages(activeId, next);
        return next;
      });
      setThreads((prevThreads) =>
        prevThreads.map((t) =>
          t.id === activeId ? { ...t, lastMsg: newMsg.text, time: newMsg.time } : t,
        ),
      );
    });

    socket.emit("chat:thread:join", {
      threadId: activeId,
      user: currentUser,
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeId, authLoading, currentUser, socket, user?.uid]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const onPickFiles = (files: FileList | null, kind: "file" | "image") => {
    if (!files?.length) return;
    const next: ChatAttachment[] = Array.from(files)
      .slice(0, 6)
      .map((file) => {
        const isImage = kind === "image" || file.type.startsWith("image/");
        const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
        return {
          id: crypto.randomUUID(),
          kind: isImage ? "image" : "file",
          name: file.name,
          size: file.size,
          previewUrl,
        };
      });
    setPending((p) => [...p, ...next].slice(0, 6));
  };

  useEffect(() => {
    // Enable folder selection where supported (Chromium)
    if (folderInputRef.current) {
      try {
        (folderInputRef.current as any).webkitdirectory = true;
        (folderInputRef.current as any).directory = true;
      } catch {
        // ignore
      }
    }
  }, []);

  const removePending = (id: string) => {
    setPending((p) => {
      const target = p.find((x) => x.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return p.filter((x) => x.id !== id);
    });
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    socket.emit("chat:message:react", { threadId: activeId, messageId, emoji, user: currentUser });
  };

  const beginReply = (m: ChatMessage) =>
    setReplyTo({ id: m.id, text: m.text || (m.attachments?.[0]?.name ?? "Message"), from: m.from });

  const beginEdit = (m: ChatMessage) => {
    setEditingId(m.id);
    setReplyTo(null);
    setText(m.text);
  };

  const deleteMessage = (id: string) =>
    socket.emit("chat:message:delete", { threadId: activeId, messageId: id, user: currentUser });

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed && pending.length === 0) return;

    if (editingId) {
      socket.emit("chat:message:edit", {
        threadId: activeId,
        messageId: editingId,
        text: trimmed,
        user: currentUser,
      });
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === editingId ? { ...m, text: trimmed, edited: true } : m));
        saveCachedThreadMessages(activeId, next);
        return next;
      });
      setEditingId(null);
      setText("");
      return;
    }

    const attachments = pending.map((a) => ({
      id: a.id,
      kind: a.kind,
      name: a.name,
      size: a.size,
      previewUrl: a.previewUrl,
    }));

    const currentText = trimmed;
    const currentReplyTo = replyTo;
    setText("");
    setReplyTo(null);
    setPending([]);

    const tempId = crypto.randomUUID();
    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const optimisticMsg: ChatMessage = {
      id: tempId,
      threadId: activeId,
      from: "me",
      text: currentText,
      time: timeNow,
      delivery: "delivered",
      authorId: user?.uid || currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      attachments: attachments.length ? attachments : undefined,
    };

    const nextMessages = [...messages, optimisticMsg];
    setMessages(nextMessages);
    saveCachedThreadMessages(activeId, nextMessages);

    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...t, lastMsg: currentText, time: timeNow } : t,
      ),
    );

    // If chatting with AI Assistant
    if (activeId === AI_ASSISTANT_THREAD.id) {
      setTyping(true);
      try {
        const history = nextMessages.slice(-8).map((m) => ({
          role: m.from === "ai" ? ("assistant" as const) : ("user" as const),
          content: m.text,
        }));
        const replyText = await askCampusAI(history);
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          threadId: activeId,
          from: "ai",
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          delivery: "delivered",
          authorId: "smartcampus_ai",
          authorName: AI_NAME,
          authorAvatar: AI_AVATAR,
        };
        setMessages((prev) => {
          const updated = [...prev, aiMsg];
          saveCachedThreadMessages(activeId, updated);
          return updated;
        });
      } catch (err: any) {
        const errText = err?.message || "I could not process that right now. Please try again in a moment.";
        const aiErr: ChatMessage = {
          id: crypto.randomUUID(),
          threadId: activeId,
          from: "ai",
          text: errText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          delivery: "delivered",
          authorId: "smartcampus_ai",
          authorName: AI_NAME,
          authorAvatar: AI_AVATAR,
        };
        setMessages((prev) => {
          const updated = [...prev, aiErr];
          saveCachedThreadMessages(activeId, updated);
          return updated;
        });
      } finally {
        setTyping(false);
      }
      return;
    }

    // Direct peer chat sync via Supabase & Socket.IO
    try {
      const createdMsg = await sendSupabaseDirectMessage({
        threadId: activeId,
        senderId: user?.uid || currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        text: currentText,
      });

      if (createdMsg) {
        setMessages((prev) => {
          const updated = prev.map((m) => (m.id === tempId ? createdMsg : m));
          saveCachedThreadMessages(activeId, updated);
          return updated;
        });
      }

      if (socket.connected) {
        socket.emit("chat:message:send", {
          threadId: activeId,
          user: currentUser,
          text: currentText,
          replyTo: currentReplyTo ?? undefined,
          attachments: attachments.length ? attachments : undefined,
        });
      }
    } catch (err) {
      console.warn("Direct message queued / synced:", err);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 min-h-0 overflow-hidden px-0 py-0 sm:px-4 sm:py-4 lg:px-8">
        <div className="grid h-full min-h-0 overflow-hidden border border-border bg-card sm:rounded-3xl md:grid-cols-[320px_1fr]">
          {/* Sidebar */}
          <aside
            className={cn(
              "flex h-full min-h-0 flex-col overflow-hidden border-r border-border",
              showThread && "hidden md:flex",
            )}
          >
            <div className="shrink-0 border-b border-border p-4">
              <h2 className="text-lg font-semibold">Messages</h2>
              <div className="mt-3 flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Search conversations"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <ul className="flex-1 min-h-0 overflow-y-auto">
              {threads.length === 0 ? (
                <li className="p-6 text-center text-sm text-muted-foreground">
                  No conversations yet. Messages will appear after a real chat starts.
                </li>
              ) : null}
              {threads.map((c) => {
                const threadOnline = isThreadOnline(c);
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        if (c.isBot) {
                          navigate({ to: "/ai-chat" });
                        } else {
                          setActiveId(c.id);
                          setShowThread(true);
                        }
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-border/60 p-4 text-left transition hover:bg-secondary/40",
                        c.id === activeId && !c.isBot && "bg-secondary/60",
                      )}
                    >
                      <div className="relative">
                        <img src={c.avatar} alt="" className="h-11 w-11 rounded-full object-cover bg-secondary" />
                        {threadOnline && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-sm font-semibold flex items-center gap-2">
                            {c.isBot && <Bot className="h-4 w-4 text-blue-500" />}
                            {c.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{c.time || ""}</span>
                        </div>
                        <div className="text-[11px] text-primary">{c.product}</div>
                        <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {c.lastMsg || "No messages yet"}
                        </div>
                      </div>
                      {c.unread > 0 && (
                        <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                          {c.unread}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Thread */}
          <section
            className={cn(
              "relative flex h-full min-h-0 flex-col overflow-hidden",
              !showThread && "hidden md:flex",
            )}
          >
            {/* Supabase Realtime Active Status Banner */}
            <div className="shrink-0 flex items-center justify-between border-b border-border/40 bg-secondary/30 px-4 py-1.5 text-[11px] font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-foreground font-semibold">Realtime Chat Active</span>
                <span className="hidden sm:inline">· Direct student-to-student messaging</span>
              </div>
              <span className="text-[10px] text-muted-foreground/80">⚡ 0ms latency</span>
            </div>

            <header className="shrink-0 flex items-center gap-3 border-b border-border p-4">
              <button onClick={() => setShowThread(false)} className="md:hidden">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="relative">
                <img src={active.avatar} alt="" className="h-10 w-10 rounded-full object-cover bg-secondary" />
                {isThreadOnline(active) && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold">{active.name}</div>
                <div className="flex items-center gap-1.5 text-xs">
                  {isThreadOnline(active) ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">Online</span>
                    </>
                  ) : (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                      <span className="text-muted-foreground">Offline</span>
                    </>
                  )}
                  <span className="text-muted-foreground truncate">· About {active.product}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </header>

            <div
              ref={scrollContainerRef}
              className="flex-1 min-h-0 space-y-3 overflow-y-auto bg-background/40 p-5"
            >
              <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card p-3 text-center text-xs text-muted-foreground">
                You're chatting about{" "}
                <span className="font-semibold text-foreground">{active.product}</span>. Stay safe —
                meet only on campus.
              </div>
              {messages.map((m, i) => {
                const isMe = m.from === "me" || m.from === currentUser.id;
                const reply = m.replyTo ? messageById.get(m.replyTo.id) : null;
                const timeMeta = (
                  <div
                    className={cn(
                      "mt-1 flex items-center justify-end gap-1 text-[10px] leading-none",
                      isMe ? "opacity-75" : "text-muted-foreground",
                    )}
                  >
                    {m.edited ? <span className="opacity-80">edited</span> : null}
                    <span>{m.time}</span>
                    {isMe ? (
                      <span className="ml-1 inline-flex items-center">
                        {m.delivery === "seen" ? (
                          <CheckCheck className="h-3 w-3" />
                        ) : m.delivery === "delivered" ? (
                          <CheckCheck className="h-3 w-3 opacity-70" />
                        ) : (
                          <Check className="h-3 w-3 opacity-70" />
                        )}
                      </span>
                    ) : null}
                  </div>
                );

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}
                  >
                    {!isMe ? (
                      <img
                        src={m.authorAvatar ?? (m.from === "ai" ? AI_AVATAR : active.avatar)}
                        alt=""
                        className="hidden h-7 w-7 rounded-full md:block"
                      />
                    ) : null}

                    <div className={cn("group relative max-w-[78%]", isMe && "items-end")}>
                      {/* Hover actions */}
                      <div
                        className={cn(
                          "pointer-events-none absolute -top-9 flex items-center gap-1 opacity-0 transition",
                          "group-hover:pointer-events-auto group-hover:opacity-100",
                          isMe ? "right-0" : "left-0",
                        )}
                      >
                        <div className="flex items-center gap-1 rounded-full border border-border bg-card/90 px-1.5 py-1 shadow-soft backdrop-blur">
                          {["👍", "❤️", "😂"].map((e) => (
                            <button
                              key={e}
                              type="button"
                              onClick={() => toggleReaction(m.id, e)}
                              className="grid h-7 w-7 place-items-center rounded-full text-sm transition hover:bg-secondary"
                              aria-label={`React ${e}`}
                            >
                              {e}
                            </button>
                          ))}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="grid h-7 w-7 place-items-center rounded-full transition hover:bg-secondary"
                                aria-label="More actions"
                              >
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isMe ? "end" : "start"} className="w-48">
                              <DropdownMenuItem onClick={() => beginReply(m)}>
                                <Reply className="h-4 w-4" /> Reply
                              </DropdownMenuItem>
                              {isMe ? (
                                <>
                                  <DropdownMenuItem onClick={() => beginEdit(m)}>
                                    <Pencil className="h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => deleteMessage(m.id)}
                                  >
                                    <Trash2 className="h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5 text-sm shadow-soft transition",
                          isMe
                            ? "bg-brand-gradient text-primary-foreground"
                            : "border border-border bg-card hover:border-border/80",
                        )}
                      >
                        {m.replyTo ? (
                          <div
                            className={cn(
                              "mb-2 rounded-xl border border-border/40 bg-background/20 px-3 py-2 text-[12px]",
                              isMe ? "text-primary-foreground/90" : "text-muted-foreground",
                            )}
                          >
                            <div
                              className={cn(
                                "mb-0.5 text-[11px] font-semibold",
                                isMe ? "opacity-90" : "text-foreground",
                              )}
                            >
                              Replying to{" "}
                              {m.replyTo.from === "me" || m.replyTo.from === currentUser.id
                                ? "you"
                                : m.replyTo.from === "ai"
                                  ? AI_NAME
                                  : active.name}
                            </div>
                            <div className="line-clamp-2">{reply?.text ?? m.replyTo.text}</div>
                          </div>
                        ) : null}

                        {m.attachments?.length ? (
                          <div className="mb-2 grid gap-2">
                            {m.attachments.map((a) => (
                              <div
                                key={a.id}
                                className={cn(
                                  "overflow-hidden rounded-xl border border-border/40 bg-background/10",
                                  a.kind === "image" ? "max-w-[280px]" : "",
                                )}
                              >
                                {a.kind === "image" && a.previewUrl ? (
                                  <img
                                    src={a.previewUrl}
                                    alt={a.name}
                                    className="max-h-56 w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex items-center gap-3 p-3">
                                    <Paperclip className="h-4 w-4 opacity-80" />
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-xs font-medium">{a.name}</div>
                                      <div className="text-[11px] opacity-70">
                                        {Math.max(1, Math.round(a.size / 1024))} KB
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {m.text ? (
                          <ChatMarkdown content={m.text} isMe={isMe} />
                        ) : null}

                        {m.reactions && Object.keys(m.reactions).length ? (
                          <div
                            className={cn(
                              "mt-2 flex flex-wrap gap-1.5",
                              isMe ? "justify-end" : "justify-start",
                            )}
                          >
                            {Object.entries(m.reactions).map(([emoji, meta]) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => toggleReaction(m.id, emoji)}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/20 px-2 py-1 text-[11px] transition",
                                  meta.mine
                                    ? "border-primary/40 bg-primary/10"
                                    : "hover:bg-secondary/40",
                                )}
                              >
                                <span className="text-sm leading-none">{emoji}</span>
                                <span className="tabular-nums">{meta.count}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {timeMeta}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {typing ? (
                <div className="flex items-end gap-2">
                  <img
                    src={active.avatar}
                    alt=""
                    className="hidden h-7 w-7 rounded-full md:block"
                  />
                  <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-soft">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">{active.name} is typing</span>
                      <motion.span
                        aria-hidden
                        className="inline-flex items-center gap-1"
                        initial={{ opacity: 0.7 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
                      </motion.span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Schedule a meet-up helper - ONLY shown on new empty chats, disappears once chatting starts */}
              {!active.isBot && messages.length === 0 && !meetupBoxDismissed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-soft"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Propose safe meet-up
                    </span>
                    <button
                      type="button"
                      onClick={() => setMeetupBoxDismissed(true)}
                      className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                      aria-label="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    {["Today, 5 PM", "Tomorrow, 11 AM", "Sat, 2 PM", "Custom…"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          if (t === "Custom…") {
                            setText(
                              (curr) =>
                                curr
                                  ? `${curr} Let's meet at Central Library entrance. What time works best for you?`
                                  : "Let's meet at Central Library entrance. What time works best for you?",
                            );
                          } else {
                            setText(
                              `Hi ${active.name}! Can we meet ${t} at Central Library entrance to inspect and pay?`,
                            );
                          }
                        }}
                        className="rounded-xl border border-border bg-background px-3 py-2 text-left hover:border-primary/50 hover:bg-secondary/70 transition font-medium text-foreground/90"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-foreground shrink-0" />
                    <span>Suggested: Central Library entrance (Safe CCTV zone)</span>
                  </div>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Floating Scroll-to-Bottom Button for long chats */}
            <AnimatePresence>
              {showScrollBottomBtn && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.85, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: 10 }}
                  onClick={() => scrollToBottom(true)}
                  className="absolute bottom-20 right-6 z-20 flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3.5 py-2 text-xs font-semibold text-foreground shadow-xl backdrop-blur hover:bg-secondary transition"
                >
                  <ChevronDown className="h-4 w-4 text-primary" />
                  <span>Latest messages</span>
                </motion.button>
              )}
            </AnimatePresence>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="border-t border-border p-3"
            >
              {replyTo || editingId ? (
                <div className="mb-2 flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      {editingId ? (
                        <Pencil className="h-3.5 w-3.5 text-foreground" />
                      ) : (
                        <Reply className="h-3.5 w-3.5 text-foreground" />
                      )}
                      <span>
                        {editingId
                          ? "Editing message"
                          : `Replying to ${replyTo?.from === "me" ? "you" : active.name}`}
                      </span>
                    </div>
                    {!editingId ? (
                      <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {replyTo?.text}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setReplyTo(null);
                      setEditingId(null);
                    }}
                    aria-label="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}

              {pending.length ? (
                <div className="mb-2 flex flex-wrap gap-2">
                  {pending.map((a) => (
                    <div
                      key={a.id}
                      className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
                    >
                      {a.kind === "image" && a.previewUrl ? (
                        <img src={a.previewUrl} alt={a.name} className="h-20 w-20 object-cover" />
                      ) : (
                        <div className="flex h-20 w-56 items-center gap-3 px-3">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold">{a.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {Math.max(1, Math.round(a.size / 1024))} KB
                            </div>
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removePending(a.id)}
                        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-background/80 opacity-0 backdrop-blur transition group-hover:opacity-100"
                        aria-label="Remove attachment"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex items-end gap-2 rounded-3xl border border-border bg-card px-2 py-2 shadow-soft">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickFiles(e.target.files, "file")}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickFiles(e.target.files, "image")}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickFiles(e.target.files, "file")}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      aria-label="Add attachment"
                      className="rounded-2xl"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52">
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-4 w-4" /> Upload file
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                      <ImageIcon className="h-4 w-4" /> Upload image
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => folderInputRef.current?.click()}>
                      <FolderIcon /> Upload folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  aria-label="Upload image"
                  className="rounded-2xl"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>

                <div className="flex-1">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={1}
                    placeholder={`Message ${active.name}… (Enter to send, Shift+Enter for newline)`}
                    className="max-h-28 w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      aria-label="Emoji picker"
                      className="rounded-2xl"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-64 p-3">
                    <div className="text-xs font-semibold text-muted-foreground">Reactions</div>
                    <div className="mt-2 grid grid-cols-6 gap-1.5">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card transition hover:bg-secondary"
                          onClick={() => setText((t) => (t ? t + e : e))}
                          aria-label={`Insert ${e}`}
                        >
                          <span className="text-lg leading-none">{e}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label="Voice message"
                  className="rounded-2xl"
                >
                  <Mic className="h-4 w-4" />
                </Button>

                <motion.div
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ y: -1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Button
                    size="icon"
                    type="submit"
                    disabled={!text.trim() && pending.length === 0}
                    className="rounded-2xl bg-brand-gradient text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

function FolderIcon() {
  // minimal inline icon to avoid extra lucide import weight for a single menu row
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="text-muted-foreground"
    >
      <path
        d="M3 7.5A2.5 2.5 0 0 1 5.5 5h4l2 2H18.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
