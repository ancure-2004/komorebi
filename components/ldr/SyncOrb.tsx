"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useRoom } from "@/lib/room";
import { buzz } from "@/lib/haptics";
import { Heart } from "lucide-react";

export interface SyncOrbProps {
  me?: "her" | "captain";
  className?: string;
}

export default function SyncOrb({ me = "her", className = "" }: SyncOrbProps) {
  const room = useRoom();
  const [mine, setMine] = useState(false);
  const [theirs, setTheirs] = useState(false);
  const lastSeenRef = useRef<number>(0);

  // Listen to remote touch events
  useEffect(() => {
    const unregister = room.registerHandlers({
      onTouch: ({ who, holding }) => {
        if (who !== me) {
          setTheirs(holding);
          lastSeenRef.current = Date.now();
        }
      },
    });

    return () => unregister();
  }, [room, me]);

  // Keep-alive heartbeat & stale guard
  useEffect(() => {
    const interval = setInterval(() => {
      if (mine) {
        room.send("touch", { who: me, holding: true });
      }
      if (theirs && Date.now() - lastSeenRef.current > 3000) {
        setTheirs(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mine, theirs, room, me]);

  const both = mine && theirs;

  // Heartbeat haptic synchronization when both touch together
  useEffect(() => {
    if (!both) return;

    buzz([40, 60, 40]);
    const timer = setInterval(() => {
      buzz([40, 60, 40]);
    }, 1000);

    return () => {
      clearInterval(timer);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(0);
      }
    };
  }, [both]);

  const handleHold = useCallback(
    (holding: boolean) => {
      setMine(holding);
      room.send("touch", { who: me, holding });
    },
    [room, me]
  );

  // Release hold if user navigates or switches tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        handleHold(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [handleHold]);

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Ambient Halo behind orb */}
        <motion.div
          animate={{
            scale: both ? [1, 1.35, 1] : mine ? 1.15 : 1,
            opacity: both ? [0.6, 0.9, 0.6] : mine ? 0.5 : 0.25,
          }}
          transition={{
            duration: both ? 1 : 2,
            repeat: both ? Infinity : 0,
            ease: "easeInOut",
          }}
          className={`absolute size-48 sm:size-56 rounded-full blur-2xl pointer-events-none transition-colors duration-500 ${
            both
              ? "bg-sakura/60"
              : mine
              ? "bg-sage/40"
              : "bg-matcha/20"
          }`}
        />

        {/* Interactive Touch Target Orb */}
        <motion.div
          onPointerDown={() => handleHold(true)}
          onPointerUp={() => handleHold(false)}
          onPointerCancel={() => handleHold(false)}
          onContextMenu={(e) => e.preventDefault()}
          animate={{
            scale: both ? [1, 1.1, 1] : mine ? 1.05 : 1,
          }}
          transition={{
            duration: both ? 0.9 : 0.2,
            repeat: both ? Infinity : 0,
            ease: "easeInOut",
          }}
          className={`size-36 sm:size-40 rounded-full select-none touch-none cursor-pointer flex flex-col items-center justify-center transition-all duration-300 shadow-2xl border-2 ${
            both
              ? "bg-gradient-to-tr from-sakura to-[#F9D5DA] border-cream shadow-[0_0_50px_rgba(244,194,200,0.8)]"
              : mine
              ? "bg-gradient-to-tr from-sage to-matcha border-cream dark:border-mocha shadow-aura"
              : "bg-gradient-to-tr from-paper via-cream to-paper dark:from-obsidian dark:via-mocha dark:to-obsidian border-sage/40"
          }`}
        >
          <Heart
            className={`w-8 h-8 transition-colors duration-300 ${
              both
                ? "text-mocha fill-mocha animate-pulse"
                : mine
                ? "text-cream fill-cream/50"
                : "text-sage/60 dark:text-matcha/60"
            }`}
          />
          <span
            className={`text-[10px] font-sans font-medium uppercase tracking-wider mt-1 select-none ${
              both
                ? "text-mocha font-bold"
                : mine
                ? "text-cream"
                : "text-ink/60 dark:text-cream/60"
            }`}
          >
            {both ? "Heartbeat" : mine ? "Holding" : "Touch"}
          </span>
        </motion.div>
      </div>

      {/* Explanatory Caption */}
      <div className="text-center">
        <p className="font-serif text-sm font-medium text-ink dark:text-cream">
          {both
            ? "Holding together across the miles 🌿"
            : mine
            ? "Waiting for Captain's touch..."
            : "Place your finger and hold to feel each other"}
        </p>
        <p className="text-[11px] font-sans text-ink/50 dark:text-cream/50 mt-0.5">
          {both ? "Haptic heartbeat pulsing synchronously" : "Realtime emotional touch bridge"}
        </p>
      </div>
    </div>
  );
}
