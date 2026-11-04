/**
 * Komorebi Haptic Engine
 * Safe navigator.vibrate wrapper with Android / Poco compatibility checks.
 * Provides gentle tactile feedback for Pomodoro transitions and taps.
 */

export function isHapticsSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return typeof navigator.vibrate === "function";
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  return /android/i.test(ua);
}

/**
 * Trigger haptic vibration with pattern.
 * Safe across all devices and gracefully ignores unsupported browsers.
 */
export function buzz(pattern: number | number[] = 40): boolean {
  if (!isHapticsSupported()) {
    return false;
  }
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/**
 * Tactile feedback profiles
 */
export const haptics = {
  /** Subtle touch feedback (15ms) */
  light: () => buzz(15),

  /** Standard button press feedback (35ms) */
  medium: () => buzz(35),

  /** Distinct transition feedback (70ms) */
  heavy: () => buzz(70),

  /** Positive confirmation ripple */
  success: () => buzz([35, 50, 35]),

  /** End-of-pomodoro celebration pattern (200ms pulse, 100ms pause, 200ms pulse) */
  pomoComplete: () => buzz([200, 100, 200]),

  /** Break time reminder pattern */
  breakAlert: () => buzz([100, 75, 100]),
};
