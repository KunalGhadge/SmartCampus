import { supabase, isSupabaseConfigured } from "./supabase";
import type { ChatMessage, ChatThread } from "./chat-socket";
import { AI_ASSISTANT_THREAD } from "./chat-ai-thread";

export interface SupabaseMessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name?: string | null;
  sender_avatar?: string | null;
  text: string;
  image_url?: string | null;
  file_url?: string | null;
  reactions?: Record<string, string[]> | null;
  seen?: boolean | null;
  seen_at?: string | null;
  created_at: string;
}

export function rowToChatMessage(row: SupabaseMessageRow, currentUserId: string): ChatMessage {
  const isMe = row.sender_id === currentUserId;
  const createdDate = new Date(row.created_at);
  const timeStr = createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const attachments = [];
  if (row.image_url) {
    attachments.push({
      id: `${row.id}-img`,
      kind: "image" as const,
      name: "Image attachment",
      size: 1024 * 50,
      previewUrl: row.image_url,
    });
  }
  if (row.file_url) {
    attachments.push({
      id: `${row.id}-file`,
      kind: "file" as const,
      name: "Attached file",
      size: 1024 * 100,
      previewUrl: row.file_url,
    });
  }

  // Parse reactions { "👍": ["uid1", "uid2"] }
  let chatReactions: Record<string, { count: number; mine?: boolean }> | undefined = undefined;
  if (row.reactions && typeof row.reactions === "object") {
    chatReactions = {};
    for (const [emoji, val] of Object.entries(row.reactions)) {
      if (Array.isArray(val) && val.length > 0) {
        chatReactions[emoji] = {
          count: val.length,
          mine: val.includes(currentUserId),
        };
      }
    }
    if (Object.keys(chatReactions).length === 0) {
      chatReactions = undefined;
    }
  }

  return {
    id: row.id,
    threadId: row.thread_id,
    from: isMe ? "me" : row.sender_id,
    text: row.text,
    time: timeStr,
    delivery: isMe ? (row.seen ? "seen" : "sent") : undefined,
    authorId: row.sender_id,
    authorName: row.sender_name || (isMe ? "You" : "Student"),
    authorAvatar:
      row.sender_avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.sender_id)}`,
    attachments: attachments.length ? attachments : undefined,
    reactions: chatReactions,
  };
}

export async function fetchSupabaseThreadMessages(
  threadId: string,
  currentUserId: string,
): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !threadId) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return (data as SupabaseMessageRow[]).map((r) => rowToChatMessage(r, currentUserId));
}

export async function sendSupabaseDirectMessage(payload: {
  threadId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  text: string;
  imageUrl?: string;
  fileUrl?: string;
}): Promise<ChatMessage | null> {
  if (!isSupabaseConfigured) {
    return {
      id: crypto.randomUUID(),
      threadId: payload.threadId,
      from: "me",
      text: payload.text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      delivery: "sent",
      authorId: payload.senderId,
      authorName: payload.senderName,
      authorAvatar: payload.senderAvatar,
    };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      thread_id: payload.threadId,
      sender_id: payload.senderId,
      sender_name: payload.senderName,
      text: payload.text,
      image_url: payload.imageUrl,
      file_url: payload.fileUrl,
      seen: false,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error sending message to Supabase:", error);
    throw error;
  }

  return rowToChatMessage(data as SupabaseMessageRow, payload.senderId);
}

export async function toggleSupabaseMessageReaction(
  messageId: string,
  emoji: string,
  userId: string,
): Promise<Record<string, string[]> | null> {
  if (!isSupabaseConfigured || !messageId || !userId) return null;

  try {
    const { data: row } = await supabase
      .from("messages")
      .select("reactions")
      .eq("id", messageId)
      .maybeSingle();

    const rawReactions = (row?.reactions || {}) as Record<string, string[]>;
    const currentList: string[] = Array.isArray(rawReactions[emoji]) ? [...rawReactions[emoji]] : [];

    let updatedList: string[];
    if (currentList.includes(userId)) {
      updatedList = currentList.filter((id) => id !== userId);
    } else {
      updatedList = [...currentList, userId];
    }

    const newReactions = { ...rawReactions };
    if (updatedList.length > 0) {
      newReactions[emoji] = updatedList;
    } else {
      delete newReactions[emoji];
    }

    const { error } = await supabase
      .from("messages")
      .update({ reactions: newReactions })
      .eq("id", messageId);

    if (error) {
      console.warn("Could not update reaction:", error);
      return null;
    }

    return newReactions;
  } catch (err) {
    console.warn("Reaction update error:", err);
    return null;
  }
}

export async function markSupabaseThreadSeen(threadId: string, currentUserId: string): Promise<void> {
  if (!isSupabaseConfigured || !threadId || !currentUserId) return;
  try {
    await supabase
      .from("messages")
      .update({ seen: true, seen_at: new Date().toISOString() })
      .eq("thread_id", threadId)
      .neq("sender_id", currentUserId)
      .eq("seen", false);
  } catch (err) {
    console.warn("Error marking messages seen:", err);
  }
}

export function subscribeToSupabaseThread(
  threadId: string,
  currentUserId: string,
  onMessageChange: (msg: ChatMessage, eventType: "INSERT" | "UPDATE" | "DELETE") => void,
) {
  if (!isSupabaseConfigured || !threadId) {
    return () => {};
  }

  const channel = supabase
    .channel(`realtime:thread:${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        if (payload.eventType === "DELETE") {
          const oldRow = payload.old as { id?: string };
          if (oldRow?.id) {
            onMessageChange({ id: oldRow.id, threadId, from: "", text: "", time: "" }, "DELETE");
          }
        } else if (payload.new) {
          const newRow = payload.new as SupabaseMessageRow;
          const formattedMsg = rowToChatMessage(newRow, currentUserId);
          onMessageChange(formattedMsg, payload.eventType as "INSERT" | "UPDATE");
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToSupabasePresence(
  currentUserId: string,
  onPresenceChange: (onlineUserIds: Set<string>) => void,
) {
  if (!isSupabaseConfigured || !currentUserId) {
    return () => {};
  }

  const room = supabase.channel("online-presence", {
    config: {
      presence: {
        key: currentUserId,
      },
    },
  });

  const extractOnlineUsers = () => {
    const state = room.presenceState();
    const onlineSet = new Set<string>();
    Object.keys(state).forEach((key) => {
      onlineSet.add(key);
    });
    onPresenceChange(onlineSet);
  };

  room
    .on("presence", { event: "sync" }, extractOnlineUsers)
    .on("presence", { event: "join" }, extractOnlineUsers)
    .on("presence", { event: "leave" }, extractOnlineUsers)
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await room.track({
          user_id: currentUserId,
          online_at: new Date().toISOString(),
        });
      }
    });

  return () => {
    void room.untrack();
    void supabase.removeChannel(room);
  };
}

import { SEEDED_CAMPUS_PEERS } from "./supabase-data";

function extractProductContext(rows: SupabaseMessageRow[]): string {
  for (const row of rows) {
    if (!row.text) continue;
    const reqMatch = row.text.match(/\[(?:Response to )?Request:?\s*["']?([^"'\n\]]+)["']?\]/i);
    if (reqMatch && reqMatch[1]) {
      return `Request: ${reqMatch[1].trim()}`;
    }
    const inqMatch = row.text.match(/\[(?:Product Inquiry:?|Regarding:?)\s*["']?([^"'\n\]]+)["']?\]/i);
    if (inqMatch && inqMatch[1]) {
      return inqMatch[1].trim();
    }
    const buyMatch = row.text.match(/interested in (?:buying|renting)\s+["']([^"']+)["']/i);
    if (buyMatch && buyMatch[1]) {
      return buyMatch[1].trim();
    }
  }
  return "Direct message";
}

export async function fetchUserChatThreads(currentUserId: string): Promise<ChatThread[]> {
  const baseThreads: ChatThread[] = [AI_ASSISTANT_THREAD];
  if (!isSupabaseConfigured || !currentUserId) return baseThreads;

  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !data) return baseThreads;

    const threadMap = new Map<string, SupabaseMessageRow>();
    const threadAllRowsMap = new Map<string, SupabaseMessageRow[]>();

    (data as SupabaseMessageRow[]).forEach((row) => {
      if (
        row.thread_id.includes(currentUserId) ||
        row.sender_id === currentUserId
      ) {
        if (!threadMap.has(row.thread_id)) {
          threadMap.set(row.thread_id, row);
        }
        const existingList = threadAllRowsMap.get(row.thread_id) || [];
        existingList.push(row);
        threadAllRowsMap.set(row.thread_id, existingList);
      }
    });

    const peerIds = new Set<string>();
    for (const [tId, lastRow] of threadMap.entries()) {
      const parts = tId.replace("dm_", "").split("_");
      const peerId = parts.find((p) => p !== currentUserId) || lastRow.sender_id;
      if (peerId) peerIds.add(peerId);
    }

    const profilesMap = new Map<string, { name: string; avatar: string }>();
    SEEDED_CAMPUS_PEERS.forEach((seed) => {
      profilesMap.set(seed.firebaseUid, {
        name: seed.displayName,
        avatar: seed.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed.displayName)}`,
      });
    });

    if (peerIds.size > 0) {
      try {
        const { data: profData } = await supabase
          .from("profiles")
          .select("id, display_name, full_name, avatar_url")
          .in("id", Array.from(peerIds));

        if (profData) {
          profData.forEach((p) => {
            const name = p.display_name || p.full_name || "Campus Student";
            profilesMap.set(p.id, {
              name,
              avatar:
                p.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || p.id)}`,
            });
          });
        }
      } catch (err) {
        console.warn("Profiles lookup for chat threads:", err);
      }
    }

    const parsedThreads: ChatThread[] = [];
    for (const [tId, lastRow] of threadMap.entries()) {
      const parts = tId.replace("dm_", "").split("_");
      const peerId = parts.find((p) => p !== currentUserId) || lastRow.sender_id;
      const isSender = lastRow.sender_id === currentUserId;

      const profile = profilesMap.get(peerId);
      const displayName =
        profile?.name ||
        (!isSender && lastRow.sender_name ? lastRow.sender_name : "Campus Student");
      const avatar =
        profile?.avatar ||
        (!isSender && lastRow.sender_avatar
          ? lastRow.sender_avatar
          : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName || peerId)}`);

      const date = new Date(lastRow.created_at);
      const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const productContext = extractProductContext(threadAllRowsMap.get(tId) || [lastRow]);

      parsedThreads.push({
        id: tId,
        name: displayName,
        avatar,
        product: productContext,
        online: true,
        lastMsg: lastRow.text,
        time: timeStr,
        unread: 0,
      });
    }

    return [AI_ASSISTANT_THREAD, ...parsedThreads];
  } catch {
    return baseThreads;
  }
}

export function subscribeToUserNewMessages(
  currentUserId: string,
  onNewMessage: () => void,
) {
  if (!isSupabaseConfigured || !currentUserId) {
    return () => {};
  }

  const channel = supabase
    .channel("realtime:all-user-messages")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        if (payload.new) {
          const newRow = payload.new as SupabaseMessageRow;
          if (
            newRow.thread_id.includes(currentUserId) ||
            newRow.sender_id === currentUserId
          ) {
            onNewMessage();
          }
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
