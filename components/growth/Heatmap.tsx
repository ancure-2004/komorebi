"use client";

import React, { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  addMonths,
  subMonths,
  isToday,
  isSameMonth,
  isAfter,
  startOfToday,
  parseISO,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Flame,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";
import { useApp, DayState } from "@/lib/store";
import { totalFocusMs, goalMs } from "@/lib/stats";
import { fmtHM } from "@/lib/time";
import { useHydrated } from "@/lib/hooks";

export interface HeatmapDayData {
  date: string; // YYYY-MM-DD
  focusMs: number;
  goalMs: number;
  goalMet: boolean;
  pomodoros: number;
}

export interface HeatmapProps {
  /** Optional override for days dictionary. Defaults to store.days if omitted. */
  days?: Record<string, DayState>;
  /** Optional initial month date. Defaults to current date. */
  initialMonth?: Date;
  /** Callback triggered when a day cell is selected. */
  onSelectDay?: (date: string) => void;
  /** Custom CSS classes for the outer card. */
  className?: string;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function Heatmap({
  days: propDays,
  initialMonth,
  onSelectDay,
  className = "",
}: HeatmapProps) {
  const isHydrated = useHydrated();
  const storeDays = useApp((s) => s.days);
  const storeTemplate = useApp((s) => s.template);
  const activeDays = useMemo(
    () => propDays ?? (isHydrated ? storeDays : {}),
    [propDays, isHydrated, storeDays]
  );

  const [currentMonth, setCurrentMonth] = useState<Date>(() => initialMonth ?? new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const today = startOfToday();

  // Compute all calendar days in month plus leading blanks
  const { daysInMonth, leadingBlanks, monthStats } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const intervalDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Monday-based week index (0 = Monday, 6 = Sunday)
    const rawStartDay = getDay(monthStart);
    const blanks = (rawStartDay + 6) % 7;

    let totalFocus = 0;
    let daysActive = 0;
    let goalsMetCount = 0;

    intervalDays.forEach((d) => {
      const key = format(d, "yyyy-MM-dd");
      const dState = activeDays[key];
      if (dState) {
        const focus = totalFocusMs(dState);
        const target = goalMs(dState, storeTemplate);
        const met = Boolean(dState.goalMet || (target > 0 && focus >= target));

        totalFocus += focus;
        if (focus > 0) daysActive += 1;
        if (met) goalsMetCount += 1;
      }
    });

    return {
      daysInMonth: intervalDays,
      leadingBlanks: blanks,
      monthStats: {
        totalFocusMs: totalFocus,
        daysActive,
        goalsMetCount,
      },
    };
  }, [currentMonth, activeDays, storeTemplate]);

  const handlePrevMonth = () => {
    setCurrentMonth((m) => subMonths(m, 1));
    setSelectedDayKey(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth((m) => addMonths(m, 1));
    setSelectedDayKey(null);
  };

  const handleSelectDay = (key: string) => {
    setSelectedDayKey((prev) => (prev === key ? null : key));
    onSelectDay?.(key);
  };

  // Resolve selected day metadata for popover details
  const selectedDayInfo = useMemo(() => {
    if (!selectedDayKey) return null;
    const dState = activeDays[selectedDayKey];
    const focus = dState ? totalFocusMs(dState) : 0;
    const target = dState ? goalMs(dState, storeTemplate) : 0;
    const met = dState ? Boolean(dState.goalMet || (target > 0 && focus >= target)) : false;
    const pomodoros = dState?.pomodoros ?? 0;
    const focusMinutes = Math.round(focus / 60000);

    let parsedDate: Date;
    try {
      parsedDate = parseISO(selectedDayKey);
    } catch {
      parsedDate = new Date();
    }

    return {
      key: selectedDayKey,
      formattedDate: format(parsedDate, "EEEE, MMMM d, yyyy"),
      focusMinutes,
      focusFormatted: fmtHM(focus),
      targetFormatted: target > 0 ? fmtHM(target) : "Not set",
      goalMet: met,
      pomodoros,
    };
  }, [selectedDayKey, activeDays, storeTemplate]);

  return (
    <div
      className={`rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-4 sm:p-5 shadow-sm transition-colors duration-200 ${className}`}
    >
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-lg sm:text-xl font-medium text-ink dark:text-cream tracking-tight">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <p className="text-xs text-ink/70 dark:text-cream/70 font-sans mt-0.5">
            Consistency & Focus Heatmap
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-ink dark:text-cream hover:bg-sage/10 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-ink dark:text-cream hover:bg-sage/10 active:scale-95 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center mb-1.5">
        {WEEKDAYS.map((w, idx) => (
          <span
            key={`weekday-${idx}`}
            className="text-[11px] font-semibold text-ink/60 dark:text-cream/60 uppercase tracking-wider py-1"
          >
            {w}
          </span>
        ))}
      </div>

      {/* 30-Day Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="grid" aria-label="Monthly focus days">
        {/* Leading blank slots */}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square w-full" aria-hidden="true" />
        ))}

        {/* Days of Month */}
        {daysInMonth.map((dayDate) => {
          const dateKey = format(dayDate, "yyyy-MM-dd");
          const dState = activeDays[dateKey];
          const focus = dState ? totalFocusMs(dState) : 0;
          const target = dState ? goalMs(dState, storeTemplate) : 0;
          const met = dState ? Boolean(dState.goalMet || (target > 0 && focus >= target)) : false;
          const ratio = target > 0 ? focus / target : 0;
          const isCurrentDay = isToday(dayDate);
          const isFuture = isAfter(dayDate, today);
          const isSelected = selectedDayKey === dateKey;

          // Color classification:
          // Days with goalMet=true light up in vibrant matcha/sage green
          let cellBgClass =
            "bg-cream dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] text-ink/70 dark:text-cream/70";

          if (isFuture) {
            cellBgClass =
              "bg-paper/40 dark:bg-obsidian/30 border border-transparent text-ink/30 dark:text-cream/30 opacity-60";
          } else if (met) {
            cellBgClass =
              "bg-sage text-cream shadow-sm ring-1 ring-sage/60 font-semibold";
          } else if (ratio >= 0.75) {
            cellBgClass = "bg-matcha text-ink dark:text-mocha font-medium";
          } else if (ratio >= 0.3) {
            cellBgClass = "bg-matcha/40 text-ink dark:text-cream font-medium";
          } else if (focus > 0) {
            cellBgClass = "bg-matcha/20 text-ink dark:text-cream";
          }

          const focusMin = Math.round(focus / 60000);
          const tooltipText = `${dateKey}: ${focusMin} min focus${met ? " - Goal Met!" : ""}`;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => handleSelectDay(dateKey)}
              title={tooltipText}
              aria-label={tooltipText}
              aria-pressed={isSelected}
              className={`relative aspect-square w-full min-h-[38px] sm:min-h-[44px] rounded-lg flex flex-col items-center justify-center text-xs transition-all duration-150 active:scale-95 ${cellBgClass} ${
                isSelected
                  ? "ring-2 ring-ink dark:ring-cream shadow-md scale-105 z-10"
                  : "hover:scale-[1.03]"
              }`}
            >
              <span className="leading-none">{format(dayDate, "d")}</span>

              {/* Indicator icons for Goal Met or Today */}
              {met && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sakura shadow-sm" />
              )}
              {isCurrentDay && !met && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-ink dark:bg-cream" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Details Card (Mobile-friendly popover/drawer) */}
      {selectedDayInfo && (
        <div className="mt-4 p-3.5 rounded-xl bg-cream dark:bg-mocha/60 border border-sage/40 shadow-sm animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-serif text-sm font-semibold text-ink dark:text-cream">
                {selectedDayInfo.formattedDate}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-xs font-medium text-ink dark:text-cream">
                  <Clock className="w-3.5 h-3.5 text-sage" />
                  {selectedDayInfo.focusMinutes} min ({selectedDayInfo.focusFormatted})
                </span>
                <span className="text-xs text-ink/50 dark:text-cream/50">•</span>
                <span className="text-xs text-ink/70 dark:text-cream/70">
                  Target: {selectedDayInfo.targetFormatted}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayKey(null)}
              aria-label="Close day details"
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-ink/70 dark:text-cream/70 hover:bg-sage/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-[#EBE7DF] dark:border-[#383530] flex items-center justify-between text-xs">
            <span className="text-ink/70 dark:text-cream/70">
              {selectedDayInfo.pomodoros > 0
                ? `${selectedDayInfo.pomodoros} Pomodoro sessions`
                : "No pomodoros logged"}
            </span>

            {selectedDayInfo.goalMet ? (
              <span className="inline-flex items-center gap-1 font-medium text-sage dark:text-matcha">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Goal Met 🌸
              </span>
            ) : selectedDayInfo.focusMinutes > 0 ? (
              <span className="text-ink/60 dark:text-cream/60">In progress</span>
            ) : (
              <span className="text-ink/50 dark:text-cream/50">Rest day</span>
            )}
          </div>
        </div>
      )}

      {/* Monthly Summary Statistics */}
      <div className="mt-4 pt-3 border-t border-[#EBE7DF] dark:border-[#383530] flex items-center justify-between text-xs text-ink/80 dark:text-cream/80">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-sage" />
          <span>{fmtHM(monthStats.totalFocusMs)} focus</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>{monthStats.daysActive} active days</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sakura" />
          <span>{monthStats.goalsMetCount} goals met</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-ink/60 dark:text-cream/60 pt-2 border-t border-[#EBE7DF]/60 dark:border-[#383530]/60">
        <span>Less</span>
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-sm bg-cream dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530]"
            title="0 min"
          />
          <div className="w-3 h-3 rounded-sm bg-matcha/20" title=">0 min" />
          <div className="w-3 h-3 rounded-sm bg-matcha/40" title=">=30% target" />
          <div className="w-3 h-3 rounded-sm bg-matcha" title=">=75% target" />
          <div className="w-3 h-3 rounded-sm bg-sage" title="Goal Met 🌸" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

export default Heatmap;
