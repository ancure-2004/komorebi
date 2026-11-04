import { describe, it, expect } from "vitest";
import { minutesIST, todayKey, fmtClock, fmtHM, fmtMMSS } from "@/lib/time";
import {
  DEFAULT_BLOCKS,
  Block,
  locate,
  bump,
  applyLowEnergy,
  repack,
  isStudy,
} from "@/lib/schedule";
import { goalMs, streak, totalFocusMs } from "@/lib/stats";
import { DayState, emptyDay } from "@/lib/store";

describe("lib/time.ts — Fixed IST Clock & Formatting", () => {
  it("computes minutesIST correctly for known UTC timestamp", () => {
    // 2026-11-04 09:30:00 UTC = 2026-11-04 15:00:00 IST (3:00 PM)
    const testUtcMs = Date.UTC(2026, 10, 4, 9, 30, 0);
    const min = minutesIST(testUtcMs);
    expect(min).toBe(900); // 15 * 60 = 900
  });

  it("computes fractional minutesIST when requested", () => {
    // 2026-11-04 09:30:30 UTC = 15:00:30 IST
    const testUtcMs = Date.UTC(2026, 10, 4, 9, 30, 30);
    const min = minutesIST(testUtcMs, true);
    expect(min).toBeCloseTo(900.5, 2);
  });

  it("formats todayKey as YYYY-MM-DD in IST", () => {
    // 2026-11-04 20:00:00 UTC = 2026-11-05 01:30:00 IST (Next day in IST!)
    const testUtcMs = Date.UTC(2026, 10, 4, 20, 0, 0);
    const key = todayKey(testUtcMs);
    expect(key).toBe("2026-11-05");
  });

  it("formats clock and durations properly", () => {
    expect(fmtClock(900)).toBe("3:00 PM");
    expect(fmtClock(0)).toBe("12:00 AM");
    expect(fmtClock(690)).toBe("11:30 AM");
    expect(fmtClock(1439)).toBe("11:59 PM");

    expect(fmtHM(5400000)).toBe("1h 30m");
    expect(fmtHM(1200000)).toBe("20m");

    expect(fmtMMSS(1500000)).toBe("25:00");
    expect(fmtMMSS(65000)).toBe("01:05");
  });
});

describe("lib/schedule.ts — repack, locate, bump, applyLowEnergy", () => {
  it("repacks blocks sequentially from starting minute", () => {
    const blocks: Block[] = [
      { id: "1", title: "A", emoji: "📚", kind: "study", start: 0, duration: 60 },
      { id: "2", title: "B", emoji: "🌿", kind: "walk", start: 0, duration: 30 },
    ];
    const repacked = repack(blocks, 900);
    expect(repacked[0].start).toBe(900);
    expect(repacked[1].start).toBe(960);
  });

  it("locates current and next blocks accurately", () => {
    // DEFAULT_BLOCKS has classes starting at 900 for 60min (900-960)
    const at930 = locate(DEFAULT_BLOCKS, 930);
    expect(at930.current?.id).toBe("classes");
    expect(at930.next?.id).toBe("s1");

    // Before any blocks (e.g. 800)
    const at800 = locate(DEFAULT_BLOCKS, 800);
    expect(at800.current).toBeNull();
    expect(at800.next?.id).toBe("classes");

    // After all blocks (e.g. 1450)
    const afterAll = locate(DEFAULT_BLOCKS, 1450);
    expect(afterAll.current).toBeNull();
    expect(afterAll.next).toBeNull();
  });

  it("bumps current block duration and shifts subsequent blocks", () => {
    // Bump s1 (+30 min)
    const bumped = bump(DEFAULT_BLOCKS, "s1", 30);
    const s1 = bumped.find((b) => b.id === "s1")!;
    const walk = bumped.find((b) => b.id === "walk")!;
    const s2 = bumped.find((b) => b.id === "s2")!;

    expect(s1.duration).toBe(150); // was 120
    expect(walk.start).toBe(1110); // was 1080 + 30
    expect(s2.start).toBe(1170); // was 1140 + 30
  });

  it("applies low energy: halves study blocks and distributes freed time", () => {
    const originalStudyMin = DEFAULT_BLOCKS.filter(isStudy).reduce((acc, b) => acc + b.duration, 0); // 120 + 120 + 60 = 300 (5h)
    const low = applyLowEnergy(DEFAULT_BLOCKS);
    const lowStudyMin = low.filter(isStudy).reduce((acc, b) => acc + b.duration, 0);

    // Study time halved (300 -> 150 min = 2.5h)
    expect(lowStudyMin).toBe(150);

    // Total schedule duration should remain unchanged
    const origTotal = DEFAULT_BLOCKS.reduce((acc, b) => acc + b.duration, 0);
    const lowTotal = low.reduce((acc, b) => acc + b.duration, 0);
    expect(lowTotal).toBe(origTotal);

    // Walk and relax blocks received the freed time
    const origWalk = DEFAULT_BLOCKS.find((b) => b.kind === "walk")!.duration;
    const lowWalk = low.find((b) => b.kind === "walk")!.duration;
    expect(lowWalk).toBeGreaterThan(origWalk);
  });
});

describe("lib/stats.ts — goalMs, totalFocusMs, and streak calculation", () => {
  it("calculates goalMs accurately", () => {
    const day = emptyDay(); // flexGoalMin = 120
    // DEFAULT_BLOCKS study minutes = 120 + 120 + 60 = 300
    // Total goal = (120 + 300) * 60,000 = 25,200,000 ms (7 hours)
    const g = goalMs(day, DEFAULT_BLOCKS);
    expect(g).toBe((120 + 300) * 60000);

    // When low energy active: study is 150m
    const lowDay: DayState = { ...day, lowEnergy: true };
    const lowG = goalMs(lowDay, DEFAULT_BLOCKS);
    expect(lowG).toBe((120 + 150) * 60000);
  });

  it("calculates totalFocusMs including active flex running", () => {
    const now = 100000;
    const day: DayState = {
      ...emptyDay(),
      flexLoggedMs: 30000,
      flexRunningSince: now - 15000,
      focusMsByBlock: { s1: 60000, s2: 45000 },
    };

    const total = totalFocusMs(day, now);
    expect(total).toBe(30000 + 15000 + 60000 + 45000);
  });

  it("calculates streak correctly across past consecutive days", () => {
    const days: Record<string, DayState> = {
      "2026-11-01": { ...emptyDay(), goalMet: true },
      "2026-11-02": { ...emptyDay(), goalMet: true },
      "2026-11-03": { ...emptyDay(), goalMet: true },
      "2026-11-04": { ...emptyDay(), goalMet: false }, // Today: in progress
    };

    // When today is not yet met, streak from yesterday should be 3
    expect(streak(days, "2026-11-04")).toBe(3);

    // When today is met, streak becomes 4
    days["2026-11-04"].goalMet = true;
    expect(streak(days, "2026-11-04")).toBe(4);

    // If a day was missed
    const brokenDays: Record<string, DayState> = {
      "2026-11-01": { ...emptyDay(), goalMet: true },
      "2026-11-02": { ...emptyDay(), goalMet: false },
      "2026-11-03": { ...emptyDay(), goalMet: true },
      "2026-11-04": { ...emptyDay(), goalMet: true },
    };
    expect(streak(brokenDays, "2026-11-04")).toBe(2);
  });
});
