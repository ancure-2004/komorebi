"use client";

import {
  Play,
  Check,
  Plus,
  BatteryCharging,
  Sparkles,
  ArrowRight,
  Sun,
  Moon,
  Timer,
} from "lucide-react";
import confetti from "canvas-confetti";
import { fmtClock, fmtHM, fmtMMSS, minutesIST, todayKey } from "@/lib/time";
import { bump, FLEX_END, isStudy, locate } from "@/lib/schedule";
import { dayBlocks } from "@/lib/stats";
import { useNow } from "@/lib/hooks";
import { emptyDay, useApp } from "@/lib/store";

export interface HeroProps {
  date?: string;
  onStartFocus?: (blockId?: string) => void;
  className?: string;
}

export default function Hero({
  date: propDate,
  onStartFocus,
  className = "",
}: HeroProps) {
  const currentDate = propDate ?? todayKey();
  const day = useApp((s) => s.days[currentDate] ?? emptyDay());
  const template = useApp((s) => s.template);
  const patchDay = useApp((s) => s.patchDay);
  const pomo = useApp((s) => s.pomo);
  const storeStartFocus = useApp((s) => s.startFocus);

  const now = useNow(1000);
  const nowMin = minutesIST(now, true);
  const activeMinInt = Math.floor(nowMin);

  // Derive active blocks for today (applies override or low energy mode if active)
  const blocks = dayBlocks(day, template);
  const { current, next } = locate(blocks, nowMin);

  // Check if current block is already marked done
  const isCurrentDone = current ? day.doneBlockIds.includes(current.id) : false;

  // Toggle Low Energy Mode
  const toggleLowEnergy = () => {
    patchDay(currentDate, (d) => ({
      ...d,
      lowEnergy: !d.lowEnergy,
    }));
  };

  // Quick bump current block by delta minutes
  const handleBump = (delta: number = 15) => {
    if (!current) return;
    patchDay(currentDate, (d) => ({
      ...d,
      blocksOverride: bump(dayBlocks(d, template), current.id, delta),
    }));
  };

  // Mark current block done
  const handleMarkDone = () => {
    if (!current) return;
    const nextDone = !isCurrentDone;
    patchDay(currentDate, (d) => ({
      ...d,
      doneBlockIds: nextDone
        ? [...new Set([...d.doneBlockIds, current.id])]
        : d.doneBlockIds.filter((id) => id !== current.id),
      focusMsByBlock:
        nextDone && isStudy(current)
          ? {
              ...d.focusMsByBlock,
              [current.id]: Math.max(
                d.focusMsByBlock[current.id] ?? 0,
                current.duration * 60000
              ),
            }
          : d.focusMsByBlock,
    }));

    if (nextDone) {
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
          colors: ["#7D9D8B", "#98B2A0", "#F4C2C8"],
        });
      } catch {}
    }
  };

  const handleStartFocus = () => {
    if (onStartFocus) {
      onStartFocus(current?.id);
    } else {
      storeStartFocus(current?.id);
    }
  };

  // Progress calculations for active block
  let progressRatio = 0;
  let remainingMs = 0;
  if (current) {
    const elapsedMin = Math.max(0, nowMin - current.start);
    progressRatio = Math.min(1, Math.max(0, elapsedMin / current.duration));
    remainingMs = Math.max(0, (current.start + current.duration - nowMin) * 60000);
  }

  // Morning flex calculations if before 3:00 PM
  const bankedMs =
    day.flexLoggedMs +
    (day.flexRunningSince ? Math.max(0, now - day.flexRunningSince) : 0);
  const flexGoalMs = day.flexGoalMin * 60000;
  const isMorningFlex = nowMin < FLEX_END && !current;

  // Day complete if past last block and no current block
  const lastBlock = blocks[blocks.length - 1];
  const isDayComplete = !current && lastBlock && nowMin >= lastBlock.start + lastBlock.duration;

  return (
    <section
      aria-label="Active block hero card"
      className={`rounded-2xl bg-paper dark:bg-obsidian border-2 border-sage/60 dark:border-matcha/60 p-4 sm:p-5 shadow-aura transition-all duration-200 ${className}`}
    >
      {/* Top Header: Right Now Tag, Current IST Time & Low Energy Toggle */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#EBE7DF] dark:border-[#383530]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sage animate-ping" />
          <span className="text-xs font-sans font-semibold tracking-wider uppercase text-sage dark:text-matcha">
            Right Now
          </span>
          <span className="text-xs font-sans text-ink/60 dark:text-cream/60 tabular-nums">
            • {fmtClock(activeMinInt)} IST
          </span>
        </div>

        {/* Low Energy Recovery Toggle (>=44px touch target) */}
        <button
          type="button"
          onClick={toggleLowEnergy}
          aria-pressed={day.lowEnergy}
          aria-label={
            day.lowEnergy
              ? "Disable Low Energy Mode"
              : "Enable Low Energy Mode (halves evening study, expands rest)"
          }
          className={`min-h-[44px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-sans font-medium active:scale-95 transition-all ${
            day.lowEnergy
              ? "bg-matcha/20 border-matcha text-[#2D5A43] dark:text-[#B4CEBC]"
              : "bg-paper dark:bg-obsidian border-[#EBE7DF] dark:border-[#383530] text-ink/70 dark:text-cream/70 hover:border-sage/40"
          }`}
        >
          <BatteryCharging
            className={`w-3.5 h-3.5 ${
              day.lowEnergy ? "text-sage" : "text-ink/50 dark:text-cream/50"
            }`}
          />
          <span className="hidden sm:inline">Low Energy</span>
          {day.lowEnergy && (
            <span className="w-1.5 h-1.5 rounded-full bg-sage" />
          )}
        </button>
      </div>

      {/* Hero Body Content */}
      <div className="py-4">
        {/* State A: Active Evening Block */}
        {current && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span
                  className="text-3xl select-none pt-0.5 flex-shrink-0"
                  aria-hidden="true"
                >
                  {current.emoji}
                </span>

                <div className="flex-1 min-w-0">
                  <h2
                    className={`text-xl sm:text-2xl font-serif font-bold text-ink dark:text-cream leading-tight truncate ${
                      isCurrentDone ? "line-through text-ink/60 dark:text-cream/60" : ""
                    }`}
                  >
                    {current.title}
                  </h2>
                  <p className="text-xs font-sans text-ink/60 dark:text-cream/60 mt-1">
                    {fmtClock(current.start)} - {fmtClock(current.start + current.duration)} (
                    {fmtHM(current.duration * 60000)})
                  </p>
                </div>
              </div>

              {/* Big Tabular Countdown Display */}
              <div className="text-right flex-shrink-0">
                <div className="text-2xl sm:text-3xl font-sans font-bold tabular-nums text-ink dark:text-cream">
                  {fmtMMSS(remainingMs)}
                </div>
                <div className="text-[10px] font-sans font-medium text-ink/50 dark:text-cream/50 uppercase tracking-wider">
                  Remaining
                </div>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-2.5 bg-sage/15 dark:bg-sage/25 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sage rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.round(progressRatio * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-sans text-ink/50 dark:text-cream/50 tabular-nums">
                <span>{Math.round(progressRatio * 100)}% completed</span>
                <span>{fmtHM(remainingMs)} left</span>
              </div>
            </div>

            {/* Action Buttons: Start Focus, Done Check, +15m Bump */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              {isStudy(current) && (
                <button
                  type="button"
                  onClick={handleStartFocus}
                  aria-label={`Start Pomodoro focus session for ${current.title}`}
                  className="min-h-[44px] px-5 rounded-xl bg-sage text-cream hover:bg-sage/90 font-sans font-medium text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{pomo.phase === "focus" ? "Focus Active" : "Start Focus"}</span>
                </button>
              )}

              {/* Done Checkmark Button (>=44px touch target) */}
              <button
                type="button"
                onClick={handleMarkDone}
                aria-label={
                  isCurrentDone
                    ? `Mark ${current.title} as incomplete`
                    : `Mark ${current.title} as done`
                }
                className={`min-h-[44px] px-4 rounded-xl border flex items-center justify-center gap-2 font-sans font-medium text-xs active:scale-95 transition-all ${
                  isCurrentDone
                    ? "bg-sage text-cream border-sage"
                    : "bg-paper dark:bg-obsidian border-sage/40 text-ink/80 dark:text-cream/80 hover:border-sage hover:text-sage"
                }`}
              >
                <Check
                  className={`w-4 h-4 ${isCurrentDone ? "stroke-[3]" : ""}`}
                />
                <span>{isCurrentDone ? "Completed" : "Done ✓"}</span>
              </button>

              {/* Quick +15m Bump Button (>=44px touch target) */}
              <button
                type="button"
                onClick={() => handleBump(15)}
                aria-label={`Shift ${current.title} and subsequent blocks forward by 15 minutes`}
                className="min-h-[44px] px-3.5 rounded-xl bg-sage/15 dark:bg-sage/25 text-ink dark:text-cream hover:bg-sage/25 font-sans font-medium text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-sage" />
                <span>+15m Bump</span>
              </button>
            </div>
          </div>
        )}

        {/* State B: Morning Flex Active (< 3:00 PM and no evening block) */}
        {isMorningFlex && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sage/20 dark:bg-sage/30 flex items-center justify-center text-sage dark:text-matcha flex-shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-sans font-medium bg-sage/15 text-[#2D5A43] dark:text-[#B4CEBC] mb-1">
                  Flexible Morning Phase
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-ink dark:text-cream">
                  Morning Flex Bank
                </h2>
                <p className="text-xs font-sans text-ink/70 dark:text-cream/70 mt-1">
                  Banked {fmtHM(bankedMs)} of {fmtHM(flexGoalMs)} study goal before 3:00 PM.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* State C: Day Complete (past last block) */}
        {isDayComplete && (
          <div className="space-y-2 py-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sakura/20 text-[#733B43] dark:text-[#FAD8DC] flex items-center justify-center">
                <Moon className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-serif font-semibold text-ink dark:text-cream">
                Day Complete
              </h2>
            </div>
            <p className="text-xs font-sans text-ink/70 dark:text-cream/70 leading-relaxed">
              All scheduled blocks for today are wrapped up. Great job today! Take time to reflect, wind down, and rest.
            </p>
          </div>
        )}
      </div>

      {/* Up Next Preview Footer */}
      {next && (
        <div className="mt-2 pt-3 border-t border-[#EBE7DF] dark:border-[#383530] flex items-center justify-between text-xs font-sans">
          <div className="flex items-center gap-1.5 text-ink/60 dark:text-cream/60 min-w-0">
            <span className="font-medium text-ink/80 dark:text-cream/80">Up Next:</span>
            <span aria-hidden="true">{next.emoji}</span>
            <span className="font-serif font-medium text-ink dark:text-cream truncate">
              {next.title}
            </span>
          </div>
          <div className="flex items-center gap-1 text-sage dark:text-matcha font-medium tabular-nums flex-shrink-0">
            <span>{fmtClock(next.start)}</span>
            <span className="text-ink/40 dark:text-cream/40">
              (in {fmtHM(Math.max(0, (next.start - nowMin) * 60000))})
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
    </section>
  );
}
