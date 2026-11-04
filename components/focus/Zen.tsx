"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minimize2, Play, Pause, Sparkles } from "lucide-react";
import { useWakeLock, useNow } from "@/lib/hooks";
import { useApp } from "@/lib/store";
import { fmtMMSS } from "@/lib/time";
import { haptics } from "@/lib/haptics";

export interface ZenProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export default function Zen({ isOpen, onClose, className = "" }: ZenProps) {
  const now = useNow(500);
  const pomo = useApp((s) => s.pomo);
  const pausePomo = useApp((s) => s.pausePomo);
  const resumePomo = useApp((s) => s.resumePomo);
  const updateSettings = useApp((s) => s.updateSettings);

  const [breathText, setBreathText] = useState<"breathe in..." | "breathe out...">("breathe in...");

  // Keep phone screen awake during Zen mode
  useWakeLock(isOpen);

  const handleClose = useCallback(() => {
    haptics.light();
    updateSettings((s) => ({ ...s, zenMode: false }));
    onClose();
  }, [onClose, updateSettings]);

  // Gentle 8s breath cycle (4s in, 4s out)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setBreathText((prev) => (prev === "breathe in..." ? "breathe out..." : "breathe in..."));
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Request fullscreen when opening
  useEffect(() => {
    if (isOpen) {
      if (typeof document !== "undefined" && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isOpen]);

  const phase = pomo.phase;
  const isRunning = phase !== "idle" && pomo.pausedLeftMs === null;

  let leftMs = pomo.preset.focus * 60000;
  if (phase === "idle") {
    leftMs = pomo.preset.focus * 60000;
  } else if (pomo.pausedLeftMs !== null) {
    leftMs = Math.max(0, pomo.pausedLeftMs);
  } else if (pomo.endAt !== null) {
    leftMs = Math.max(0, pomo.endAt - now);
  }

  const togglePlayback = () => {
    if (isRunning) {
      haptics.light();
      pausePomo();
    } else {
      haptics.medium();
      resumePomo();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`fixed inset-0 z-50 flex flex-col justify-between items-center p-6 sm:p-10 select-none bg-gradient-to-b from-cream via-[#F9F6F0] to-paper dark:from-mocha dark:via-[#1A1916] dark:to-obsidian ${className}`}
        >
          {/* Top Bar: Kanji Brand & Exit Button */}
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg tracking-widest text-sage font-medium">
                木漏れ日
              </span>
              <span className="text-xs tracking-wider text-ink/50 dark:text-cream/50 uppercase">
                Zen Focus
              </span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Exit Zen Mode"
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-sage/10 dark:bg-sage/20 text-ink dark:text-cream font-medium text-xs flex items-center gap-1.5 active:scale-95 transition-all focus:ring-2 focus:ring-sage focus:outline-none"
            >
              <Minimize2 className="w-4 h-4 text-sage" />
              <span>Exit</span>
            </button>
          </div>

          {/* Center Stage: Breathing Sphere & Countdown */}
          <div className="relative flex flex-col items-center justify-center my-auto">
            {/* Breathing Ambient Halo */}
            <motion.div
              animate={{
                scale: [1, 1.28, 1],
                opacity: [0.35, 0.7, 0.35],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute size-64 sm:size-80 rounded-full bg-gradient-to-tr from-sage/30 via-matcha/40 to-sakura/25 dark:from-sage/20 dark:via-matcha/30 dark:to-sakura/15 blur-2xl pointer-events-none"
            />

            {/* Inner Calm Circle */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative size-44 sm:size-52 rounded-full border border-sage/40 dark:border-matcha/40 bg-cream/50 dark:bg-obsidian/50 backdrop-blur-sm flex flex-col items-center justify-center shadow-aura pointer-events-none"
            >
              <span className="font-sans text-5xl sm:text-6xl font-bold tabular-nums tracking-tight text-ink dark:text-cream">
                {fmtMMSS(leftMs)}
              </span>

              <span className="text-xs font-serif text-sage dark:text-matcha mt-1 italic tracking-wider">
                {breathText}
              </span>
            </motion.div>

            {/* Phase Tag */}
            <div className="mt-8 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide bg-paper dark:bg-obsidian border border-sage/25 text-ink dark:text-cream shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-sage" />
                {phase === "break" ? "Recovery Break" : "Deep Immersion"}
              </span>

              {phase !== "idle" && (
                <button
                  type="button"
                  onClick={togglePlayback}
                  aria-label={isRunning ? "Pause Focus" : "Resume Focus"}
                  className="min-h-[44px] min-w-[44px] px-3 rounded-full bg-paper dark:bg-obsidian border border-sage/25 text-ink dark:text-cream text-xs flex items-center justify-center gap-1 hover:bg-sage/10 active:scale-95 transition-all focus:ring-2 focus:ring-sage focus:outline-none"
                >
                  {isRunning ? (
                    <Pause className="w-3.5 h-3.5 text-sage fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 text-sage fill-current" />
                  )}
                  <span>{isRunning ? "Pause" : "Resume"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Quote / Affirmation */}
          <div className="w-full text-center pb-2">
            <p className="font-serif text-sm italic text-ink/60 dark:text-cream/60 max-w-xs mx-auto">
              &ldquo;Sunlight filtering gently through the trees. One quiet breath at a time.&rdquo;
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
