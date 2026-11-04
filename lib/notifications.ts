"use client";

/**
 * Web Notifications & Web Audio Chimes for Komorebi LDR Bridge
 * Handles browser notification permissions, system tray alerts,
 * and aesthetic Web Audio chimes for drops, whispers, and mutual touch.
 */

export type ChimeType = "touch" | "drop" | "whisper" | "alert" | "chat";

/**
 * Synthesize aesthetic, calming chimes using Web Audio API.
 * Zero external audio assets required; works 100% offline and in PWA.
 */
export function playChime(type: ChimeType = "gentle" as ChimeType) {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === "touch") {
      // Gentle warm heartbeat tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(220, now);
      osc1.frequency.exponentialRampToValueAtTime(110, now + 0.35);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Second beat (lub-dub)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(240, now + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(110, now + 0.5);
      gain2.gain.setValueAtTime(0.2, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);
    } else if (type === "drop") {
      // Sparkling water droplet chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === "whisper" || type === "chat") {
      // Soft celesta / wind chime
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.08;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.15, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.6);
      });
    } else if (type === "alert") {
      // Emergency SOS siren chime
      [440, 880, 440, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.18;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    }
  } catch (err) {
    console.warn("Web Audio chime could not play:", err);
  }
}

/**
 * Checks if browser notification permission is granted.
 */
export function hasNotificationPermission(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  return Notification.permission === "granted";
}

/**
 * Prompts user for browser notification permission.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (err) {
    console.warn("Failed to request notification permission:", err);
    return false;
  }
}

/**
 * Dispatches a native browser/OS notification.
 * Works on Android Chrome via ServiceWorker registration and on desktop browsers.
 */
export async function showBrowserNotification(options: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
}): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const icon = options.icon || "/icons/icon-192.png";
  const tag = options.tag || "komorebi";

  // Try Service Worker registration first (standard for Android PWA / Chrome)
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(options.title, {
          body: options.body,
          icon,
          badge: icon,
          tag,
          data: options.data,
          requireInteraction: options.requireInteraction ?? false,
        });
        return;
      }
    } catch {
      // Fall through to standard Notification constructor
    }
  }

  // Fallback to standard Notification constructor
  try {
    new Notification(options.title, {
      body: options.body,
      icon,
      tag,
      requireInteraction: options.requireInteraction ?? false,
    });
  } catch (err) {
    console.warn("Could not display native notification:", err);
  }
}
