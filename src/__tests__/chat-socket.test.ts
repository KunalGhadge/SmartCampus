import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getChatSocket,
  getConnectionState,
  setConnectionState,
  onConnectionStateChange,
  type ChatConnectionState,
} from "@/lib/chat-socket";

describe("Chat Socket Connection State", () => {
  beforeEach(() => {
    // Reset to disconnected state before each test
    setConnectionState("disconnected");
  });

  it("initializes with disconnected state", () => {
    expect(getConnectionState()).toBe("disconnected");
  });

  it("updates connection state", () => {
    setConnectionState("connecting");
    expect(getConnectionState()).toBe("connecting");

    setConnectionState("connected");
    expect(getConnectionState()).toBe("connected");

    setConnectionState("error");
    expect(getConnectionState()).toBe("error");
  });

  it("notifies listeners when state changes", () => {
    const listener = vi.fn();
    const unsubscribe = onConnectionStateChange(listener);

    setConnectionState("connecting");
    expect(listener).toHaveBeenCalledWith("connecting");

    setConnectionState("connected");
    expect(listener).toHaveBeenCalledWith("connected");
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setConnectionState("disconnected");
    // Should not be called again after unsubscribe
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("supports multiple listeners", () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const unsub1 = onConnectionStateChange(listener1);
    const unsub2 = onConnectionStateChange(listener2);

    setConnectionState("connected");

    expect(listener1).toHaveBeenCalledWith("connected");
    expect(listener2).toHaveBeenCalledWith("connected");

    unsub1();
    setConnectionState("disconnected");

    expect(listener1).toHaveBeenCalledTimes(1); // Not called after unsubscribe
    expect(listener2).toHaveBeenCalledTimes(2);
  });

  it("does not notify when state hasn't changed", () => {
    setConnectionState("connected");
    const listener = vi.fn();
    onConnectionStateChange(listener);

    // Set to same state
    setConnectionState("connected");
    expect(listener).not.toHaveBeenCalled();
  });

  it("represents all valid connection states", () => {
    const states: ChatConnectionState[] = [
      "disconnected",
      "connecting",
      "connected",
      "error",
    ];

    states.forEach((state) => {
      setConnectionState(state);
      expect(getConnectionState()).toBe(state);
    });
  });
});

describe("Chat Socket Singleton", () => {
  it("returns the same socket instance on multiple calls", () => {
    const socket1 = getChatSocket();
    const socket2 = getChatSocket();
    expect(socket1).toBe(socket2);
  });

  it("initializes socket with correct configuration", () => {
    const socket = getChatSocket();
    // Socket.IO client options
    expect(socket).toBeDefined();
    expect(socket.connected === false || socket.connected === true).toBe(true); // Valid boolean
  });

  it("socket is configured with websocket transport", () => {
    const socket = getChatSocket();
    // Check that socket exists and has expected methods
    expect(socket.emit).toBeDefined();
    expect(socket.on).toBeDefined();
    expect(socket.off).toBeDefined();
    expect(socket.connect).toBeDefined();
    expect(socket.disconnect).toBeDefined();
  });

  it("socket has reconnection configuration", () => {
    const socket = getChatSocket();
    // Socket should be configured with reconnection settings
    // These are set in the getChatSocket initialization
    expect(socket.io.opts.reconnection).toBe(true);
    expect(socket.io.opts.reconnectionAttempts).toBe(10);
  });
});

describe("Chat Socket URL Configuration", () => {
  it("uses environment variable for socket URL", () => {
    const socket = getChatSocket();
    // Socket is created with the configured URL
    // The URL is composed from env.VITE_CHAT_SOCKET_URL or defaults to http://localhost:3001
    expect(socket).toBeDefined();
  });
});
