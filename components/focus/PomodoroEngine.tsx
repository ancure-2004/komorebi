"use client";

import { useEffect, useRef } from "react";
import { useNow } from "@/lib/hooks";
import { useApp } from "@/lib/store";
import { sound } from "@/lib/audio";
import { buzz } from "@/lib/haptics";

/**
 * Background Pomodoro tick handler.
 * Evaluates absolute timestamp (endAt) against reactive now timer.
 * Triggers phase completion, soundscape chime, and haptic feedback.
 */
export default function PomodoroEngine() {
  const now = useNow(500);
  const endAt = useApp((s) => s.pomo.endAt);
  const phase = useApp((s) => s.pomo.phase);
  const completePhase = useApp((s) => s.completePhase);
  const lastCompletedEndAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "idle" && endAt && now >= endAt) {
      if (lastCompletedEndAtRef.current !== endAt) {
        lastCompletedEndAtRef.current = endAt;
        completePhase();
        sound.chime();
        buzz([200, 100, 200]);
      }
    }
  }, [now, endAt, phase, completePhase]);

  return null;
}
