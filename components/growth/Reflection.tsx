"use client";

import React, { useState, useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import {
  Moon,
  Sparkles,
  Send,
  Check,
  Heart,
  Clock,
  Flame,
  MessageCircle,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { todayKey, fmtHM } from "@/lib/time";
import { totalFocusMs, streak } from "@/lib/stats";
import { useHydrated } from "@/lib/hooks";

export interface ReflectionProps {
  /** Date key in YYYY-MM-DD format. Defaults to today's date in IST. */
  date?: string;
  /** Explicit total focus time in milliseconds. If omitted, calculated from store. */
  totalFocusMs?: number;
  /** Explicit current streak count. If omitted, calculated from store. */
  streakCount?: number;
  /** Initial selected mood emoji array. */
  initialMood?: string[];
  /** Initial reflection note text. */
  initialReflection?: string;
  /** Callback invoked when reflection is saved. */
  onSave?: (data: { mood: string[]; text: string }) => void;
  /** Custom CSS classes for the card. */
  className?: string;
}

interface MoodOption {
  emoji: string;
  label: string;
  description: string;
}

const MOOD_OPTIONS: MoodOption[] = [
  { emoji: "😊", label: "Happy", description: "Fulfilled & proud of today's study" },
  { emoji: "😌", label: "Peaceful", description: "Calm, grounded & content" },
  { emoji: "😴", label: "Sleepy", description: "Tired, restful & ready for bed" },
];

export function Reflection({
  date: propDate,
  totalFocusMs: propTotalFocusMs,
  streakCount: propStreakCount,
  initialMood,
  initialReflection,
  onSave,
  className = "",
}: ReflectionProps) {
  const isHydrated = useHydrated();
  const storeDays = useApp((s) => s.days);
  const patchDay = useApp((s) => s.patchDay);

  const activeDate = propDate ?? todayKey();
  const dayState = storeDays[activeDate];

  // Derive focus time and streak
  const focusMs = useMemo(() => {
    if (typeof propTotalFocusMs === "number") return propTotalFocusMs;
    if (!dayState) return 0;
    return totalFocusMs(dayState);
  }, [propTotalFocusMs, dayState]);

  const currentStreak = useMemo(() => {
    if (typeof propStreakCount === "number") return propStreakCount;
    if (!isHydrated) return 0;
    return streak(storeDays, activeDate);
  }, [propStreakCount, isHydrated, storeDays, activeDate]);

  // Selected mood state
  const [selectedMoods, setSelectedMoods] = useState<string[]>(() => initialMood ?? dayState?.mood ?? []);
  const [reflectionText, setReflectionText] = useState<string>(() => {
    if (initialReflection) return initialReflection;
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(`komorebi:reflection:${activeDate}`) ?? "";
      } catch {}
    }
    return "";
  });
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const [prevDayMood, setPrevDayMood] = useState(dayState?.mood);
  if (dayState?.mood && dayState.mood !== prevDayMood) {
    setPrevDayMood(dayState.mood);
    if (selectedMoods.length === 0) {
      setSelectedMoods(dayState.mood);
    }
  }

  // Toggle mood selector (supports selecting 1 to 3 emojis)
  const toggleMood = (emoji: string) => {
    setSelectedMoods((prev) => {
      if (prev.includes(emoji)) {
        return prev.filter((e) => e !== emoji);
      }
      return [...prev, emoji].slice(0, 3);
    });
    setIsSaved(false);
  };

  const handleSave = () => {
    // Persist to store
    patchDay(activeDate, (d) => ({
      ...d,
      mood: selectedMoods,
    }));

    // Persist note to localStorage
    try {
      localStorage.setItem(`komorebi:reflection:${activeDate}`, reflectionText);
    } catch {
      // Ignore quota limits
    }

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#7D9D8B", "#98B2A0", "#F4C2C8", "#FDFBF7"],
      });
    } catch {
      // Ignore if canvas unavailable
    }

    setIsSaved(true);
    onSave?.({ mood: selectedMoods, text: reflectionText });
  };

  // Generate WhatsApp summary link
  const captainNumber = process.env.NEXT_PUBLIC_CAPTAIN_WA || "";
  const buildWhatsAppText = (): string => {
    const moodStr = selectedMoods.length > 0 ? selectedMoods.join(" ") : "🌱";
    const focusStr = fmtHM(focusMs);
    let msg = `Komorebi Daily Summary 🌿\n`;
    msg += `📅 Date: ${activeDate}\n`;
    msg += `⏱️ Focus Time: ${focusStr}\n`;
    msg += `💭 Mood: ${moodStr}\n`;
    msg += `🔥 Streak: ${currentStreak} days\n`;
    if (reflectionText.trim()) {
      msg += `📝 Reflection: "${reflectionText.trim()}"\n`;
    }
    msg += `\nGoodnight Captain! 🌙✨`;
    return msg;
  };

  const handleSendWhatsApp = () => {
    const text = buildWhatsAppText();
    const url = captainNumber
      ? `https://wa.me/${captainNumber.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-4 sm:p-5 shadow-sm transition-colors duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sage/15 flex items-center justify-center text-sage">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-medium text-ink dark:text-cream tracking-tight">
              11:00 PM Reflection
            </h3>
            <p className="text-xs text-ink/70 dark:text-cream/70 font-sans mt-0.5">
              Wind down, log your feelings, and close today with love
            </p>
          </div>
        </div>

        {/* Focus stats pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-cream dark:bg-mocha/70 border border-[#EBE7DF] dark:border-[#383530] text-xs text-ink/80 dark:text-cream/80">
          <Clock className="w-3.5 h-3.5 text-sage" />
          <span>{fmtHM(focusMs)}</span>
        </div>
      </div>

      {/* Mood Selector (3-Emoji Core: 😊, 😌, 😴) */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-ink/80 dark:text-cream/80 uppercase tracking-wider mb-2">
          How do you feel tonight?
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MOOD_OPTIONS.map((item) => {
            const isSelected = selectedMoods.includes(item.emoji);
            return (
              <button
                key={item.emoji}
                type="button"
                onClick={() => toggleMood(item.emoji)}
                aria-pressed={isSelected}
                className={`min-h-[58px] sm:min-h-[64px] rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-95 border ${
                  isSelected
                    ? "bg-sage/15 dark:bg-sage/25 border-sage text-ink dark:text-cream shadow-sm ring-1 ring-sage/40"
                    : "bg-cream dark:bg-obsidian border-[#EBE7DF] dark:border-[#383530] text-ink/70 dark:text-cream/70 hover:border-sage/40"
                }`}
              >
                <span className="text-2xl leading-none" role="img" aria-label={item.label}>
                  {item.emoji}
                </span>
                <span className="text-[11px] font-medium leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text Reflection */}
      <div className="mb-4">
        <label
          htmlFor="reflection-input"
          className="block text-xs font-semibold text-ink/80 dark:text-cream/80 uppercase tracking-wider mb-1.5"
        >
          Brief Thoughts or Gratitude
        </label>
        <textarea
          id="reflection-input"
          rows={3}
          value={reflectionText}
          onChange={(e) => {
            setReflectionText(e.target.value);
            setIsSaved(false);
          }}
          placeholder="What went well today? What made you smile, learn, or feel proud?"
          className="w-full rounded-xl bg-cream dark:bg-mocha/70 border border-[#EBE7DF] dark:border-[#383530] p-3 text-xs sm:text-sm text-ink dark:text-cream placeholder:text-ink/40 dark:placeholder:text-cream/40 focus:outline-none focus:ring-2 focus:ring-sage/60 transition-all resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-[#EBE7DF] dark:border-[#383530]">
        {/* Save & Celebrate Button */}
        <button
          type="button"
          onClick={handleSave}
          className={`h-11 min-h-[44px] px-5 rounded-xl font-medium text-xs sm:text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${
            isSaved
              ? "bg-matcha text-ink dark:text-mocha"
              : "bg-sage text-cream hover:bg-sage/90"
          }`}
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4 text-ink dark:text-mocha" />
              <span>Saved & Celebrated 🌸</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-cream" />
              <span>Save & Celebrate</span>
            </>
          )}
        </button>

        {/* 1-Tap WhatsApp Summary Draft Button */}
        <button
          type="button"
          onClick={handleSendWhatsApp}
          className="h-11 min-h-[44px] px-4 rounded-xl bg-sage/10 dark:bg-sage/20 hover:bg-sage/20 text-sage dark:text-matcha font-medium text-xs sm:text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4 text-sage dark:text-matcha" />
          <span>Send Summary to Captain</span>
        </button>
      </div>
    </div>
  );
}

export default Reflection;
