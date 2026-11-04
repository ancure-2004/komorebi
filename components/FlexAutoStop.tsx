"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { minutesIST, todayKey } from "@/lib/time";
import { FLEX_END } from "@/lib/schedule";
import { useNow } from "@/lib/hooks";

/**
 * Automatically stops the Morning Flex Bank stopwatch when the clock strikes 3:00 PM IST (FLEX_END).
 * Persists the banked elapsed focus time cleanly.
 */
export default function FlexAutoStop(): null {
  const now = useNow(5000);
  const { days, flexToggle } = useApp();
  const dateStr = todayKey(now);
  const currentMin = minutesIST(now);
  const todayState = days[dateStr];

  useEffect(() => {
    // If it's 3:00 PM (900 min) or later and flex stopwatch is still ticking, auto-stop
    if (currentMin >= FLEX_END && todayState?.flexRunningSince) {
      flexToggle(dateStr);
    }
  }, [currentMin, dateStr, todayState, flexToggle]);

  return null;
}
