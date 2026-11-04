import { format, parseISO, subDays } from "date-fns";
import type { Block } from "./schedule";
import { isStudy, applyLowEnergy } from "./schedule";
import type { DayState } from "./store";

/**
 * Resolves the active blocks for a given day, accounting for overrides and Low Energy mode.
 */
export const dayBlocks = (d: DayState, tpl: Block[]): Block[] => {
  const b = d.blocksOverride ?? tpl;
  return d.lowEnergy ? applyLowEnergy(b) : b;
};

/**
 * Calculates total focus time logged in milliseconds across morning flex and all study blocks.
 */
export const totalFocusMs = (d: DayState, now: number = Date.now()): number => {
  const flexActive = d.flexRunningSince ? Math.max(0, now - d.flexRunningSince) : 0;
  const blockFocus = Object.values(d.focusMsByBlock).reduce((a, b) => a + b, 0);
  return d.flexLoggedMs + flexActive + blockFocus;
};

/**
 * Calculates total daily study target in milliseconds (morning flex goal + evening study block durations).
 */
export const goalMs = (d: DayState, tpl: Block[]): number => {
  const activeBlocks = dayBlocks(d, tpl);
  const studyMin = activeBlocks.filter(isStudy).reduce((acc, b) => acc + b.duration, 0);
  return (d.flexGoalMin + studyMin) * 60000;
};

/**
 * Computes unbroken streak of days where daily goal was met.
 */
export function streak(days: Record<string, DayState>, today: string): number {
  let count = 0;
  let d = parseISO(today);

  // If today's goal is not yet met, we start counting backwards from yesterday
  if (!days[today]?.goalMet) {
    d = subDays(d, 1);
  }

  while (days[format(d, "yyyy-MM-dd")]?.goalMet) {
    count++;
    d = subDays(d, 1);
  }

  return count;
}
