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
  body?: string | null;
  text?: string | null;
  media_path?: string | null;
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
  if (!ch) return null;
  try {
    return await ch.send({
      type: "broadcast",
      event,
      payload,
    });
  } catch (err) {
    console.warn(`Failed to broadcast ${event}:`, err);
    return null;
  }
}

interface RoomProviderProps {
  role?: UserRole | null;
  children: ReactNode;
}

/**
 * React Provider managing the real-time presence and broadcast connection.
 * Auto-resolves active role (captain vs her) so it connects immediately even before login.
 */
export function RoomProvider({ role: propRole, children }: RoomProviderProps) {
  const [presence, setPresence] = useState<PresenceState>({});
  const [isSubscribed, setIsSubscribed] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Inferred role: fallback to URL pathname or default to 'her'
  const activeRole: UserRole =
    propRole ||
    (typeof window !== "undefined" && window.location.pathname.startsWith("/captain")
      ? "captain"
      : "her");

  // Registered listeners set
  const listenersRef = useRef<Set<RoomEvents>>(new Set());
  const directHandlersRef = useRef<RoomEvents>({});

  const registerHandlers = useCallback((handlers: RoomEvents) => {
    listenersRef.current.add(handlers);
    return () => {
      listenersRef.current.delete(handlers);
    };
  }, []);

  useEffect(() => {
    // Connect to shared broadcast & presence channel
    const ch = supabase.channel("komorebi:room", {
      config: {
        broadcast: { self: false },
        presence: { key: activeRole },
      },
    });

    channelRef.current = ch;

    ch.on("broadcast", { event: "whisper" }, ({ payload }) => {
      directHandlersRef.current.onWhisper?.(payload as WhisperPayload);
      listenersRef.current.forEach((l) => l.onWhisper?.(payload as WhisperPayload));
    })
      .on("broadcast", { event: "drop" }, ({ payload }) => {
        directHandlersRef.current.onDrop?.(payload as DropPayload);
        listenersRef.current.forEach((l) => l.onDrop?.(payload as DropPayload));
      })
      .on("broadcast", { event: "touch" }, ({ payload }) => {
        directHandlersRef.current.onTouch?.(payload as TouchPayload);
        listenersRef.current.forEach((l) => l.onTouch?.(payload as TouchPayload));
      })
      .on("broadcast", { event: "sos" }, () => {
        directHandlersRef.current.onSos?.();
        listenersRef.current.forEach((l) => l.onSos?.());
      })
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        directHandlersRef.current.onChat?.(payload as ChatPayload);
        listenersRef.current.forEach((l) => l.onChat?.(payload as ChatPayload));
      })
      .on("presence", { event: "sync" }, () => {
        const state = ch.presenceState();
        setPresence(state);
        directHandlersRef.current.onPresence?.(state);
        listenersRef.current.forEach((l) => l.onPresence?.(state));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsSubscribed(true);
          ch.track({ role: activeRole, label: "Online", ts: Date.now() });
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsSubscribed(false);
        }
      });

    return () => {
      channelRef.current = null;
      setIsSubscribed(false);
      supabase.removeChannel(ch);
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
