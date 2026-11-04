export const TZ = "Asia/Kolkata";

/**
 * Returns the current minutes elapsed since midnight in Indian Standard Time (IST).
 * When fractional is true, seconds are included as fractional minutes.
 */
export function minutesIST(ms: number = Date.now(), fractional: boolean = false): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));

  const getPart = (type: string): number => {
    const p = parts.find((x) => x.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };

  const hour = getPart("hour") % 24;
  const minute = getPart("minute");
  const second = getPart("second");

  return hour * 60 + minute + (fractional ? second / 60 : 0);
}

/**
 * Returns today's date formatted as YYYY-MM-DD in IST timezone.
 */
export const todayKey = (ms: number = Date.now()): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(ms));

/**
 * Formats minutes since midnight into a 12-hour clock string (e.g. 900 -> "3:00 PM").
 */
export const fmtClock = (min: number): string => {
  const norm = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60) % 24;
  const m = Math.round(norm % 60);
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
};

/**
 * Formats duration in milliseconds into human readable hours and minutes (e.g. 5400000 -> "1h 30m").
 */
export const fmtHM = (ms: number): string => {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
  return `${totalMinutes}m`;
};

/**
 * Formats duration in milliseconds into MM:SS countdown format (e.g. 1500000 -> "25:00").
 */
export const fmtMMSS = (ms: number): string => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};
