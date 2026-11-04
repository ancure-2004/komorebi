"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Clock,
  ChevronDown,
  ChevronUp,
  Sun,
} from "lucide-react";
import { fmtHM, minutesIST, todayKey } from "@/lib/time";
import { FLEX_END } from "@/lib/schedule";
import { useNow } from "@/lib/hooks";
import { EMPTY_DAY, useApp } from "@/lib/store";

export interface MorningFlexProps {
  date?: string;
  defaultCollapsed?: boolean;
  className?: string;
  onStartStopwatch?: () => void;
}

export default function MorningFlex({
  date: propDate,
  defaultCollapsed,
  className = "",
  onStartStopwatch,
}: MorningFlexProps) {
  const currentDate = propDate ?? todayKey();
  const rawDay = useApp((s) => s.days[currentDate]);
  const day = rawDay ?? EMPTY_DAY;
  const flexToggle = useApp((s) => s.flexToggle);
  const flexAdd = useApp((s) => s.flexAdd);
  const patchDay = useApp((s) => s.patchDay);

  const isRunning = Boolean(day.flexRunningSince);
  const now = useNow(isRunning ? 1000 : 15000);
  const currentMin = minutesIST(now);
  const isPastFlex = currentMin >= FLEX_END;

  // After 3:00 PM, collapse into summary chip by default unless specified
  const [isExpanded, setIsExpanded] = useState<boolean>(
    defaultCollapsed !== undefined ? !defaultCollapsed : !isPastFlex
  );

  const bankedMs =
    day.flexLoggedMs +
    (day.flexRunningSince ? Math.max(0, now - day.flexRunningSince) : 0);
  const goalMs = day.flexGoalMin * 60000;
  const pct = goalMs > 0 ? Math.min(1, bankedMs / goalMs) : 0;
  const isGoalMet = goalMs > 0 && bankedMs >= goalMs;

  // SVG radial progress geometry
  const R = 70;
  const C = 2 * Math.PI * R;
  const strokeOffset = C * (1 - pct);

  const handleGoalChange = (val: number) => {
    patchDay(currentDate, (d) => ({
      ...d,
      flexGoalMin: Math.max(0, Math.min(360, val)),
    }));
  };

  return (
    <section
      aria-label="Morning Flex Bank"
      className={`rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-4 sm:p-5 shadow-sm transition-colors duration-200 ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sage/15 dark:bg-sage/25 flex items-center justify-center text-sage dark:text-matcha">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-serif font-semibold text-ink dark:text-cream leading-tight">
              Morning Flex Bank
            </h2>
            <p className="text-xs font-sans text-ink/60 dark:text-cream/60">
              {isPastFlex ? "Morning phase ended at 3:00 PM" : "Flexible hours before 3:00 PM"}
            </p>
          </div>
        </div>

        {/* Collapsed / Expand Toggle Button (>=44px touch target) */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse Morning Flex details" : "Expand Morning Flex details"}
          className="min-w-[44px] min-h-[44px] px-2 flex items-center justify-center gap-1 rounded-xl text-xs font-sans font-medium text-ink/70 dark:text-cream/70 hover:bg-sage/10 dark:hover:bg-sage/20 active:scale-95 transition-all"
        >
          <span className="hidden sm:inline tabular-nums">
            {fmtHM(bankedMs)} / {fmtHM(goalMs)}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-ink/60 dark:text-cream/60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-ink/60 dark:text-cream/60" />
          )}
        </button>
      </div>

      {/* Collapsed Summary Banner */}
      {!isExpanded && (
        <div className="mt-3 pt-3 border-t border-[#EBE7DF] dark:border-[#383530] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink dark:text-cream tabular-nums">
              Banked {fmtHM(bankedMs)}
            </span>
            <span className="text-ink/50 dark:text-cream/50">of {fmtHM(goalMs)}</span>
            {isGoalMet && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-sage/20 text-ink dark:text-cream">
                <Sparkles className="w-3 h-3 text-sage" /> Goal Met
              </span>
            )}
          </div>
          <div className="w-24 h-2 bg-sage/15 dark:bg-sage/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-sage rounded-full transition-all duration-500"
              style={{ width: `${Math.round(pct * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded Interactive Body */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[#EBE7DF] dark:border-[#383530] space-y-5">
          {/* Central Radial Progress & Stopwatch Display */}
          <div className="flex flex-col items-center justify-center relative">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg
                viewBox="0 0 180 180"
                className="w-44 h-44 -rotate-90 transform"
                aria-hidden="true"
              >
                {/* Background Ring */}
                <circle
                  cx="90"
                  cy="90"
                  r={R}
                  fill="none"
                  strokeWidth="12"
                  className="stroke-matcha/20 dark:stroke-matcha/10"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="90"
                  cy="90"
                  r={R}
                  fill="none"
                  strokeWidth="12"
                  strokeLinecap="round"
                  className="stroke-sage transition-[stroke-dashoffset] duration-700 ease-out"
                  strokeDasharray={C}
                  strokeDashoffset={strokeOffset}
                />
              </svg>

              {/* Center Metrics */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                <span className="text-2xl sm:text-3xl font-serif font-bold text-ink dark:text-cream tabular-nums tracking-tight">
                  {fmtHM(bankedMs)}
                </span>
                <span className="text-xs font-sans font-medium text-ink/60 dark:text-cream/60 mt-0.5">
                  of {fmtHM(goalMs)} target
                </span>
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-[11px] font-sans font-semibold text-ink/75 dark:text-cream/75 tabular-nums">
                    {Math.round(pct * 100)}%
                  </span>
                  {isGoalMet && (
                    <Sparkles className="w-3.5 h-3.5 text-sage fill-sage/40" />
                  )}
                </div>
              </div>
            </div>

            {/* Stopwatch Live Status Tag */}
            {isRunning && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage/15 text-xs font-medium text-ink dark:text-cream animate-pulse">
                <span className="w-2 h-2 rounded-full bg-sage" />
                Stopwatch running
              </div>
            )}
          </div>

          {/* Stopwatch Toggle Button (>=44px touch target) */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => {
                const willStart = !isRunning;
                flexToggle(currentDate);
                if (willStart) {
                  onStartStopwatch?.();
                }
              }}
              aria-label={isRunning ? "Pause morning flex stopwatch" : "Start morning flex stopwatch"}
              className={`h-11 px-6 rounded-xl font-sans font-medium text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all duration-150 ${
                isRunning
                  ? "bg-mocha text-cream dark:bg-paper dark:text-mocha"
                  : "bg-sage text-cream hover:bg-sage/90"
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Stopwatch</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Start Stopwatch</span>
                </>
              )}
            </button>
          </div>

          {/* Quick-Log Buttons (+15, +30, +45, +60, -15 undo) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-sans text-ink/60 dark:text-cream/60">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Quick-log minutes
              </span>
              <span>Undo mistakes</span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => flexAdd(currentDate, mins)}
                  aria-label={`Add ${mins} minutes to morning flex`}
                  className="min-h-[44px] rounded-xl bg-paper dark:bg-obsidian border border-sage/30 dark:border-matcha/30 hover:bg-sage/10 dark:hover:bg-sage/20 text-ink dark:text-cream font-sans font-medium text-xs tabular-nums flex items-center justify-center gap-0.5 active:scale-95 transition-all"
                >
                  <Plus className="w-3 h-3 text-sage" />
                  <span>{mins}m</span>
                </button>
              ))}

              {/* -15m Undo button */}
              <button
                type="button"
                onClick={() => flexAdd(currentDate, -15)}
                disabled={bankedMs <= 0}
                aria-label="Undo 15 minutes from morning flex"
                className="min-h-[44px] rounded-xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] hover:bg-sakura/20 text-ink/70 dark:text-cream/70 disabled:opacity-40 disabled:cursor-not-allowed font-sans font-medium text-xs tabular-nums flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <RotateCcw className="w-3 h-3 text-ink/60 dark:text-cream/60" />
                <span>-15m</span>
              </button>
            </div>
          </div>

          {/* Flexible Goal Slider */}
          <div className="space-y-2 pt-2 border-t border-[#EBE7DF] dark:border-[#383530]">
            <div className="flex items-center justify-between text-xs font-sans">
              <label
                htmlFor="morning-goal-slider"
                className="flex items-center gap-1 font-medium text-ink dark:text-cream"
              >
                <Target className="w-3.5 h-3.5 text-sage" />
                Morning Goal Target
              </label>
              <span className="font-semibold text-ink dark:text-cream tabular-nums">
                {fmtHM(goalMs)} ({day.flexGoalMin}m)
              </span>
            </div>

            <input
              id="morning-goal-slider"
              type="range"
              min={0}
              max={360}
              step={15}
              value={day.flexGoalMin}
              onChange={(e) => handleGoalChange(parseInt(e.target.value, 10))}
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={day.flexGoalMin}
              aria-valuetext={`${day.flexGoalMin} minutes`}
              className="w-full h-2 bg-sage/20 dark:bg-sage/30 rounded-lg appearance-none cursor-pointer accent-sage"
            />

            <div className="relative w-full h-4 text-[10px] font-sans text-ink/50 dark:text-cream/50 mt-1 select-none">
              <span className="absolute left-0">0h</span>
              <span className="absolute left-[16.67%] -translate-x-1/2">1h</span>
              <span className="absolute left-[33.33%] -translate-x-1/2 font-medium text-sage dark:text-matcha">2h (Default)</span>
              <span className="absolute left-[50%] -translate-x-1/2">3h</span>
              <span className="absolute left-[66.67%] -translate-x-1/2">4h</span>
              <span className="absolute right-0">6h</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
