import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Block, DEFAULT_BLOCKS, FLEX_END } from "./schedule";
import { minutesIST, todayKey } from "./time";

export type Ambience = "rain" | "lofi" | "forest" | "white";

export interface DayState {
  flexGoalMin: number;
  flexLoggedMs: number;
  flexRunningSince: number | null;
  lowEnergy: boolean;
  blocksOverride?: Block[];
  focusMsByBlock: Record<string, number>;
  doneBlockIds: string[];
  pomodoros: number;
  mood?: string[];
  goalMet?: boolean;
}

export const emptyDay = (): DayState => ({
  flexGoalMin: 120,
  flexLoggedMs: 0,
  flexRunningSince: null,
  lowEnergy: false,
  focusMsByBlock: {},
  doneBlockIds: [],
  pomodoros: 0,
});

export interface Pomo {
  phase: "idle" | "focus" | "break";
  endAt: number | null;
  pausedLeftMs: number | null;
  preset: { focus: number; brk: number };
  linkedBlockId?: string;
}

export interface BrainDumpItem {
  id: string;
  text: string;
  done: boolean;
  at: number;
}

export interface AppSettings {
  shareStatus: boolean;
  sound: { kind: Ambience | null; volume: number };
  deskClock: boolean;
  seenEnvelope?: string;
  onboarded?: boolean;
  zenMode?: boolean;
}

export interface AppState {
  template: Block[];
  days: Record<string, DayState>;
  pomo: Pomo;
  brainDump: BrainDumpItem[];
  settings: AppSettings;

  patchDay: (d: string, fn: (x: DayState) => DayState) => void;
  setTemplate: (b: Block[]) => void;
  flexToggle: (d: string) => void;
  flexAdd: (d: string, min: number) => void;
  startFocus: (linked?: string) => void;
  pausePomo: () => void;
  resumePomo: () => void;
  stopPomo: () => void;
  completePhase: () => void;
  setPreset: (focus: number, brk: number) => void;
  addBrainDump: (text: string) => void;
  toggleBrainDump: (id: string) => void;
  deleteBrainDump: (id: string) => void;
  updateSettings: (fn: (s: AppSettings) => AppSettings) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      template: DEFAULT_BLOCKS,
      days: {},
      pomo: { phase: "idle", endAt: null, pausedLeftMs: null, preset: { focus: 25, brk: 5 } },
      brainDump: [],
      settings: { shareStatus: true, sound: { kind: null, volume: 0.5 }, deskClock: true },

      patchDay: (d, fn) =>
        set((s) => ({ days: { ...s.days, [d]: fn(s.days[d] ?? emptyDay()) } })),

      setTemplate: (b) => set({ template: b }),

      flexToggle: (d) =>
        get().patchDay(d, (x) =>
          x.flexRunningSince
            ? {
                ...x,
                flexLoggedMs: x.flexLoggedMs + (Date.now() - x.flexRunningSince),
                flexRunningSince: null,
              }
            : { ...x, flexRunningSince: Date.now() }
        ),

      flexAdd: (d, min) =>
        get().patchDay(d, (x) => ({
          ...x,
          flexLoggedMs: Math.max(0, x.flexLoggedMs + min * 60000),
        })),

      startFocus: (linked) =>
        set((s) => ({
          pomo: {
            ...s.pomo,
            phase: "focus",
            endAt: Date.now() + s.pomo.preset.focus * 60000,
            pausedLeftMs: null,
            linkedBlockId: linked,
          },
        })),

      pausePomo: () =>
        set((s) =>
          s.pomo.endAt
            ? {
                pomo: {
                  ...s.pomo,
                  pausedLeftMs: s.pomo.endAt - Date.now(),
                  endAt: null,
                },
              }
            : s
        ),

      resumePomo: () =>
        set((s) =>
          s.pomo.pausedLeftMs != null
            ? {
                pomo: {
                  ...s.pomo,
                  endAt: Date.now() + s.pomo.pausedLeftMs,
                  pausedLeftMs: null,
                },
              }
            : s
        ),

      stopPomo: () =>
        set((s) => ({
          pomo: { ...s.pomo, phase: "idle", endAt: null, pausedLeftMs: null, linkedBlockId: undefined },
        })),

      setPreset: (focus, brk) =>
        set((s) => ({ pomo: { ...s.pomo, preset: { focus, brk } } })),

      completePhase: () => {
        const { pomo, patchDay } = get();
        const date = todayKey();
        if (pomo.phase === "focus") {
          const ms = pomo.preset.focus * 60000;
          patchDay(date, (d) => {
            if (pomo.linkedBlockId) {
              return {
                ...d,
                pomodoros: d.pomodoros + 1,
                focusMsByBlock: {
                  ...d.focusMsByBlock,
                  [pomo.linkedBlockId]: (d.focusMsByBlock[pomo.linkedBlockId] ?? 0) + ms,
                },
              };
            }
            if (minutesIST() < FLEX_END) {
              return { ...d, pomodoros: d.pomodoros + 1, flexLoggedMs: d.flexLoggedMs + ms };
            }
            return {
              ...d,
              pomodoros: d.pomodoros + 1,
              focusMsByBlock: { ...d.focusMsByBlock, free: (d.focusMsByBlock.free ?? 0) + ms },
            };
          });
          set({
            pomo: {
              ...pomo,
              phase: "break",
              endAt: Date.now() + pomo.preset.brk * 60000,
            },
          });
        } else {
          set({ pomo: { ...pomo, phase: "idle", endAt: null, linkedBlockId: undefined } });
        }
      },

      addBrainDump: (text) =>
        set((s) => ({
          brainDump: [{ id: Math.random().toString(36).slice(2, 9), text, done: false, at: Date.now() }, ...s.brainDump],
        })),

      toggleBrainDump: (id) =>
        set((s) => ({
          brainDump: s.brainDump.map((x) => (x.id === id ? { ...x, done: !x.done } : x)),
        })),

      deleteBrainDump: (id) =>
        set((s) => ({
          brainDump: s.brainDump.filter((x) => x.id !== id),
        })),

      updateSettings: (fn) =>
        set((s) => ({ settings: fn(s.settings) })),
    }),
    {
      name: "komorebi:v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
