"use client";

import { Check, Play, Plus, Clock } from "lucide-react";
import confetti from "canvas-confetti";
import type { Block, BlockKind } from "@/lib/schedule";
import { isStudy } from "@/lib/schedule";
import { fmtClock, fmtHM } from "@/lib/time";

export interface BlockCardProps {
  block: Block;
  isActive?: boolean;
  isPast?: boolean;
  isDone?: boolean;
  onToggleDone?: (id: string) => void;
  onStartFocus?: (id: string) => void;
  onBump?: (id: string, delta: number) => void;
  className?: string;
}

// Styling definitions by block kind adhering to DESIGN.md palette tokens
const KIND_METADATA: Record<
  BlockKind,
  {
    label: string;
    badgeCls: string;
    borderCls: string;
  }
> = {
  study: {
    label: "Deep Focus",
    badgeCls: "bg-sage/15 text-[#2D5A43] dark:bg-sage/25 dark:text-[#B4CEBC]",
    borderCls: "border-l-4 border-l-sage",
  },
  walk: {
    label: "Fresh Air",
    badgeCls: "bg-[#4E876A]/15 text-[#2D5A43] dark:bg-[#4E876A]/25 dark:text-[#B4CEBC]",
    borderCls: "border-l-4 border-l-[#4E876A]",
  },
  meal: {
    label: "Nourish & Rest",
    badgeCls: "bg-[#D4A373]/20 text-[#6E4820] dark:bg-[#D4A373]/25 dark:text-[#E8C5A0]",
    borderCls: "border-l-4 border-l-[#D4A373]",
  },
  relax: {
    label: "Wind Down",
    badgeCls: "bg-sakura/25 text-[#733B43] dark:bg-sakura/20 dark:text-[#FAD8DC]",
    borderCls: "border-l-4 border-l-sakura",
  },
  wrap: {
    label: "Study Wrap-Up",
    badgeCls: "bg-matcha/20 text-[#2D5A43] dark:bg-matcha/25 dark:text-[#B4CEBC]",
    borderCls: "border-l-4 border-l-matcha",
  },
  reflect: {
    label: "Sleep Prep",
    badgeCls: "bg-[#9A8C98]/20 text-[#423740] dark:bg-[#9A8C98]/25 dark:text-[#D1C7D0]",
    borderCls: "border-l-4 border-l-[#9A8C98]",
  },
  custom: {
    label: "Custom",
    badgeCls: "bg-paper dark:bg-obsidian text-ink/75 dark:text-cream/75",
    borderCls: "border-l-4 border-l-sage/50",
  },
};

export default function BlockCard({
  block,
  isActive = false,
  isPast = false,
  isDone = false,
  onToggleDone,
  onStartFocus,
  onBump,
  className = "",
}: BlockCardProps) {
  const meta = KIND_METADATA[block.kind] ?? KIND_METADATA.custom;
  const studyBlock = isStudy(block);

  const handleCheckClick = () => {
    if (!onToggleDone) return;
    const nextDone = !isDone;
    onToggleDone(block.id);

    // Trigger celebration when finishing a block
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

  // State styling
  let stateClasses = "opacity-100";
  if (isDone) {
    stateClasses = "opacity-75";
  } else if (isPast) {
    stateClasses = "opacity-60";
  }

  const auraClasses = isActive
    ? "ring-2 ring-sage shadow-aura border-sage/60 dark:border-matcha/60"
    : "border-[#EBE7DF] dark:border-[#383530]";

  const timeRangeText = `${fmtClock(block.start)} - ${fmtClock(block.start + block.duration)}`;

  return (
    <article
      data-block-id={block.id}
      aria-current={isActive ? "time" : undefined}
      className={`rounded-2xl bg-paper dark:bg-obsidian border p-4 transition-all duration-200 ${meta.borderCls} ${auraClasses} ${stateClasses} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Info: Emoji marker + Title + Time */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span
            className="text-2xl select-none flex-shrink-0 pt-0.5"
            aria-hidden="true"
          >
            {block.emoji}
          </span>

          <div className="flex-1 min-w-0">
            {/* Kind Pill & Active Badge */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span
                className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-sans font-medium ${meta.badgeCls}`}
              >
                {meta.label}
              </span>

              {isActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sage text-cream animate-pulse">
                  Active Now
                </span>
              )}

              {isDone && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-sage/20 text-ink dark:text-cream">
                  Completed
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              className={`text-base font-serif font-semibold text-ink dark:text-cream leading-snug truncate ${
                isDone ? "line-through text-ink/60 dark:text-cream/60" : ""
              }`}
            >
              {block.title}
            </h3>

            {/* Time range & duration */}
            <div className="flex items-center gap-2 mt-1 text-xs font-sans text-ink/70 dark:text-cream/70">
              <Clock className="w-3.5 h-3.5 text-sage flex-shrink-0" />
              <span className="tabular-nums">{timeRangeText}</span>
              <span className="text-ink/40 dark:text-cream/40">•</span>
              <span className="tabular-nums font-medium">
                {fmtHM(block.duration * 60000)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Action: Mark Done Button (min 44x44px touch target) */}
        {onToggleDone && (
          <button
            type="button"
            onClick={handleCheckClick}
            aria-label={
              isDone
                ? `Mark ${block.title} as incomplete`
                : `Mark ${block.title} as completed`
            }
            className={`min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center border transition-all active:scale-90 flex-shrink-0 ${
              isDone
                ? "bg-sage text-cream border-sage"
                : "bg-paper dark:bg-obsidian border-sage/40 text-ink/40 dark:text-cream/40 hover:border-sage hover:text-sage"
            }`}
          >
            <Check
              className={`w-5 h-5 transition-transform ${isDone ? "scale-100" : "scale-75 opacity-40"}`}
              strokeWidth={3}
            />
          </button>
        )}
      </div>

      {/* Active Contextual Quick Actions (Focus & Quick Bump) */}
      {isActive && (
        <div className="mt-3 pt-3 border-t border-[#EBE7DF] dark:border-[#383530] flex flex-wrap items-center gap-2">
          {studyBlock && onStartFocus && (
            <button
              type="button"
              onClick={() => onStartFocus(block.id)}
              aria-label={`Start Pomodoro focus session for ${block.title}`}
              className="h-11 px-4 rounded-xl bg-sage text-cream font-sans font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Focus</span>
            </button>
          )}

          {onBump && (
            <button
              type="button"
              onClick={() => onBump(block.id, 15)}
              aria-label={`Extend ${block.title} by 15 minutes`}
              className="h-11 px-3.5 rounded-xl bg-sage/15 dark:bg-sage/25 text-ink dark:text-cream hover:bg-sage/25 font-sans font-medium text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-sage" />
              <span>+15m Bump</span>
            </button>
          )}
        </div>
      )}
    </article>
  );
}
