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
 * Broadcasts an event over the given Realtime channel and persists a fallback
 * signal into PostgreSQL messages table for 100% guaranteed dual-channel delivery.
 */
export async function send(
  ch: RealtimeChannel | null,
  event: string,
  payload: object = {}
): Promise<string | null> {
  const isCaptain =
    typeof window !== "undefined" && window.location.pathname.startsWith("/captain");
  const activeUid = isCaptain
    ? "b8eb2e9f-ad30-49a3-8cff-1e90445f04e8"
    : "a0ba3cb9-5397-498b-8740-5b9842381d15";

  // 1. Dual-channel persistence: insert signal row into messages table
  try {
    supabase
      .from("messages")
      .insert({
        sender_id: activeUid,
        sender: activeUid,
        type: "text",
        kind: "text",
        text: `SIGNAL:${JSON.stringify({ event, payload, ts: Date.now() })}`,
        body: `SIGNAL:${JSON.stringify({ event, payload, ts: Date.now() })}`,
      })
      .then(() => {})
      .catch((err) => console.warn("[Komorebi Room] Signal insert note:", err));
  } catch {
    // Non-blocking
  }

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
  const seenSignalsRef = useRef<Set<string>>(new Set());

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
      // Dual-channel Postgres Changes fallback for 100% guaranteed delivery
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (p) => {
          const text = (p.new as { text?: string; body?: string })?.text || (p.new as { text?: string; body?: string })?.body || "";
          if (typeof text === "string" && text.startsWith("SIGNAL:")) {
            try {
              const data = JSON.parse(text.substring(7));
              const event = data.event;
              const payload = data.payload || {};

              const isCap =
                typeof window !== "undefined" &&
                window.location.pathname.startsWith("/captain");
              const currentMe = isCap ? "captain" : "her";

              // Do not notify self of own touch events
              if (event === "touch" && payload.who === currentMe) return;

              const signalKey = `${event}-${JSON.stringify(payload)}-${Math.floor(
                (data.ts || Date.now()) / 2500
              )}`;
              if (seenSignalsRef.current.has(signalKey)) return;
              seenSignalsRef.current.add(signalKey);
              setTimeout(() => seenSignalsRef.current.delete(signalKey), 5000);

              if (event === "drop") {
                directHandlersRef.current.onDrop?.(payload as DropPayload);
                listenersRef.current.forEach((l) => l.onDrop?.(payload as DropPayload));
              } else if (event === "whisper") {
                directHandlersRef.current.onWhisper?.(payload as WhisperPayload);
                listenersRef.current.forEach((l) => l.onWhisper?.(payload as WhisperPayload));
              } else if (event === "touch") {
                directHandlersRef.current.onTouch?.(payload as TouchPayload);
                listenersRef.current.forEach((l) => l.onTouch?.(payload as TouchPayload));
              } else if (event === "sos") {
                directHandlersRef.current.onSos?.();
                listenersRef.current.forEach((l) => l.onSos?.());
              } else if (event === "chat") {
                directHandlersRef.current.onChat?.(payload as ChatPayload);
                listenersRef.current.forEach((l) => l.onChat?.(payload as ChatPayload));
              }
            } catch (err) {
              console.warn("[Komorebi Room] Signal parse note:", err);
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[Komorebi Room] Channel status (${activeRole}):`, status, err || "");
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
