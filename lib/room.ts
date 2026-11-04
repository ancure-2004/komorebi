"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, UserRole } from "./supabase";

export interface WhisperPayload {
  text: string;
}

export interface DropPayload {
  emoji: string;
}

export interface TouchPayload {
  who: string;
  holding: boolean;
}

export interface ChatPayload {
  id: string;
  sender: string;
  sender_id?: string;
  kind: "text" | "polaroid" | "voice";
  type?: "text" | "polaroid" | "voice";
  body?: string | null;
  text?: string | null;
  media_path?: string | null;
  consumed?: boolean;
  viewed_at?: string | null;
  created_at: string;
}

export type PresenceState = Record<string, Array<Record<string, unknown>>>;

export interface RoomEvents {
  onWhisper?: (payload: WhisperPayload) => void;
  onDrop?: (payload: DropPayload) => void;
  onTouch?: (payload: TouchPayload) => void;
  onSos?: () => void;
  onChat?: (payload: ChatPayload) => void;
  onPresence?: (presence: PresenceState) => void;
}

export interface RoomContextValue {
  channel: RealtimeChannel | null;
  role: UserRole;
  send: (event: string, payload?: object) => Promise<string | null>;
  track: (state: object) => Promise<string | null>;
  presence: PresenceState;
  isSubscribed: boolean;
  registerHandlers: (handlers: RoomEvents) => () => void;
  // Direct handler callbacks
  onTouch?: (payload: TouchPayload) => void;
  onWhisper?: (payload: WhisperPayload) => void;
  onDrop?: (payload: DropPayload) => void;
  onSos?: () => void;
  onChat?: (payload: ChatPayload) => void;
}

const RoomContext = createContext<RoomContextValue | null>(null);

/**
 * Low-level room connection helper.
 */
export function joinRoom(role: UserRole, handlers: RoomEvents): RealtimeChannel {
  const ch = supabase.channel("komorebi:room", {
    config: {
      broadcast: { self: false },
      presence: { key: role },
    },
  });

  ch.on("broadcast", { event: "whisper" }, ({ payload }) => {
    handlers.onWhisper?.(payload as WhisperPayload);
  })
    .on("broadcast", { event: "drop" }, ({ payload }) => {
      handlers.onDrop?.(payload as DropPayload);
    })
    .on("broadcast", { event: "touch" }, ({ payload }) => {
      handlers.onTouch?.(payload as TouchPayload);
    })
    .on("broadcast", { event: "sos" }, () => {
      handlers.onSos?.();
    })
    .on("broadcast", { event: "chat" }, ({ payload }) => {
      handlers.onChat?.(payload as ChatPayload);
    })
    .on("presence", { event: "sync" }, () => {
      handlers.onPresence?.(ch.presenceState());
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.track({ role, label: "Online", ts: Date.now() });
      }
    });

  return ch;
}

/**
 * Broadcasts an event over the given Realtime channel.
 */
export async function send(
  ch: RealtimeChannel | null,
  event: string,
  payload: object = {}
): Promise<string | null> {
  // 2. Peer-to-peer WebSocket broadcast delivery
  if (!ch) {
    return null;
  }
  try {
    const res = await ch.send({
      type: "broadcast",
      event,
      payload,
    });
    return res;
  } catch (err) {
    console.warn(`[Komorebi Room] Broadcast ${event} warning:`, err);
    return null;
  }
}

interface RoomProviderProps {
  role?: UserRole | null;
  children: ReactNode;
}

// Module-level singleton room channel.
// React StrictMode (dev) mounts effects twice; tearing the channel down in a
// cleanup races supabase.channel() reusing the same topic object, leaving the
// app on a CLOSED channel where sends fall back to REST and nothing is received.
// One long-lived channel per tab avoids that entirely.
const roomListeners = new Set<RoomEvents>();
const roomStatusSubs = new Set<(subscribed: boolean) => void>();
const roomPresenceSubs = new Set<(state: PresenceState) => void>();
let roomChannel: RealtimeChannel | null = null;
let roomSubscribed = false;

function emit<K extends keyof RoomEvents>(key: K, payload?: unknown) {
  roomListeners.forEach((l) => {
    const fn = l[key] as ((p?: unknown) => void) | undefined;
    fn?.(payload);
  });
}

function getRoomChannel(role: UserRole): RealtimeChannel {
  if (roomChannel) return roomChannel;
  const ch = supabase.channel("komorebi:room", {
    config: { broadcast: { self: false }, presence: { key: role } },
  });
  roomChannel = ch;
  ch.on("broadcast", { event: "whisper" }, ({ payload }) => emit("onWhisper", payload))
    .on("broadcast", { event: "drop" }, ({ payload }) => emit("onDrop", payload))
    .on("broadcast", { event: "touch" }, ({ payload }) => emit("onTouch", payload))
    .on("broadcast", { event: "sos" }, () => emit("onSos"))
    .on("broadcast", { event: "chat" }, ({ payload }) => emit("onChat", payload))
    .on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      roomPresenceSubs.forEach((fn) => fn(state));
      emit("onPresence", state);
    })
    .subscribe((status) => {
      roomSubscribed = status === "SUBSCRIBED";
      roomStatusSubs.forEach((fn) => fn(roomSubscribed));
      if (status === "SUBSCRIBED") {
        ch.track({ role, label: "Online", ts: Date.now() });
      }
    });
  return ch;
}

/**
 * React Provider exposing the shared real-time room connection.
 * Role is inferred from the route: /captain is captain, everything else is her.
 */
export function RoomProvider({ role: propRole, children }: RoomProviderProps) {
  const [presence, setPresence] = useState<PresenceState>({});
  const [isSubscribed, setIsSubscribed] = useState(roomSubscribed);
  const channelRef = useRef<RealtimeChannel | null>(roomChannel);

  const activeRole: UserRole =
    propRole ||
    (typeof window !== "undefined" && window.location.pathname.startsWith("/captain")
      ? "captain"
      : "her");

  const directHandlersRef = useRef<RoomEvents>({});

  const registerHandlers = useCallback((handlers: RoomEvents) => {
    roomListeners.add(handlers);
    return () => {
      roomListeners.delete(handlers);
    };
  }, []);

  useEffect(() => {
    channelRef.current = getRoomChannel(activeRole);
    const direct: RoomEvents = {
      onWhisper: (p) => directHandlersRef.current.onWhisper?.(p),
      onDrop: (p) => directHandlersRef.current.onDrop?.(p),
      onTouch: (p) => directHandlersRef.current.onTouch?.(p),
      onSos: () => directHandlersRef.current.onSos?.(),
      onChat: (p) => directHandlersRef.current.onChat?.(p),
    };
    roomListeners.add(direct);
    roomStatusSubs.add(setIsSubscribed);
    roomPresenceSubs.add(setPresence);
    return () => {
      roomListeners.delete(direct);
      roomStatusSubs.delete(setIsSubscribed);
      roomPresenceSubs.delete(setPresence);
    };
  }, [activeRole]);

  const handleSend = useCallback(
    async (event: string, payload: object = {}) => {
      if (!channelRef.current) return null;
      return send(channelRef.current, event, payload);
    },
    []
  );

  const handleTrack = useCallback(
    async (state: object) => {
      if (!channelRef.current) return null;
      try {
        return await channelRef.current.track(state);
      } catch (err) {
        console.warn("Failed to track presence:", err);
        return null;
      }
    },
    []
  );

  const contextValue: RoomContextValue = {
    get channel() {
      return channelRef.current;
    },
    role: activeRole,
    send: handleSend,
    track: handleTrack,
    presence,
    isSubscribed,
    registerHandlers,
    get onTouch() {
      return directHandlersRef.current.onTouch;
    },
    set onTouch(fn) {
      directHandlersRef.current.onTouch = fn;
    },
    get onWhisper() {
      return directHandlersRef.current.onWhisper;
    },
    set onWhisper(fn) {
      directHandlersRef.current.onWhisper = fn;
    },
    get onDrop() {
      return directHandlersRef.current.onDrop;
    },
    set onDrop(fn) {
      directHandlersRef.current.onDrop = fn;
    },
    get onSos() {
      return directHandlersRef.current.onSos;
    },
    set onSos(fn) {
      directHandlersRef.current.onSos = fn;
    },
    get onChat() {
      return directHandlersRef.current.onChat;
    },
    set onChat(fn) {
      directHandlersRef.current.onChat = fn;
    },
  };

  return React.createElement(RoomContext.Provider, { value: contextValue }, children);
}

/**
 * Hook to access the real-time Komorebi room context.
 */
export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    return {
      channel: null,
      role: "her",
      send: async () => null,
      track: async () => null,
      presence: {},
      isSubscribed: false,
      registerHandlers: () => () => {},
    };
  }
  return ctx;
}
