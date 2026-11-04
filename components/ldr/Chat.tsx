"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Camera,
  Mic,
  X,
  Sparkles,
  Lock,
  Play,
  Check,
  CheckCheck,
  Shield,
  Loader2,
} from "lucide-react";
import { supabase, Message, useSession } from "@/lib/supabase";
import { useRoom, ChatPayload } from "@/lib/room";
import { toSquareJpeg, sendMedia, consumeMedia } from "@/lib/media";
import { haptics } from "@/lib/haptics";

export interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export default function Chat({ isOpen, onClose, className = "" }: ChatProps) {
  const session = useSession();
  const room = useRoom();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Infer user identity with fallback to known user IDs
  const isCaptain =
    session.role === "captain" ||
    room.role === "captain" ||
    (typeof window !== "undefined" && window.location.pathname.startsWith("/captain"));

  const activeUid =
    session.uid ||
    (isCaptain
      ? "b8eb2e9f-ad30-49a3-8cff-1e90445f04e8"
      : "a0ba3cb9-5397-498b-8740-5b9842381d15");

  // Polaroid preview state for developing view-once photo
  const [developingUrl, setDevelopingUrl] = useState<string | null>(null);
  const [isDeveloping, setIsDeveloping] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, []);

  // Fetch active messages and subscribe to Realtime changes + WebSocket broadcast
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    async function loadMessages() {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && data && mounted) {
          const visible = (data as Message[]).filter(
            (m) => !m.text?.startsWith("SIGNAL:") && !m.body?.startsWith("SIGNAL:")
          );
          setMessages(visible);
          setTimeout(scrollToBottom, 100);
        }
      } catch (err) {
        console.warn("Could not load messages:", err);
      }
    }

    loadMessages();

    // Subscribe to Postgres changes on messages table
    const channel = supabase
      .channel("sanctuary-messages-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new as Message;
            if (newRow.text?.startsWith("SIGNAL:") || newRow.body?.startsWith("SIGNAL:")) {
              return;
            }
            setMessages((prev) => {
              if (prev.some((m) => m.id === newRow.id)) return prev;
              return [...prev, newRow];
            });
            setTimeout(scrollToBottom, 100);
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? (payload.new as Message) : m))
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Also register broadcast listener for peer-to-peer real-time delivery
    const unregisterRoom = room.registerHandlers({
      onChat: (payload: ChatPayload) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          const incoming: Message = {
            id: payload.id,
            sender_id: payload.sender_id || payload.sender,
            sender: payload.sender,
            text: payload.text || payload.body || null,
            body: payload.body || payload.text || null,
            type: payload.kind,
            kind: payload.kind,
            media_path: payload.media_path || null,
            consumed: false,
            viewed_at: null,
            created_at: payload.created_at || new Date().toISOString(),
          };
          return [...prev, incoming];
        });
        setTimeout(scrollToBottom, 100);
      },
    });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      unregisterRoom();
    };
  }, [isOpen, scrollToBottom, room]);

  // Send Text Message
  const handleSendText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText("");
    haptics.light();

    const tempId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMsg: Message = {
      id: tempId,
      sender_id: activeUid,
      sender: activeUid,
      text,
      body: text,
      type: "text",
      kind: "text",
      media_path: null,
      consumed: false,
      viewed_at: null,
      created_at: new Date().toISOString(),
    };

    // Optimistically show on sender's screen
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    // Broadcast over WebSocket room for instant delivery to partner
    room.send("chat", optimisticMsg);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: activeUid,
          sender: activeUid,
          text,
          body: text,
          type: "text",
          kind: "text",
        })
        .select()
        .single();

      if (!error && data) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? (data as Message) : m))
        );
      }
    } catch (err) {
      console.warn("Failed to persist text message:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Photo Capture (Front Camera Polaroid)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSending(true);
    haptics.medium();

    try {
      const squareBlob = await toSquareJpeg(file, 720, 0.85);
      const res = await sendMedia("polaroid", squareBlob, "image/jpeg");
      if (res?.id) {
        room.send("chat", {
          id: res.id,
          sender: activeUid,
          sender_id: activeUid,
          kind: "polaroid",
          type: "polaroid",
          media_path: res.media_path,
          created_at: new Date().toISOString(),
        });
      }
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.warn("Failed to upload Polaroid:", err);
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Consume & View Once Polaroid
  const handleConsumePolaroid = async (messageId: string) => {
    haptics.medium();
    setIsDeveloping(true);

    try {
      const { url, error } = await consumeMedia(messageId);
      if (error || !url) {
        alert("This Polaroid has already vanished.");
        return;
      }

      setDevelopingUrl(url);

      // Auto-revoke and vanish after 25 seconds
      setTimeout(() => {
        URL.revokeObjectURL(url);
        setDevelopingUrl(null);
      }, 25000);
    } catch (err) {
      console.warn("Failed to consume Polaroid:", err);
    } finally {
      setIsDeveloping(false);
    }
  };

  // Hold-to-Record Voice Notes
  const startRecording = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t)) || "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });

        if (audioBlob.size > 1000) {
          try {
            const res = await sendMedia("voice", audioBlob, mimeType || "audio/webm");
            if (res?.id) {
              room.send("chat", {
                id: res.id,
                sender: activeUid,
                sender_id: activeUid,
                kind: "voice",
                type: "voice",
                media_path: res.media_path,
                created_at: new Date().toISOString(),
              });
            }
            setTimeout(scrollToBottom, 100);
          } catch (err) {
            console.warn("Failed to send voice note:", err);
          }
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      haptics.medium();
    } catch (err) {
      console.warn("Microphone access denied or unavailable:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      haptics.light();
    }
  };

  // Play Once Voice Note
  const handlePlayVoice = async (messageId: string) => {
    haptics.light();
    try {
      const { url } = await consumeMedia(messageId);
      if (url) {
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.warn("Failed to play voice note:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col bg-cream dark:bg-mocha select-none ${className}`}
      role="dialog"
      aria-modal="true"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EBE7DF] dark:border-[#383530] bg-paper/90 dark:bg-obsidian/90 backdrop-blur-md safe">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-sage/20 text-sage flex items-center justify-center font-bold">
            ❤️
          </div>
          <div>
            <h3 className="font-serif text-base font-semibold text-ink dark:text-cream leading-tight">
              Sanctuary Chat
            </h3>
            <span className="text-[10px] font-sans text-ink/50 dark:text-cream/50">
              Private • Cleared nightly at 00:00 IST
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-ink/60 dark:text-cream/60 hover:bg-sage/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Ephemeral Notice Ribbon */}
      <div className="px-4 py-1.5 bg-sage/10 text-center border-b border-sage/20">
        <span className="text-[11px] font-sans text-sage dark:text-matcha flex items-center justify-center gap-1.5 font-medium">
          <Shield className="w-3.5 h-3.5" />
          <span>Single-thread ephemeral chat. Polaroids & voice vanish once viewed.</span>
        </span>
      </div>

      {/* Messages Scroll Feed */}
      <div
        ref={chatScrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-3.5"
      >
        {messages.length === 0 ? (
          <div className="text-center py-16 text-ink/40 dark:text-cream/40 space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-sage/40" />
            <p className="font-serif text-sm">A quiet sanctuary waiting for you.</p>
            <p className="text-[11px] font-sans">
              Send a text, snap a quick Polaroid selfie, or hold to send your voice.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe =
              m.sender === activeUid ||
              m.sender_id === activeUid ||
              (isCaptain
                ? m.sender === "b8eb2e9f-ad30-49a3-8cff-1e90445f04e8" || m.sender_id === "b8eb2e9f-ad30-49a3-8cff-1e90445f04e8"
                : m.sender === "a0ba3cb9-5397-498b-8740-5b9842381d15" || m.sender_id === "a0ba3cb9-5397-498b-8740-5b9842381d15");
            const isVanished = m.consumed || Boolean(m.viewed_at && !m.media_path);

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                {/* TEXT MESSAGE */}
                {m.kind === "text" || m.type === "text" ? (
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-sans whitespace-pre-wrap leading-relaxed shadow-sm ${
                      isMe
                        ? "bg-sage text-cream rounded-br-sm"
                        : "bg-paper dark:bg-obsidian text-ink dark:text-cream border border-[#EBE7DF] dark:border-[#383530] rounded-bl-sm"
                    }`}
                  >
                    {m.body || m.text}
                  </div>
                ) : null}

                {/* POLAROID MESSAGE */}
                {m.kind === "polaroid" || m.type === "polaroid" ? (
                  <div className="max-w-[78%]">
                    {isVanished ? (
                      <div className="px-3.5 py-2 rounded-xl bg-paper/60 dark:bg-obsidian/40 border border-dashed border-[#DDD7CD] text-[11px] text-ink/40 dark:text-cream/40 italic flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Polaroid has vanished ✨</span>
                      </div>
                    ) : isMe ? (
                      <div className="p-3 rounded-2xl bg-sage/20 border border-sage/40 text-xs text-ink dark:text-cream flex items-center gap-2">
                        <Camera className="w-4 h-4 text-sage" />
                        <span>Polaroid sent · Waiting for view</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConsumePolaroid(m.id)}
                        disabled={isDeveloping}
                        className="p-3.5 rounded-2xl bg-paper dark:bg-obsidian border-2 border-sakura/50 text-xs font-medium text-ink dark:text-cream flex items-center gap-2.5 shadow-sm active:scale-95 transition-all"
                      >
                        <Camera className="w-4 h-4 text-sakura animate-pulse" />
                        <span>Tap to develop Polaroid (View Once) 📸</span>
                      </button>
                    )}
                  </div>
                ) : null}

                {/* VOICE NOTE MESSAGE */}
                {m.kind === "voice" || m.type === "voice" ? (
                  <div className="max-w-[78%]">
                    {isVanished ? (
                      <div className="px-3.5 py-2 rounded-xl bg-paper/60 dark:bg-obsidian/40 border border-dashed border-[#DDD7CD] text-[11px] text-ink/40 italic flex items-center gap-1.5">
                        <Mic className="w-3.5 h-3.5" />
                        <span>Voice note played & deleted ✨</span>
                      </div>
                    ) : isMe ? (
                      <div className="p-3 rounded-2xl bg-sage/20 border border-sage/40 text-xs text-ink flex items-center gap-2">
                        <Mic className="w-4 h-4 text-sage" />
                        <span>Voice note sent (Single play)</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePlayVoice(m.id)}
                        className="px-4 py-2.5 rounded-2xl bg-paper dark:bg-obsidian border border-sage text-xs font-medium text-ink dark:text-cream flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 text-sage fill-current" />
                        <span>Play Voice Note (Once) 🎙️</span>
                      </button>
                    )}
                  </div>
                ) : null}

                {/* Timestamp & Status Indicator */}
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-[10px] text-ink/40 dark:text-cream/40">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isMe && (
                    <span className="text-sage">
                      {m.viewed_at ? (
                        <CheckCheck className="w-3 h-3" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Polaroid Developing Fullscreen Overlay */}
      <AnimatePresence>
        {developingUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mocha/80 dark:bg-black/90 backdrop-blur-md select-none"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-3.5 pb-10 rounded-2xl shadow-2xl max-w-xs w-full text-center space-y-3"
            >
              <div className="w-full aspect-square rounded overflow-hidden bg-black/10 relative">
                <motion.img
                  src={developingUrl}
                  alt="Single view polaroid"
                  initial={{ filter: "brightness(0) sepia(1)", opacity: 0.2 }}
                  animate={{ filter: "brightness(1) sepia(0)", opacity: 1 }}
                  transition={{ duration: 3.5, ease: "easeOut" }}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="font-serif italic text-xs text-[#3A3833]">
                Single-view Polaroid • Vanishing soon ✨
              </p>
              <button
                type="button"
                onClick={() => setDevelopingUrl(null)}
                className="w-full py-2 rounded-xl bg-sage text-cream text-xs font-medium"
              >
                Close & Vanish
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Input Action Bar */}
      <div className="p-3 border-t border-[#EBE7DF] dark:border-[#383530] bg-paper dark:bg-obsidian safe flex items-center gap-2">
        {/* Hidden Camera Input for Front-Camera Selfie */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handlePhotoSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Capture Polaroid Selfie"
          className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-ink/70 dark:text-cream/70 hover:bg-sage/10 active:scale-95 transition-all"
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <form onSubmit={handleSendText} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a loving note..."
            className="flex-1 h-11 px-3.5 rounded-xl bg-cream dark:bg-mocha border border-[#EBE7DF] dark:border-[#383530] text-xs sm:text-sm text-ink dark:text-cream focus:outline-none focus:ring-2 focus:ring-sage"
          />

          {inputText.trim() ? (
            <button
              type="submit"
              disabled={isSending}
              aria-label="Send message"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-sage text-cream flex items-center justify-center shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          ) : (
            /* Hold to Record Voice Note */
            <button
              type="button"
              onPointerDown={startRecording}
              onPointerUp={stopRecording}
              onPointerCancel={stopRecording}
              aria-label="Hold to record voice note"
              className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-all ${
                isRecording
                  ? "bg-sakura text-mocha scale-110 animate-pulse shadow-aura"
                  : "text-ink/70 dark:text-cream/70 hover:bg-sage/10 active:scale-95"
              }`}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
