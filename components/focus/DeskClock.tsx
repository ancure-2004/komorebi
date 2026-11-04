"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Pause, Sparkles, Clock, Calendar } from "lucide-react";
import { useMedia, useWakeLock, useNow } from "@/lib/hooks";
import { useApp, EMPTY_DAY } from "@/lib/store";
import { dayBlocks } from "@/lib/stats";
import { locate } from "@/lib/schedule";
import { minutesIST, todayKey, fmtMMSS, fmtClock } from "@/lib/time";
import { haptics } from "@/lib/haptics";

export interface DeskClockProps {
  forceOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

function FlipDigit({ value }: { value: string }) {
  return (
    <div className="relative w-11 sm:w-16 md:w-20 h-16 sm:h-20 md:h-24 bg-[#23211D] border border-[#3A3833] rounded-xl flex items-center justify-center overflow-hidden shadow-md">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="font-sans text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums text-cream select-none"
        >
          {value}
        </motion.span>
      </AnimatePresence>
      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/60 pointer-events-none" />
    </div>
  );
}

export default function DeskClock({ forceOpen = false, onClose, className = "" }: DeskClockProps) {
  const isLandscape = useMedia("(orientation: landscape) and (max-height: 520px)");
  const deskClockSetting = useApp((s) => s.settings.deskClock);
  const [dismissed, setDismissed] = useState(false);

  const show = forceOpen || (isLandscape && deskClockSetting && !dismissed);

  // Keep phone display active in desk stand mode
  useWakeLock(show);

  const now = useNow(500);
  const pomo = useApp((s) => s.pomo);
  const pausePomo = useApp((s) => s.pausePomo);
  const resumePomo = useApp((s) => s.resumePomo);
  const template = useApp((s) => s.template);
  const today = todayKey(now);
  const rawDay = useApp((s) => s.days[today]);
  const day = rawDay ?? EMPTY_DAY;

  const blocks = dayBlocks(day, template);
  const nowMin = minutesIST(now, true);
  const { current, next } = locate(blocks, nowMin);

  // IST formatted hours & minutes
  const timeIST = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(now));
  const [hh, mm] = timeIST.split(":");

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

  const handleDismiss = () => {
    haptics.light();
    setDismissed(true);
    onClose?.();
  };

  const handleTogglePlayback = () => {
    if (isRunning) {
      haptics.light();
      pausePomo();
    } else {
      haptics.medium();
      resumePomo();
    }
  };

  if (!show) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-[100dvh] z-[70] bg-[#161513] text-[#FDFBF7] flex flex-col justify-between pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] px-4 sm:px-6 overflow-hidden select-none ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg tracking-widest text-matcha font-medium">
            木漏れ日
          </span>
          <span className="text-xs uppercase tracking-wider text-cream/40">
            Desk Stand
          </span>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Exit Desk Clock"
          className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-cream/80 transition-all flex items-center justify-center focus:ring-2 focus:ring-matcha focus:outline-none"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Center Area: Flip Clock + Pomodoro Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center my-auto w-full max-w-4xl mx-auto">
        {/* Flip Clock Display */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <FlipDigit value={hh[0] || "0"} />
            <FlipDigit value={hh[1] || "0"} />

            <div className="flex flex-col gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-matcha animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-matcha animate-pulse" />
            </div>

            <FlipDigit value={mm[0] || "0"} />
            <FlipDigit value={mm[1] || "0"} />
          </div>

          <div className="flex items-center gap-2 mt-3 text-xs text-cream/50 tracking-wider">
            <Clock className="w-3.5 h-3.5 text-matcha" />
            <span>IST (Kolkata)</span>
          </div>
        </div>

        {/* Focus & Schedule Card */}
        <div className="rounded-2xl bg-[#23211D] border border-[#3A3833] p-4 flex flex-col justify-between gap-3 shadow-md">
          {/* Active Pomodoro status */}
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-matcha" />
              <span className="text-xs font-medium text-cream/80">
                {phase === "focus"
                  ? "Focus Session"
                  : phase === "break"
                  ? "Rest Break"
                  : "Timer Standby"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-sans text-2xl font-bold tabular-nums text-cream">
                {fmtMMSS(leftMs)}
              </span>

              {phase !== "idle" && (
                <button
                  type="button"
                  onClick={handleTogglePlayback}
                  aria-label={isRunning ? "Pause" : "Resume"}
                  className="min-h-[44px] min-w-[44px] p-2 rounded-lg bg-white/10 hover:bg-white/15 active:scale-95 text-matcha flex items-center justify-center focus:ring-2 focus:ring-matcha focus:outline-none"
                >
                  {isRunning ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Schedule Preview: Right Now & Up Next */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-cream/90">
              <span className="text-cream/50 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-matcha" />
                Now:
              </span>
              <span className="font-medium truncate max-w-[200px]">
                {current ? `${current.emoji} ${current.title}` : "Open Time"}
              </span>
            </div>

            <div className="flex items-center justify-between text-cream/70">
              <span className="text-cream/50 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cream/40" />
                Up Next:
              </span>
              <span className="truncate max-w-[200px]">
                {next
                  ? `${next.emoji} ${next.title} (${fmtClock(next.start)})`
                  : "Day complete"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="flex items-center justify-between text-[11px] text-cream/40">
        <span>Horizontal Phone Stand Mode</span>
        <span>Screen stays awake</span>
      </div>
    </div>
  );
}
