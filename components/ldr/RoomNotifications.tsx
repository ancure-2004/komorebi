"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  ShieldAlert,
  MessageCircle,
  X,
  PhoneCall,
  Bell,
  Sparkles,
} from "lucide-react";
import { useRoom, TouchPayload, ChatPayload, DropPayload, WhisperPayload } from "@/lib/room";
import { buzz, haptics } from "@/lib/haptics";
import {
  playChime,
  showBrowserNotification,
  requestNotificationPermission,
  hasNotificationPermission,
} from "@/lib/notifications";

export default function RoomNotifications() {
  const room = useRoom();

  // Explicit route-based role: guarantees / is always 'her' and /captain is always 'captain'
  const isCaptain =
    typeof window !== "undefined" && window.location.pathname.startsWith("/captain");
  const myRole: "captain" | "her" = isCaptain ? "captain" : "her";

  // ── Browser Notification Permission State ──────────────────────────
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);
  const [hasPermission, setHasPermission] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission === "granted";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        // Show non-intrusive prompt after 1.5 seconds
        const timer = setTimeout(() => setShowPermissionBanner(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setHasPermission(granted);
    setShowPermissionBanner(false);
    if (granted) {
      haptics.success();
      showBrowserNotification({
        title: "✨ Notifications Enabled!",
        body: myRole === "captain"
          ? "You will receive Her live sync touch and SOS alerts."
          : "You will receive Captain's heartbeat touches, study drops and notes.",
        tag: "welcome",
      });
    }
  };

  // ── 1. Mutual Touch State ──────────────────────────────────────────
  const [remoteHolding, setRemoteHolding] = useState(false);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── 2. SOS Alert State ─────────────────────────────────────────────
  const [sosActive, setSosActive] = useState(false);

  // ── 3. Incoming Chat Preview State ─────────────────────────────────
  const [chatNotice, setChatNotice] = useState<{
    id: string;
    senderRole: "captain" | "her";
    preview: string;
  } | null>(null);
  const chatNoticeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unregister = room.registerHandlers({
      onTouch: ({ who, holding }: TouchPayload) => {
        if (who !== myRole) {
          setRemoteHolding(holding);
          if (holding) {
            haptics.light();
            playChime("touch");
            showBrowserNotification({
              title: myRole === "captain" ? "🌸 She is touching the Sync Orb!" : "❤️ Captain is touching the Sync Orb!",
              body: "Place your finger on the orb in Sanctuary to sync heartbeats.",
              tag: "sync-touch",
            });

            if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
            touchTimeoutRef.current = setTimeout(() => {
              setRemoteHolding(false);
            }, 6000);
          }
        }
      },
      onSos: () => {
        // High priority alarm
        buzz([120, 60, 120, 60, 250]);
        playChime("alert");
        setSosActive(true);
        showBrowserNotification({
          title: "🚨 EMERGENCY SOS FROM HER!",
          body: "She needs your immediate presence and comfort right now.",
          tag: "sos",
          requireInteraction: true,
        });
      },
      onDrop: ({ emoji }: DropPayload) => {
        playChime("drop");
        haptics.light();
        showBrowserNotification({
          title: `${emoji} Gentle Study Drop`,
          body: myRole === "her"
            ? `Captain sent you a gentle ${emoji} drop!`
            : `Drop received: ${emoji}`,
          tag: "drop",
        });
      },
      onWhisper: ({ text }: WhisperPayload) => {
        playChime("whisper");
        haptics.medium();
        showBrowserNotification({
          title: "✨ Study Whisper from Captain",
          body: `"${text}"`,
          tag: "whisper",
        });
      },
      onChat: (payload: ChatPayload) => {
        const isFromPartner =
          myRole === "captain"
            ? payload.sender === "a0ba3cb9-5397-498b-8740-5b9842381d15" || payload.sender === "her"
            : payload.sender === "b8eb2e9f-ad30-49a3-8cff-1e90445f04e8" || payload.sender === "captain";

        if (isFromPartner) {
          haptics.medium();
          playChime("chat");
          const preview =
            payload.kind === "polaroid"
              ? "📸 Sent you a new Polaroid selfie!"
              : payload.kind === "voice"
              ? "🎙️ Sent you a new voice note!"
              : payload.text || payload.body || "Sent a message";

          setChatNotice({
            id: payload.id,
            senderRole: myRole === "captain" ? "her" : "captain",
            preview,
          });

          showBrowserNotification({
            title: `💌 Sanctuary Note from ${myRole === "captain" ? "Her 🌸" : "Captain ⚓"}`,
            body: preview,
            tag: "chat",
          });

          if (chatNoticeTimeoutRef.current) clearTimeout(chatNoticeTimeoutRef.current);
          chatNoticeTimeoutRef.current = setTimeout(() => {
            setChatNotice(null);
          }, 6000);
        }
      },
    });

    return () => {
      unregister();
      if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
      if (chatNoticeTimeoutRef.current) clearTimeout(chatNoticeTimeoutRef.current);
    };
  }, [room, myRole]);

  const handleOpenSanctuary = () => {
    setRemoteHolding(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("komorebi:switch-tab", { detail: "sanctuary" })
      );
    }
  };

  const handleScrollToOrb = () => {
    setRemoteHolding(false);
    if (typeof window !== "undefined") {
      const orbEl = document.querySelector(".select-none.touch-none");
      if (orbEl) {
        orbEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleOpenChat = () => {
    setChatNotice(null);
    setSosActive(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("komorebi:open-chat"));
    }
  };

  const captainWa = process.env.NEXT_PUBLIC_CAPTAIN_WA || "";

  return (
    <div className="fixed top-3 inset-x-3 pointer-events-none z-50 flex flex-col items-center gap-2">
      {/* ── 0. BROWSER NOTIFICATION PERMISSION PROMPT BANNER ─────── */}
      <AnimatePresence>
        {showPermissionBanner && !hasPermission && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-sm pointer-events-auto p-3.5 rounded-2xl bg-paper/95 dark:bg-obsidian/95 backdrop-blur-md border border-sage/40 shadow-aura flex items-center justify-between gap-3"
            role="dialog"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-sage/20 text-sage flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-serif text-xs font-bold text-ink dark:text-cream leading-tight">
                  Enable Sanctuary Alerts
                </p>
                <p className="text-[10px] font-sans text-ink/60 dark:text-cream/60 truncate mt-0.5">
                  Get notified for heartbeat touch & drops.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleRequestPermission}
                className="py-1.5 px-3 rounded-xl bg-sage text-cream font-medium text-xs active:scale-95 transition-all shadow-sm"
              >
                Allow 🔔
              </button>
              <button
                type="button"
                onClick={() => setShowPermissionBanner(false)}
                className="p-1 rounded-lg text-ink/40 dark:text-cream/40 hover:text-ink"
                aria-label="Dismiss permission prompt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. EMERGENCY SOS BANNER ───────────────────────────────── */}
      <AnimatePresence>
        {sosActive && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-sm pointer-events-auto p-4 rounded-2xl bg-sakura text-mocha border-2 border-sakura/90 shadow-2xl space-y-2.5"
            role="alert"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-mocha text-cream animate-pulse">
                  <ShieldAlert className="w-5 h-5 text-sakura" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm leading-tight text-mocha">
                    🚨 Emergency SOS Alert!
                  </h4>
                  <p className="text-[11px] font-sans font-medium text-mocha/80 mt-0.5">
                    {myRole === "captain"
                      ? "She tapped emergency SOS and needs your comfort right now."
                      : "Emergency alert dispatched to Captain. He is on his way."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSosActive(false)}
                className="p-1 rounded-lg text-mocha/60 hover:text-mocha"
                aria-label="Dismiss SOS alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenChat}
                className="flex-1 py-2 px-3 rounded-xl bg-mocha text-cream text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Open Sanctuary Chat</span>
              </button>

              {captainWa && myRole === "her" && (
                <a
                  href={`https://wa.me/${captainWa}?text=Hey%20Captain%2C%20I%20need%20you%20right%20now`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-paper text-mocha border border-mocha/20 text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call Captain</span>
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. MUTUAL TOUCH NOTIFICATION TOAST ─────────────────────── */}
      <AnimatePresence>
        {remoteHolding && !sosActive && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-sm pointer-events-auto p-3.5 rounded-2xl bg-paper/95 dark:bg-obsidian/95 backdrop-blur-md border-2 border-sakura shadow-aura flex items-center justify-between gap-3"
            role="status"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-sakura/30 text-mocha flex items-center justify-center flex-shrink-0 animate-pulse">
                <Heart className="w-5 h-5 text-sakura fill-sakura" />
              </div>
              <div className="min-w-0">
                <p className="font-serif text-xs font-bold text-ink dark:text-cream truncate leading-tight">
                  {myRole === "captain"
                    ? "She is holding the Sync Touch orb! 🌸"
                    : "Captain is holding the Sync Touch orb! ⚓"}
                </p>
                <p className="text-[10px] font-sans text-ink/65 dark:text-cream/65 truncate mt-0.5">
                  Place your finger to sync your heartbeats together.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={myRole === "captain" ? handleScrollToOrb : handleOpenSanctuary}
              className="py-1.5 px-3 rounded-xl bg-sakura text-mocha font-bold text-xs flex-shrink-0 active:scale-95 transition-all shadow-sm"
            >
              {myRole === "captain" ? "Touch Now ❤️" : "Go to Touch ❤️"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3. INCOMING SANCTUARY CHAT PILL ────────────────────────── */}
      <AnimatePresence>
        {chatNotice && !sosActive && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={handleOpenChat}
            className="w-full max-w-sm pointer-events-auto p-3 rounded-2xl bg-paper dark:bg-obsidian border border-sage/40 shadow-aura flex items-center justify-between gap-2.5 cursor-pointer hover:border-sage transition-all"
            role="alert"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-sage/20 text-sage flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-sans font-semibold text-sage dark:text-matcha uppercase tracking-wider block">
                  Sanctuary Note from {chatNotice.senderRole === "captain" ? "Captain ⚓" : "Her 🌸"}
                </span>
                <p className="font-serif text-xs text-ink dark:text-cream truncate">
                  {chatNotice.preview}
                </p>
              </div>
            </div>

            <span className="text-[10px] font-sans font-medium text-sage dark:text-matcha flex-shrink-0">
              Tap to view
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
