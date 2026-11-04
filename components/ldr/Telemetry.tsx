"use client";

import { useEffect, useRef } from "react";
import { supabase, useSession } from "@/lib/supabase";
import { useRoom } from "@/lib/room";
import { useApp } from "@/lib/store";
import { minutesIST, todayKey } from "@/lib/time";
import { locate, FLEX_END } from "@/lib/schedule";
import { dayBlocks } from "@/lib/stats";
import { useNow } from "@/lib/hooks";

export default function Telemetry() {
  const session = useSession();
  const room = useRoom();
  const settings = useApp((s) => s.settings);
  const pomo = useApp((s) => s.pomo);
  const days = useApp((s) => s.days);
  const template = useApp((s) => s.template);

  const now = useNow(15000); // Check every 15s
  const currentMin = minutesIST(now);
  const dateStr = todayKey(now);
  const day = days[dateStr];

  const lastDbUpdateRef = useRef<number>(0);

  const pomoRunning = pomo.phase === "focus" && pomo.pausedLeftMs === null;
  const flexRunning = Boolean(day?.flexRunningSince);

  useEffect(() => {
    // If her privacy setting turns off telemetry, do nothing
    if (settings.shareStatus === false) return;

    const blocks = day ? dayBlocks(day, template) : template;
    const { current } = locate(blocks, currentMin);

    let label = "Day complete";
    let emoji = "🌙";

    if (pomoRunning) {
      label = "Pomodoro focus";
      emoji = "🍅";
    } else if (current) {
      label = current.title;
      emoji = current.emoji;
    } else if (currentMin < FLEX_END) {
      label = flexRunning ? "Morning focus stopwatch" : "Morning flex bank";
      emoji = flexRunning ? "⏱️" : "☀️";
    }

    // 1. Live presence update over Realtime
    if (room.isSubscribed) {
      room.track({
        role: "her",
        label,
        emoji,
        pomodoro: pomoRunning,
        ts: Date.now(),
      });
    }

    // 2. Throttled database update (at most once every 30s)
    const timeSinceLastDb = Date.now() - lastDbUpdateRef.current;
    if (session.uid && timeSinceLastDb >= 30000) {
      lastDbUpdateRef.current = Date.now();
      supabase
        .from("status")
        .upsert({
          user_id: session.uid,
          label,
          emoji,
          pomodoro: pomoRunning,
          updated_at: new Date().toISOString(),
        })
        .then(() => {});
    }
  }, [
    session.uid,
    room,
    settings.shareStatus,
    pomoRunning,
    flexRunning,
    currentMin,
    day,
    template,
  ]);

  return null;
}
