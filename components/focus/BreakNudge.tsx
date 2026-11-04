"use client";

import React, { useState, useEffect } from "react";
import { Eye, Check, X, RotateCcw, Play, Pause, ChevronRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { sound } from "@/lib/audio";
import { haptics } from "@/lib/haptics";

export interface BreakNudgeProps {
  onDismiss?: () => void;
  autoShowOnBreak?: boolean;
  className?: string;
}

const STRETCHES = [
  {
    step: 1,
    title: "Shoulder Rolls ×5",
    desc: "Roll your shoulders backward 5 times to release trapezius tension.",
    tag: "Posture",
  },
  {
    step: 2,
    title: "Neck Tilt & Hold",
    desc: "Gently tilt your head toward each shoulder; hold for 5 seconds.",
    tag: "Neck",
  },
  {
    step: 3,
    title: "Chest Opener",
    desc: "Interlace fingers behind your back, draw shoulders down, and inhale deeply.",
    tag: "Breathing",
  },
  {
    step: 4,
    title: "Hydrate & Blink",
    desc: "Sip a glass of warm water and blink rapidly 10 times to rehydrate eyes.",
    tag: "Hydration",
  },
];

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

  // If autoShowOnBreak is set and we're not in break phase and not explicitly visible, don't show
  if (autoShowOnBreak && phase !== "break" && isDismissed) {
    return null;
  }
  if (isDismissed) {
    return null;
  }

  // Circular progress ring for 20-second countdown
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
          {/* Radial Countdown Mini Ring */}
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

        {/* Countdown Controls */}
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

      {/* 4-Step Gentle Stretches */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink/60 dark:text-cream/60 px-1 block">
          4-Step Desk Reset
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
