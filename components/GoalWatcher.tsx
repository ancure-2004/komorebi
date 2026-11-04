"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { useApp } from "@/lib/store";
import { todayKey } from "@/lib/time";
import { goalMs, totalFocusMs } from "@/lib/stats";
import { buzz } from "@/lib/haptics";
import { useNow } from "@/lib/hooks";

export default function GoalWatcher(): null {
  const now = useNow(5000);
  const { days, template, patchDay } = useApp();
  const dateStr = todayKey(now);
  const todayState = days[dateStr];
  const hasCelebratedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!todayState || todayState.goalMet) return;

    const targetMs = goalMs(todayState, template);
    const loggedMs = totalFocusMs(todayState, now);

    if (targetMs > 0 && loggedMs >= targetMs && !hasCelebratedRef.current[dateStr]) {
      hasCelebratedRef.current[dateStr] = true;
      patchDay(dateStr, (d) => ({ ...d, goalMet: true }));

      // Celebratory tactile and confetti feedback
      buzz([100, 50, 100, 50, 250]);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#7D9D8B", "#98B2A0", "#F4C2C8", "#FDFBF7"],
        });
      } catch {}
    }
  }, [now, todayState, template, dateStr, patchDay]);

  return null;
}
