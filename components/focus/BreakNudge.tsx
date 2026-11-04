"use client";

import React, { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Check,
  X,
  RotateCcw,
  Play,
  Pause,
  Heart,
  Sparkles,
  Smile,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { sound } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import { useNow } from "@/lib/hooks";

export interface BreakNudgeProps {
  onDismiss?: () => void;
  autoShowOnBreak?: boolean;
  className?: string;
}

const CUTE_NICKNAMES = [
  "Time to stretch yourself, sugar pie! 🌸",
  "Rest those pretty eyes, baby girl ✨",
  "Look 20 feet away for 20 seconds, sweetheart 🌿",
  "Roll your shoulders for me, my superstar 💆‍♀️",
  "Breathe deep and relax your jaw, angel 🍯",
  "You're studying so hard, darling... quick 20s stretch! 🌷",
];

const STRETCHES = [
  {
    step: 1,
    title: "Look 20 Feet Away 👁️",
    desc: "Find something across the room or out a window. Relax your eye muscles.",
    tag: "Eyes",
  },
  {
    step: 2,
    title: "Shoulder Rolls ×5 💆‍♀️",
    desc: "Roll shoulders backward 5 times to release neck & spine tension.",
    tag: "Posture",
  },
  {
    step: 3,
    title: "Deep Inhale & Sip Water 💧",
    desc: "Take one slow deep breath into your belly and take a warm sip.",
    tag: "Calm",
  },
];

/**
 * Global Cute Break Modal triggered during study intervals.
 * Runs an automatic 20-second countdown without breaking focus.
 */
export function CuteBreakModal({
  isOpen,
  onClose,
  messageIndex = 0,
}: {
  isOpen: boolean;
  onClose: () => void;
  messageIndex?: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [isDone, setIsDone] = useState(false);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Reconcile state on open during render per React 19 conventions
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSecondsLeft(20);
      setIsDone(false);
    }
  }

  // Chime and haptic feedback on opening
  useEffect(() => {
    if (isOpen) {
      sound.chime();
      haptics.light();
    }
  }, [isOpen]);

  // Automatic 20-second countdown ticker
  useEffect(() => {
    if (!isOpen || isDone) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsDone(true);
          sound.chime();
          haptics.success();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isDone]);

  // Auto-dismiss 1.5 seconds after completion
  useEffect(() => {
    if (!isDone) return;
    const timeout = setTimeout(() => {
      onClose();
    }, 1800);
    return () => clearTimeout(timeout);
  }, [isDone, onClose]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const origOverflow = document.body.style.overflow;
    const origTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.touchAction = origTouch;
    };
  }, [isOpen]);

  const cuteMessage = CUTE_NICKNAMES[messageIndex % CUTE_NICKNAMES.length];

  // Radial progress geometry
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const progressRatio = (20 - secondsLeft) / 20;
  const strokeOffset = circ * (1 - progressRatio);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-mocha/60 dark:bg-black/75 backdrop-blur-sm select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-sm rounded-3xl bg-cream dark:bg-obsidian border border-sage/40 dark:border-matcha/30 p-5 shadow-2xl space-y-4"
          >
            {/* Header: Cute Rotating Nickname Message */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-sage dark:text-matcha">
                <Heart className="w-5 h-5 text-sakura fill-sakura/50 animate-pulse" />
                <span className="text-xs uppercase tracking-wider font-semibold">
                  20-20-20 Care Break
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Skip break reminder"
                className="p-1.5 -mr-1 -mt-1 rounded-full text-ink/40 dark:text-cream/40 hover:text-ink hover:bg-sage/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center pt-1">
              <h3 className="font-serif text-lg font-bold text-ink dark:text-cream leading-snug">
                {cuteMessage}
              </h3>
              <p className="text-xs text-ink/65 dark:text-cream/65 mt-1 font-sans">
                {isDone
                  ? "All refreshed, darling! Resuming your focus... ✨"
                  : "Look 20 feet away for 20 seconds. Let your eyes soften."}
              </p>
            </div>

            {/* Central Animated Countdown Ring */}
            <div className="flex justify-center my-2">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg
                  viewBox="0 0 90 90"
                  className="w-28 h-28 transform -rotate-90"
                >
                  <circle
                    cx="45"
                    cy="45"
                    r={radius}
                    fill="none"
                    strokeWidth="6"
                    className="stroke-sage/20 dark:stroke-obsidian/60"
                  />
                  <circle
                    cx="45"
                    cy="45"
                    r={radius}
                    fill="none"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={strokeOffset}
                    className="stroke-sage dark:stroke-matcha transition-[stroke-dashoffset] duration-700 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {isDone ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-10 h-10 rounded-full bg-sage flex items-center justify-center text-cream"
                    >
                      <Check className="w-6 h-6 stroke-[3]" />
                    </motion.div>
                  ) : (
                    <>
                      <span className="font-sans text-3xl font-bold tabular-nums text-ink dark:text-cream tracking-tight">
                        {secondsLeft}s
                      </span>
                      <span className="text-[10px] text-sage font-medium tracking-wide">
                        RESTING
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 3 Care Steps */}
            <div className="space-y-2 pt-1">
              {STRETCHES.map((s) => (
                <div
                  key={s.step}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-paper dark:bg-mocha/50 border border-[#EBE7DF] dark:border-[#383530] text-left"
                >
                  <span className="w-5 h-5 rounded-md bg-sage/15 dark:bg-sage/25 text-sage dark:text-matcha text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    {s.step}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink dark:text-cream leading-tight">
                      {s.title}
                    </p>
                    <p className="text-[11px] text-ink/60 dark:text-cream/60 leading-tight">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[44px] rounded-xl border border-sage/30 dark:border-matcha/30 text-xs font-medium text-ink/70 dark:text-cream/70 hover:bg-sage/10 active:scale-95 transition-all"
              >
                Skip For Now
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[44px] rounded-xl bg-sage text-cream text-xs font-medium hover:bg-sage/90 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isDone ? "Done" : "I'm Stretched"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Inline 20-20-20 Desk Card for the Focus tab.
 */
export default function BreakNudge({
  onDismiss,
  autoShowOnBreak = true,
  className = "",
}: BreakNudgeProps) {
  const phase = useApp((s) => s.pomo.phase);
  const [countdown, setCountdown] = useState(20);
  const [isCounting, setIsCounting] = useState(false);
  const [completedStretches, setCompletedStretches] = useState<number[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);

  const [prevPhase, setPrevPhase] = useState(phase);
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    if (phase === "break") {
      setIsDismissed(false);
      setCountdown(20);
      setIsCounting(true);
    }
  }

  // 20-second eye-rest ticker
  useEffect(() => {
    if (!isCounting || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsCounting(false);
          sound.chime();
          haptics.success();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCounting, countdown]);

  const toggleStretch = (step: number) => {
    haptics.light();
    setCompletedStretches((prev) =>
      prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step]
    );
  };

  const handleDismiss = () => {
    haptics.light();
    setIsDismissed(true);
    onDismiss?.();
  };

  const restartCountdown = () => {
    haptics.light();
    setCountdown(20);
    setIsCounting(true);
  };

  if (autoShowOnBreak && phase !== "break" && isDismissed) {
    return null;
  }
  if (isDismissed) {
    return null;
  }

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = (20 - countdown) / 20;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div
      className={`rounded-2xl bg-paper dark:bg-obsidian border border-sage/40 dark:border-matcha/30 p-5 shadow-sm transition-colors ${className}`}
    >
      {/* Header with Title & Dismiss Button */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sage/15 dark:bg-sage/25 text-[#2D5A43] dark:text-matcha flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-semibold text-ink dark:text-cream leading-tight">
              20-20-20 Eye & Body Rest
            </h3>
            <p className="text-xs text-ink/65 dark:text-cream/65">
              Look 20 feet away for 20 seconds
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss Break Nudge"
          className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-ink/60 dark:text-cream/60 hover:text-ink dark:hover:text-cream hover:bg-sage/10 active:scale-95 transition-all flex items-center justify-center focus:ring-2 focus:ring-sage focus:outline-none"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 20-Second Countdown Card */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-cream/70 dark:bg-mocha/70 border border-[#EBE7DF] dark:border-[#383530] mb-4">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg viewBox="0 0 70 70" className="w-16 h-16 transform -rotate-90">
              <circle
                cx="35"
                cy="35"
                r={radius}
                fill="none"
                strokeWidth="5"
                className="stroke-sage/20 dark:stroke-obsidian"
              />
              <circle
                cx="35"
                cy="35"
                r={radius}
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="stroke-sage dark:stroke-matcha transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            <span className="absolute font-sans text-lg font-bold tabular-nums text-ink dark:text-cream">
              {countdown}s
            </span>
          </div>

          <div>
            <span className="text-xs font-semibold text-ink dark:text-cream block">
              {countdown === 0 ? "Well done! Eyes rested." : "Focus on the distant horizon"}
            </span>
            <span className="text-[11px] text-ink/60 dark:text-cream/60">
              {countdown === 0
                ? "Gentle reset for your eye muscles."
                : "Look out the window or at a far wall"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {countdown > 0 ? (
            <button
              type="button"
              onClick={() => {
                haptics.light();
                setIsCounting(!isCounting);
              }}
              aria-label={isCounting ? "Pause Countdown" : "Resume Countdown"}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-ink dark:text-cream hover:bg-sage/15 active:scale-95 flex items-center justify-center transition-all focus:ring-2 focus:ring-sage focus:outline-none"
            >
              {isCounting ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={restartCountdown}
              aria-label="Restart 20s Countdown"
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-sage dark:text-matcha hover:bg-sage/15 active:scale-95 flex items-center justify-center transition-all focus:ring-2 focus:ring-sage focus:outline-none"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stretches list */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink/60 dark:text-cream/60 px-1 block">
          3-Step Care Reset
        </span>

        {STRETCHES.map((s) => {
          const isDone = completedStretches.includes(s.step);
          return (
            <button
              type="button"
              key={s.step}
              onClick={() => toggleStretch(s.step)}
              className={`w-full min-h-[44px] p-3 rounded-xl border text-left flex items-start gap-3 transition-all active:scale-[0.99] focus:ring-2 focus:ring-sage focus:outline-none ${
                isDone
                  ? "bg-sage/10 dark:bg-sage/20 border-sage/40 dark:border-matcha/40 opacity-75"
                  : "bg-paper dark:bg-obsidian border-[#EBE7DF] dark:border-[#383530] hover:border-sage/40"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg mt-0.5 flex items-center justify-center text-xs font-semibold transition-colors ${
                  isDone
                    ? "bg-sage text-cream"
                    : "border border-sage/40 text-sage dark:text-matcha bg-cream dark:bg-mocha"
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-xs font-semibold ${
                      isDone
                        ? "line-through text-ink/50 dark:text-cream/50"
                        : "text-ink dark:text-cream"
                    }`}
                  >
                    {s.title}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sage/10 dark:bg-sage/20 text-[#2D5A43] dark:text-matcha font-medium">
                    {s.tag}
                  </span>
                </div>
                <p
                  className={`text-[11px] mt-0.5 ${
                    isDone
                      ? "text-ink/40 dark:text-cream/40"
                      : "text-ink/70 dark:text-cream/70"
                  }`}
                >
                  {s.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
