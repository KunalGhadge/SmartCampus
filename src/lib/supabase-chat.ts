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

  return {
    id: row.id,
    threadId: row.thread_id,
    from: isMe ? "me" : row.sender_id,
    text: row.text,
    time: timeStr,
    delivery: "delivered",
    authorId: row.sender_id,
    authorName: row.sender_name || (isMe ? "You" : "Student"),
    authorAvatar:
      row.sender_avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.sender_id)}`,
    attachments: attachments.length ? attachments : undefined,
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
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error sending message to Supabase:", error);
    throw error;
  }

  return rowToChatMessage(data as SupabaseMessageRow, payload.senderId);
}

export function subscribeToSupabaseThread(
  threadId: string,
  currentUserId: string,
  onNewMessage: (msg: ChatMessage) => void,
) {
  if (!isSupabaseConfigured || !threadId) {
    return () => {};
  }

  const channel = supabase
    .channel(`realtime:thread:${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `thread_id=eq.${threadId}`,
      },
      (payload) => {
        if (payload.new) {
          const newRow = payload.new as SupabaseMessageRow;
          const formattedMsg = rowToChatMessage(newRow, currentUserId);
          onNewMessage(formattedMsg);
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
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
    (data as SupabaseMessageRow[]).forEach((row) => {
      if (
        row.thread_id.includes(currentUserId) ||
        row.sender_id === currentUserId
      ) {
        if (!threadMap.has(row.thread_id)) {
          threadMap.set(row.thread_id, row);
        }
      }
    });

    const parsedThreads: ChatThread[] = [];
    for (const [tId, lastRow] of threadMap.entries()) {
      const parts = tId.replace("dm_", "").split("_");
      const peerId = parts.find((p) => p !== currentUserId) || lastRow.sender_id;
      const isSender = lastRow.sender_id === currentUserId;

      const date = new Date(lastRow.created_at);
      const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      parsedThreads.push({
        id: tId,
        name: isSender ? "Campus Student" : (lastRow.sender_name || "Campus Student"),
        avatar:
          lastRow.sender_avatar ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(peerId)}`,
        product: "Direct message",
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
