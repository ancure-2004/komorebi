"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minimize2, Play, Pause, Sparkles, Sun } from "lucide-react";
import { useWakeLock, useNow } from "@/lib/hooks";
import { useApp, EMPTY_DAY } from "@/lib/store";
import { fmtHM, fmtMMSS, todayKey } from "@/lib/time";
import { haptics } from "@/lib/haptics";

export interface ZenProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export default function Zen({ isOpen, onClose, className = "" }: ZenProps) {
  const now = useNow(500);
  const currentDate = todayKey(now);
  const pomo = useApp((s) => s.pomo);
  const rawDay = useApp((s) => s.days[currentDate]);
  const day = rawDay ?? EMPTY_DAY;
  const pausePomo = useApp((s) => s.pausePomo);
  const resumePomo = useApp((s) => s.resumePomo);
  const flexToggle = useApp((s) => s.flexToggle);
  const updateSettings = useApp((s) => s.updateSettings);

  const [breathText, setBreathText] = useState<"breathe in..." | "breathe out...">("breathe in...");

  // Keep phone screen awake during Zen mode
  useWakeLock(isOpen);

  // Prevent background scroll when Zen mode is active
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

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

  // Mode detection: Pomodoro vs. Morning Flex Stopwatch
  const isPomoActive = pomo.phase !== "idle";
  const isPomoRunning = isPomoActive && pomo.pausedLeftMs === null;
  const isFlexRunning = Boolean(day.flexRunningSince);

  let displayTime = "00:00";
  let modeTitle = "Quiet Sanctuary";
  let modeSubtitle = "One peaceful breath at a time";

  if (isPomoActive) {
    let leftMs = pomo.preset.focus * 60000;
    if (pomo.pausedLeftMs !== null) {
      leftMs = Math.max(0, pomo.pausedLeftMs);
    } else if (pomo.endAt !== null) {
      leftMs = Math.max(0, pomo.endAt - now);
    }
    displayTime = fmtMMSS(leftMs);
    modeTitle = pomo.phase === "break" ? "Recovery Break" : "Deep Immersion";
    modeSubtitle = pomo.phase === "break" ? "Rest your eyes, hydrate" : "Focused flow state";
  } else if (isFlexRunning || day.flexLoggedMs > 0) {
    const currentSessionMs = day.flexRunningSince ? Math.max(0, now - day.flexRunningSince) : 0;
    const totalBankedMs = day.flexLoggedMs + currentSessionMs;
    const goalMs = day.flexGoalMin * 60000;
    displayTime = fmtMMSS(currentSessionMs > 0 ? currentSessionMs : totalBankedMs);
    modeTitle = isFlexRunning ? "Morning Flex Bank (Active)" : "Morning Flex Bank (Paused)";
    modeSubtitle = `${fmtHM(totalBankedMs)} of ${fmtHM(goalMs)} target`;
  }

  const togglePlayback = () => {
    if (isPomoActive) {
      if (isPomoRunning) {
        haptics.light();
        pausePomo();
      } else {
        haptics.medium();
        resumePomo();
      }
    } else {
      haptics.medium();
      flexToggle(currentDate);
    }
  };

  const isCurrentActive = isPomoActive ? isPomoRunning : isFlexRunning;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={`fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-[100dvh] z-[100] flex flex-col justify-between items-center px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] select-none touch-none overscroll-none bg-gradient-to-b from-cream via-[#F9F6F0] to-paper dark:from-mocha dark:via-[#1A1916] dark:to-obsidian ${className}`}
        >
          {/* Top Bar: Kanji Brand & Exit Button */}
          <div className="w-full max-w-md flex items-center justify-between">
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
              className="relative size-48 sm:size-56 rounded-full border border-sage/40 dark:border-matcha/40 bg-cream/50 dark:bg-obsidian/50 backdrop-blur-sm flex flex-col items-center justify-center shadow-aura pointer-events-none"
            >
              <span className="font-sans text-5xl sm:text-6xl font-bold tabular-nums tracking-tight text-ink dark:text-cream">
                {displayTime}
              </span>

              <span className="text-xs font-serif text-sage dark:text-matcha mt-1 italic tracking-wider">
                {breathText}
              </span>
            </motion.div>

            {/* Mode & Phase Tag */}
            <div className="mt-7 flex flex-col items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide bg-paper dark:bg-obsidian border border-sage/25 text-ink dark:text-cream shadow-sm">
                {isFlexRunning ? (
                  <Sun className="w-3.5 h-3.5 text-sage" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-sage" />
                )}
                {modeTitle}
              </span>
              <span className="text-[11px] text-ink/50 dark:text-cream/50 font-sans">
                {modeSubtitle}
              </span>

              {/* Pause / Resume Control */}
              {(isPomoActive || isFlexRunning || day.flexLoggedMs > 0) && (
                <button
                  type="button"
                  onClick={togglePlayback}
                  aria-label={isCurrentActive ? "Pause Timer" : "Resume Timer"}
                  className="mt-2 min-h-[44px] px-5 rounded-full bg-sage text-cream text-xs font-medium flex items-center justify-center gap-2 hover:bg-sage/90 active:scale-95 transition-all shadow-sm focus:ring-2 focus:ring-sage focus:outline-none"
                >
                  {isCurrentActive ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Resume</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Bottom Quote / Affirmation */}
          <div className="w-full max-w-xs text-center pb-2">
            <p className="font-serif text-xs sm:text-sm italic text-ink/60 dark:text-cream/60 mx-auto">
              &ldquo;Sunlight filtering gently through the trees. One quiet breath at a time.&rdquo;
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
