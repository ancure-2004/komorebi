"use client";

import { useState, useEffect, useSyncExternalStore } from "react";

/**
 * Returns reactive timestamp updating every `ms` milliseconds,
 * and immediately when the browser tab returns to visibility.
 */
export function useNow(ms: number = 1000): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ms]);

  return now;
}

const emptySubscribe = () => () => {};

/**
 * Returns true once mounted on client side to avoid SSR/localStorage hydration mismatches.
 * Uses React 19 idiomatic useSyncExternalStore to eliminate effect-driven cascading renders.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/**
 * Evaluates a CSS media query (e.g. "(orientation: landscape)") and updates reactively.
 */
export function useMedia(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/**
 * Requests a screen WakeLock to keep mobile display awake during Zen or Desk Clock focus modes.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const requestLock = async () => {
      try {
        if (!cancelled) {
          lock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // Silently catch if battery saver or user denied
      }
    };

    requestLock();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        requestLock();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (lock) {
        lock.release().catch(() => {});
      }
    };
  }, [active]);
}
