"use client";

import { useEffect, useRef } from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import type { Block } from "@/lib/schedule";
import { bump, isStudy } from "@/lib/schedule";
import { dayBlocks } from "@/lib/stats";
import { minutesIST, todayKey } from "@/lib/time";
import { useNow } from "@/lib/hooks";
import { emptyDay, useApp } from "@/lib/store";
import BlockCard from "./BlockCard";

export interface TimelineProps {
  blocks?: Block[];
  date?: string;
  onStartFocus?: (blockId: string) => void;
  className?: string;
}

export default function Timeline({
  blocks: propBlocks,
  date: propDate,
  onStartFocus,
  className = "",
}: TimelineProps) {
  const currentDate = propDate ?? todayKey();
  const day = useApp((s) => s.days[currentDate] ?? emptyDay());
  const template = useApp((s) => s.template);
  const patchDay = useApp((s) => s.patchDay);
  const storeStartFocus = useApp((s) => s.startFocus);

  const now = useNow(1000);
  const nowMin = minutesIST(now, true);

  // Resolve blocks: use prop if provided, else dayBlocks from store
  const effectiveBlocks = propBlocks ?? dayBlocks(day, template);
  const sortedBlocks = [...effectiveBlocks].sort((a, b) => a.start - b.start);

  // Find active block id
  const activeBlock = sortedBlocks.find(
    (b) => nowMin >= b.start && nowMin < b.start + b.duration
  );
  const activeId = activeBlock?.id;

  // Ref to active block card container for smooth auto-scroll on mount
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeRef.current) {
      // Delay slightly to ensure layout hydration is settled
      const timeout = setTimeout(() => {
        activeRef.current?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [activeId]);

  // Checkbox toggle handler
  const handleToggleDone = (id: string) => {
    const isDone = day.doneBlockIds.includes(id);
    const targetBlock = sortedBlocks.find((b) => b.id === id);

    patchDay(currentDate, (d) => ({
      ...d,
      doneBlockIds: isDone
        ? d.doneBlockIds.filter((bId) => bId !== id)
        : [...new Set([...d.doneBlockIds, id])],
      focusMsByBlock:
        !isDone && targetBlock && isStudy(targetBlock)
          ? {
              ...d.focusMsByBlock,
              [id]: Math.max(
                d.focusMsByBlock[id] ?? 0,
                targetBlock.duration * 60000
              ),
            }
          : d.focusMsByBlock,
    }));
  };

  // Start focus session
  const handleStartFocus = (id: string) => {
    if (onStartFocus) {
      onStartFocus(id);
    } else {
      storeStartFocus(id);
    }
  };

  // Bump handler for today's schedule
  const handleBump = (id: string, delta: number) => {
    patchDay(currentDate, (d) => ({
      ...d,
      blocksOverride: bump(dayBlocks(d, template), id, delta),
    }));
  };

  // Completed metrics
  const completedCount = sortedBlocks.filter((b) =>
    day.doneBlockIds.includes(b.id)
  ).length;

  return (
    <section
      aria-label="Evening Flow Timeline River"
      className={`space-y-4 ${className}`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-serif font-semibold text-ink dark:text-cream">
            Evening Flow Timeline
          </h2>
          <p className="text-xs font-sans text-ink/60 dark:text-cream/60">
            3:00 PM - 11:30 PM schedule
          </p>
        </div>

        {/* Completion Counter Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] text-xs font-sans font-medium text-ink/75 dark:text-cream/75">
          <CheckCircle2 className="w-3.5 h-3.5 text-sage" />
          <span className="tabular-nums">
            {completedCount} of {sortedBlocks.length} completed
          </span>
        </div>
      </div>

      {/* Timeline River Container with vertical connecting track */}
      <div className="relative pl-4 space-y-3">
        {/* River Line Track */}
        <div
          className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-sage/40 via-matcha/30 to-sakura/30 -z-0"
          aria-hidden="true"
        />

        {sortedBlocks.map((block) => {
          const isActive = activeId === block.id;
          const isPast = nowMin >= block.start + block.duration;
          const isDone = day.doneBlockIds.includes(block.id);

          return (
            <div
              key={block.id}
              ref={isActive ? activeRef : undefined}
              className="relative z-10"
            >
              {/* Timeline Indicator Dot */}
              <div
                className={`absolute -left-4 top-6 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                  isActive
                    ? "bg-sage border-cream dark:border-mocha ring-4 ring-sage/30 scale-125"
                    : isDone
                    ? "bg-sage border-sage"
                    : isPast
                    ? "bg-paper dark:bg-obsidian border-[#EBE7DF] dark:border-[#383530]"
                    : "bg-paper dark:bg-obsidian border-sage/60"
                }`}
                aria-hidden="true"
              />

              <BlockCard
                block={block}
                isActive={isActive}
                isPast={isPast}
                isDone={isDone}
                onToggleDone={handleToggleDone}
                onStartFocus={handleStartFocus}
                onBump={handleBump}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
