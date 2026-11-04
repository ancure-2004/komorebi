"use client";

import React, { useState } from "react";
import { Play, Pause, Square, Maximize2, RotateCcw, SlidersHorizontal, Sparkles, Check } from "lucide-react";
import { useNow } from "@/lib/hooks";
import { useApp } from "@/lib/store";
import { fmtMMSS } from "@/lib/time";
import { haptics } from "@/lib/haptics";

export interface PomodoroProps {
  onOpenZen?: () => void;
  linkedBlockId?: string;
  className?: string;
}

export default function Pomodoro({ onOpenZen, linkedBlockId, className = "" }: PomodoroProps) {
  const now = useNow(500);
  const pomo = useApp((s) => s.pomo);
  const startFocus = useApp((s) => s.startFocus);
  const pausePomo = useApp((s) => s.pausePomo);
  const resumePomo = useApp((s) => s.resumePomo);
  const stopPomo = useApp((s) => s.stopPomo);
  const setPreset = useApp((s) => s.setPreset);
  const updateSettings = useApp((s) => s.updateSettings);

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customFocus, setCustomFocus] = useState(pomo.preset.focus);
  const [customBreak, setCustomBreak] = useState(pomo.preset.brk);

  const phase = pomo.phase;
  const isRunning = phase !== "idle" && pomo.pausedLeftMs === null;
  const isPaused = phase !== "idle" && pomo.pausedLeftMs !== null;

  const totalPhaseMin = phase === "break" ? pomo.preset.brk : pomo.preset.focus;
  const totalPhaseMs = totalPhaseMin * 60000;

  let leftMs = pomo.preset.focus * 60000;
  if (phase === "idle") {
    leftMs = pomo.preset.focus * 60000;
  } else if (pomo.pausedLeftMs !== null) {
    leftMs = Math.max(0, pomo.pausedLeftMs);
  } else if (pomo.endAt !== null) {
    leftMs = Math.max(0, pomo.endAt - now);
  }

  const elapsedMs = Math.max(0, totalPhaseMs - leftMs);
  const progressRatio = totalPhaseMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalPhaseMs)) : 0;

  // SVG Progress Ring calculations
  const radius = 86;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const isPreset25 = pomo.preset.focus === 25 && pomo.preset.brk === 5;
  const isPreset50 = pomo.preset.focus === 50 && pomo.preset.brk === 10;
  const isCustom = !isPreset25 && !isPreset50;

  const handleStart = () => {
    haptics.medium();
    startFocus(linkedBlockId || pomo.linkedBlockId);
  };

  const handlePause = () => {
    haptics.light();
    pausePomo();
  };

  const handleResume = () => {
    haptics.medium();
    resumePomo();
  };

  const handleStop = () => {
    haptics.heavy();
    stopPomo();
  };

  const handleZenTrigger = () => {
    haptics.light();
    updateSettings((s) => ({ ...s, zenMode: true }));
    onOpenZen?.();
  };

  const handleApplyCustom = () => {
    haptics.light();
    setPreset(Math.max(1, customFocus), Math.max(1, customBreak));
    setShowCustomModal(false);
  };

  return (
    <div
      className={`rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-5 shadow-sm transition-colors ${className}`}
    >
      {/* Top Header: Phase Badge & Zen Trigger */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          {phase === "focus" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sage/15 text-[#2D5A43] dark:bg-sage/25 dark:text-matcha">
              <span className="w-2 h-2 rounded-full bg-sage animate-pulse" />
              Focus Session
            </span>
          )}
          {phase === "break" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sakura/25 text-[#9E3E4C] dark:bg-sakura/20 dark:text-sakura">
              <span className="w-2 h-2 rounded-full bg-sakura animate-pulse" />
              Rest Break
            </span>
          )}
          {phase === "idle" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-sage/10 text-ink/75 dark:bg-obsidian dark:text-cream/70 border border-[#EBE7DF] dark:border-[#383530]">
              <Sparkles className="w-3.5 h-3.5 text-sage" />
              Ready to Focus
            </span>
          )}

          {isPaused && (
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
              Paused
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleZenTrigger}
          aria-label="Open Zen Fullscreen Mode"
          className="min-h-[44px] min-w-[44px] px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium text-ink/80 dark:text-cream/80 hover:bg-sage/15 dark:hover:bg-sage/20 active:scale-95 transition-all focus:ring-2 focus:ring-sage focus:outline-none"
        >
          <Maximize2 className="w-4 h-4 text-sage" />
          <span className="hidden sm:inline">Zen Mode</span>
        </button>
      </div>

      {/* Circular Progress Ring & Large Clock */}
      <div className="relative flex items-center justify-center py-2 my-1">
        <svg
          viewBox="0 0 200 200"
          className="w-52 h-52 sm:w-60 sm:h-60 transform -rotate-90"
          aria-hidden="true"
        >
          {/* Background Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            strokeWidth="10"
            className="stroke-sage/15 dark:stroke-obsidian"
          />
          {/* Animated Progress Arc */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`transition-[stroke-dashoffset] duration-500 ease-linear ${
              phase === "break"
                ? "stroke-sakura"
                : "stroke-sage dark:stroke-matcha"
            }`}
          />
        </svg>

        {/* Center Countdown Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="font-sans text-5xl sm:text-6xl font-bold tabular-nums tracking-tight text-ink dark:text-cream">
            {fmtMMSS(leftMs)}
          </span>
          <span className="text-xs font-medium text-ink/60 dark:text-cream/60 mt-1">
            {phase === "break" ? "Recovery Break" : "Deep Focus"}
          </span>
        </div>
      </div>

      {/* Preset Selector Buttons */}
      <div className="flex items-center justify-center gap-2 mt-4 mb-5">
        <button
          type="button"
          onClick={() => {
            haptics.light();
            setPreset(25, 5);
          }}
          disabled={isRunning || isPaused}
          className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95 focus:ring-2 focus:ring-sage focus:outline-none ${
            isPreset25
              ? "bg-sage text-cream shadow-sm"
              : "bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] text-ink/80 dark:text-cream/80 hover:bg-sage/10 disabled:opacity-50"
          }`}
        >
          25 / 5m
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.light();
            setPreset(50, 10);
          }}
          disabled={isRunning || isPaused}
          className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95 focus:ring-2 focus:ring-sage focus:outline-none ${
            isPreset50
              ? "bg-sage text-cream shadow-sm"
              : "bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] text-ink/80 dark:text-cream/80 hover:bg-sage/10 disabled:opacity-50"
          }`}
        >
          50 / 10m
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.light();
            setShowCustomModal(!showCustomModal);
          }}
          disabled={isRunning || isPaused}
          className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95 flex items-center gap-1.5 focus:ring-2 focus:ring-sage focus:outline-none ${
            isCustom
              ? "bg-sage text-cream shadow-sm"
              : "bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] text-ink/80 dark:text-cream/80 hover:bg-sage/10 disabled:opacity-50"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>
            {isCustom ? `${pomo.preset.focus}/${pomo.preset.brk}m` : "Custom"}
          </span>
        </button>
      </div>

      {/* Custom Duration Inline Expander */}
      {showCustomModal && phase === "idle" && (
        <div className="mb-4 p-4 rounded-xl bg-cream/70 dark:bg-mocha/70 border border-sage/30 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-medium text-ink dark:text-cream">
            <span>Custom Preset Configuration</span>
            <button
              type="button"
              onClick={() => setShowCustomModal(false)}
              className="text-xs text-ink/60 dark:text-cream/60 hover:text-ink dark:hover:text-cream"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="custom-focus-input"
                className="block text-[11px] font-medium text-ink/70 dark:text-cream/70 mb-1"
              >
                Focus (Minutes)
              </label>
              <input
                id="custom-focus-input"
                type="number"
                min="1"
                max="180"
                value={customFocus}
                onChange={(e) => setCustomFocus(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 rounded-lg border border-[#EBE7DF] dark:border-[#383530] bg-paper dark:bg-obsidian text-ink dark:text-cream text-sm font-semibold tabular-nums focus:ring-2 focus:ring-sage focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="custom-break-input"
                className="block text-[11px] font-medium text-ink/70 dark:text-cream/70 mb-1"
              >
                Break (Minutes)
              </label>
              <input
                id="custom-break-input"
                type="number"
                min="1"
                max="60"
                value={customBreak}
                onChange={(e) => setCustomBreak(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 rounded-lg border border-[#EBE7DF] dark:border-[#383530] bg-paper dark:bg-obsidian text-ink dark:text-cream text-sm font-semibold tabular-nums focus:ring-2 focus:ring-sage focus:outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyCustom}
            className="w-full min-h-[44px] px-4 rounded-xl bg-sage text-cream font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all focus:ring-2 focus:ring-sage focus:outline-none"
          >
            <Check className="w-4 h-4" />
            Apply Preset ({customFocus}m / {customBreak}m)
          </button>
        </div>
      )}

      {/* Main Bottom Control Buttons */}
      <div className="flex items-center gap-3">
        {phase === "idle" ? (
          <button
            type="button"
            onClick={handleStart}
            className="flex-1 min-h-[48px] px-5 rounded-xl bg-sage text-cream font-medium text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-sage focus:outline-none"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Focus
          </button>
        ) : (
          <>
            {isRunning ? (
              <button
                type="button"
                onClick={handlePause}
                className="flex-1 min-h-[48px] px-5 rounded-xl bg-sage/15 dark:bg-sage/25 text-[#2D5A43] dark:text-matcha font-medium text-sm active:scale-95 transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-sage focus:outline-none"
              >
                <Pause className="w-4 h-4 fill-current" />
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResume}
                className="flex-1 min-h-[48px] px-5 rounded-xl bg-sage text-cream font-medium text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 focus:ring-2 focus:ring-sage focus:outline-none"
              >
                <Play className="w-4 h-4 fill-current" />
                Resume
              </button>
            )}

            <button
              type="button"
              onClick={handleStop}
              aria-label="Stop Pomodoro"
              className="min-h-[48px] min-w-[48px] px-4 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-sm font-medium focus:ring-2 focus:ring-red-400 focus:outline-none"
            >
              <Square className="w-4 h-4 fill-current" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
