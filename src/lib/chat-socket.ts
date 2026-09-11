import { io, type Socket } from "socket.io-client";
import * as React from "react";

export type ChatConnectionState = "disconnected" | "connecting" | "connected" | "error";

export type ChatThread = {
  id: string;
  name: string;
  avatar: string;
  product: string;
  online: boolean;
  lastMsg: string;
  time: string;
  unread: number;
  /** Client-only: opens AI assistant route instead of Socket thread */
  isBot?: boolean;
};

export type ChatAttachment = {
  id: string;
  kind: "image" | "file";
  name: string;
  size: number;
  previewUrl?: string;
};

export type ChatReaction = Record<string, { count: number; mine?: boolean }>;

export type ChatMessage = {
  id: string;
  threadId: string;
  // flexible `from` so messages can come from arbitrary user ids (e.g. 'ai')
  from: string;
  text: string;
  time: string;
  edited?: boolean;
  delivery?: "sending" | "sent" | "delivered" | "seen";
  // optional author metadata to allow rendering AI or other participants
  authorId?: string;
  authorName?: string;
  authorAvatar?: string | null;
  replyTo?: { id: string; text: string; from: string };
  attachments?: ChatAttachment[];
  reactions?: ChatReaction;
};

export type ChatThreadPayload = {
  thread: ChatThread;
  messages: ChatMessage[];
};

export type ChatUser = {
  id: string;
  name: string;
  avatar?: string | null;
};

export type ChatSocketEvents = {
  "chat:threads": (payload: { threads: ChatThread[] }) => void;
  "chat:thread:messages": (payload: ChatThreadPayload) => void;
  "chat:thread:update": (payload: ChatThreadPayload) => void;
  "chat:presence": (payload: { threadId: string; online: boolean }) => void;
};

export type ChatSocketClientEvents = {
  "chat:threads:load": () => void;
  "chat:thread:join": (payload: { threadId: string; user: ChatUser }) => void;
  "chat:message:send": (payload: {
    threadId: string;
    user: ChatUser;
    text: string;
    replyTo?: ChatMessage["replyTo"] | null;
    attachments?: ChatAttachment[];
  }) => void;
  "chat:message:edit": (payload: {
    threadId: string;
    messageId: string;
    text: string;
    user: ChatUser;
  }) => void;
  "chat:message:delete": (payload: { threadId: string; messageId: string; user: ChatUser }) => void;
  "chat:message:react": (payload: {
    threadId: string;
    messageId: string;
    emoji: string;
    user: ChatUser;
  }) => void;
  "chat:typing": (payload: { threadId: string; user: ChatUser; typing: boolean }) => void;
  /** Creates a peer DM thread on the Socket.IO worker if missing (id must start with dm_). */
  "chat:dm:ensure": (payload: { threadId: string; thread: ChatThread }) => void;
};

let socket: Socket<ChatSocketEvents, ChatSocketClientEvents> | null = null;
let connectionState: ChatConnectionState = "disconnected";
let connectionStateListeners: Set<(state: ChatConnectionState) => void> = new Set();

function getChatSocketUrl() {
  return import.meta.env.VITE_CHAT_SOCKET_URL ?? "http://localhost:3001";
}

export function setConnectionState(state: ChatConnectionState) {
  if (connectionState !== state) {
    connectionState = state;
    connectionStateListeners.forEach((listener) => listener(state));
  }
}

export function getConnectionState(): ChatConnectionState {
  return connectionState;
}

export function onConnectionStateChange(listener: (state: ChatConnectionState) => void): () => void {
  connectionStateListeners.add(listener);
  return () => {
    connectionStateListeners.delete(listener);
  };
}

export function getChatSocket() {
  if (!socket) {
    socket = io(getChatSocketUrl(), {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    // Connection lifecycle handlers
    socket.on("connect", () => {
      setConnectionState("connected");
    });

    socket.on("disconnect", () => {
      setConnectionState("disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setConnectionState("error");
    });
  }

  return socket;
}

/**
 * React hook to track socket connection state
 */
export function useSocketStatus() {
  const [state, setState] = React.useState<ChatConnectionState>(getConnectionState());

  React.useEffect(() => {
    const unsubscribe = onConnectionStateChange((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  return {
    connected: state === "connected",
    connecting: state === "connecting",
    disconnected: state === "disconnected",
    error: state === "error",
    state,
  };
}
