# Komorebi 木漏れ日 — Implementation Guide

How to make every feature in the Product Specification actually work. Put this file at `projects/komorebi/docs/IMPLEMENTATION.md` and keep the spec next to it.

**Assumptions:** her phone is a Poco (Android) using **Chrome**; both users are on IST; there are exactly two accounts (captain + her); Supabase free tier + Vercel free tier.

---

## 0. Decisions locked (where this guide differs from the spec)

| # | Spec said | Build this instead | Why |
|---|-----------|--------------------|-----|
| 1 | `/captain?key=secret` | Supabase Auth (email + password), 2 fixed accounts, sign-ups disabled, role stored in `profiles` | A secret in the URL leaks via history; without auth anyone with the anon key can read the chat |
| 2 | "End-to-end encrypted chat" | Label it "private & auto-deleting" (RLS + TLS + encrypted at rest). Optional real E2EE in §10.9 | Postgres-stored plaintext is not E2EE |
| 3 | "24h TTL" **and** "midnight wipe" | Text messages wiped at **00:00 IST**; media is view-once and hard-expires at 24h | The two rules contradict each other |
| 4 | Client deletes media after viewing | **Server** hands the bytes over once and deletes the file (`consume-media` Edge Function) | Client-side delete fails if the app is killed mid-view |
| 5 | SOS "alerts the captain" (no mechanism) | **Telegram bot message** via Edge Function + in-app banner. Web Push is optional (§11.4) | Simplest reliable alert on any phone |
| 6 | Live telemetry | Shown to her ("He can see: Studying Block 2") with an **off switch** | It must feel like care, not monitoring |
| 7 | Haptics | `navigator.vibrate` — works on her Android Chrome | Would not work on iPhone, but she has a Poco |
| 8 | Timers | Store absolute timestamps (`endAt`), never count ticks | Android throttles background tabs |
| 9 | "Disappearing" media | Never promise screenshot protection in the UI copy | It can't be prevented in a browser |

**Cut line (if time runs out):** ship after Sprint 2 + Morning Note. Drop first: Sunburst view, Heatmap, Coupons, Memory Reel, E2EE, Web Push.

---

## 1. Project setup

```bash
cd projects
npx create-next-app@latest komorebi --ts --app --eslint --no-tailwind --no-src-dir --import-alias "@/*" --use-npm
cd komorebi
npm i -D tailwindcss@3 postcss autoprefixer && npx tailwindcss init -p
npm i framer-motion lucide-react zustand date-fns canvas-confetti @supabase/supabase-js @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm i -D @types/canvas-confetti supabase
```

`.env.local` (never commit):

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_CAPTAIN_WA=91XXXXXXXXXX      # captain's WhatsApp number, no +
```

**Folder structure**

```
app/
  layout.tsx  page.tsx  manifest.ts  globals.css
  login/page.tsx   captain/page.tsx
components/
  Providers.tsx  Hero.tsx  MorningFlex.tsx  Timeline.tsx  Sunburst.tsx  ScheduleEditor.tsx
  focus/  Pomodoro.tsx  PomodoroEngine.tsx  Zen.tsx  DeskClock.tsx  BreakNudge.tsx  BrainDump.tsx
  sound/SoundPanel.tsx
  growth/ Bonsai.tsx  Heatmap.tsx  Coupons.tsx  Reflection.tsx
  ldr/    Envelope.tsx  Capsules.tsx  Drops.tsx  Whisper.tsx  SosButton.tsx  Chat.tsx  SyncOrb.tsx
  captain/ Live.tsx  NoteEditor.tsx  CapsuleScheduler.tsx  CouponManager.tsx  Dispatcher.tsx
lib/ time.ts schedule.ts stats.ts store.ts audio.ts haptics.ts media.ts supabase.ts room.ts share.ts hooks.ts
supabase/ migrations/0001_init.sql   functions/{notify-sos,consume-media,cleanup}/index.ts
public/ sw.js  icons/{icon-192.png,icon-512.png,maskable-512.png}
```

**Build order tip:** deploy an empty shell to Vercel on day 1 and have her install it. Real-device bugs show up early.

---

## 2. Design system

`tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { sage:"#7D9D8B", matcha:"#98B2A0", cream:"#FDFBF7", paper:"#F7F4EE",
              mocha:"#1F1E1B", obsidian:"#2B2925", ink:"#3A3833", sakura:"#F4C2C8" },
    fontFamily: { sans:["var(--font-sans)","system-ui"], serif:["var(--font-serif)","Georgia","serif"] },
    boxShadow: { aura:"0 0 40px rgba(125,157,139,.45)" },
  }},
  plugins: [],
} satisfies Config;
```

`app/globals.css`: `@tailwind base; @tailwind components; @tailwind utilities;` plus `html,body{height:100%} body{overscroll-behavior-y:contain}` and `.safe{padding-bottom:env(safe-area-inset-bottom)}`.

`app/layout.tsx`

```tsx
import "./globals.css";
import { Inter, Cormorant_Garamond } from "next/font/google";
import Providers from "@/components/Providers";
const sans = Inter({ subsets:["latin"], variable:"--font-sans" });
const serif = Cormorant_Garamond({ subsets:["latin"], weight:["500","600"], variable:"--font-serif" });
export const metadata = { title:"Komorebi 木漏れ日", applicationName:"Komorebi", appleWebApp:{ capable:true, title:"Komorebi" } };
export const viewport = { themeColor:"#7D9D8B", width:"device-width", initialScale:1, viewportFit:"cover" as const };
export default function Root({ children }:{ children:React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html:
        `try{var t=localStorage.getItem("komorebi:theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}` }} /></head>
      <body className="bg-cream text-ink dark:bg-mocha dark:text-cream font-sans antialiased"><Providers>{children}</Providers></body>
    </html>
  );
}
```

Conventions: cards = `rounded-2xl bg-paper dark:bg-obsidian p-4 shadow-sm`; headings = `font-serif`; the Japanese title uses the system CJK fallback (tiny usage, no font download). Theme toggle flips the `dark` class on `<html>` and writes `komorebi:theme`.

---

## 3. Core engine (do this first, everything depends on it)

### 3.1 `lib/time.ts` — fixed IST clock

```ts
export const TZ = "Asia/Kolkata";
export function minutesIST(ms = Date.now(), fractional = false) {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false }).formatToParts(new Date(ms));
  const g = (t:string) => +p.find(x => x.type === t)!.value;
  return (g("hour") % 24) * 60 + g("minute") + (fractional ? g("second") / 60 : 0);
}
export const todayKey = (ms = Date.now()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(ms)); // YYYY-MM-DD
export const fmtClock = (min:number) => { const h = Math.floor(min/60)%24, m = Math.round(min%60); return `${(h%12)||12}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`; };
export const fmtHM = (ms:number) => { const m = Math.floor(ms/60000); return m>=60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`; };
export const fmtMMSS = (ms:number) => { const s = Math.max(0, Math.ceil(ms/1000)); return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`; };
```

`lib/hooks.ts`

```ts
export function useNow(ms = 1000) {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setN(Date.now()), ms);
    const vis = () => setN(Date.now());
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, [ms]);
  return n;
}
export const useHydrated = () => { const [h, setH] = useState(false); useEffect(() => setH(true), []); return h; };
export const useMedia = (q:string) => { const [m, setM] = useState(false); useEffect(() => { const mq = matchMedia(q); const f = () => setM(mq.matches); f(); mq.addEventListener("change", f); return () => mq.removeEventListener("change", f); }, [q]); return m; };
export function useWakeLock(active:boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const req = async () => { try { lock = await navigator.wakeLock.request("screen"); } catch {} };
    req();
    const vis = () => { if (document.visibilityState === "visible") req(); };
    document.addEventListener("visibilitychange", vis);
    return () => { document.removeEventListener("visibilitychange", vis); lock?.release(); };
  }, [active]);
}
```

### 3.2 `lib/schedule.ts` — blocks, bump, low energy

```ts
export type BlockKind = "study"|"walk"|"meal"|"relax"|"wrap"|"reflect"|"custom";
export interface Block { id:string; title:string; emoji:string; kind:BlockKind; start:number; duration:number } // minutes since midnight

export const DEFAULT_BLOCKS: Block[] = [
  { id:"s1",     title:"Deep Focus Session 1",       emoji:"📚", kind:"study",   start:900,  duration:120 },
  { id:"walk",   title:"Outside Walk & Golden Hour", emoji:"🌿", kind:"walk",    start:1020, duration:90  },
  { id:"s2",     title:"Deep Focus Session 2",       emoji:"📖", kind:"study",   start:1110, duration:120 },
  { id:"dinner", title:"Dinner & Rest",              emoji:"🍱", kind:"meal",    start:1230, duration:30  },
  { id:"wrap",   title:"Evening Study Wrap-Up",      emoji:"✍️", kind:"wrap",    start:1260, duration:60  },
  { id:"anime",  title:"Anime Wind Down & Snack",    emoji:"🍿", kind:"relax",   start:1320, duration:60  },
  { id:"reflect",title:"Reflection & Sleep Prep",    emoji:"🌙", kind:"reflect", start:1380, duration:30  },
];
export const FLEX_END = 900; // 3:00 PM
export const isStudy = (b:Block) => b.kind === "study" || b.kind === "wrap";

export const repack = (blocks:Block[], from:number) => { let t = from; return blocks.map(b => { const nb = { ...b, start:t }; t += b.duration; return nb; }); };

export function locate(blocks:Block[], nowMin:number) {
  const sorted = [...blocks].sort((a,b) => a.start - b.start);
  const current = sorted.find(b => nowMin >= b.start && nowMin < b.start + b.duration) ?? null;
  const next = sorted.find(b => b.start > nowMin) ?? null;
  return { sorted, current, next };
}

/** Quick Bump: current block runs `delta` min longer, everything after shifts. Applied to TODAY only. */
export function bump(blocks:Block[], currentId:string, delta:number) {
  const sorted = [...blocks].sort((a,b) => a.start - b.start);
  const i = sorted.findIndex(b => b.id === currentId); if (i < 0) return blocks;
  return sorted.map((b, k) => k < i ? b : k === i ? { ...b, duration:b.duration + delta } : { ...b, start:Math.min(b.start + delta, 1439 - b.duration) });
}

/** Low Energy: study + wrap halved (5h → 2.5h); freed time goes half to the walk, half to relaxation. */
export function applyLowEnergy(blocks:Block[]) {
  const s = [...blocks].sort((a,b) => a.start - b.start);
  let freed = 0;
  const out = s.map(b => { if (!isStudy(b)) return b; const d = Math.max(15, Math.round(b.duration/2/5)*5); freed += b.duration - d; return { ...b, duration:d }; });
  const half = Math.round(freed/2/5)*5;
  const w = out.map(b => b.kind).lastIndexOf("walk"), r = out.map(b => b.kind).lastIndexOf("relax");
  if (w >= 0) out[w] = { ...out[w], duration: out[w].duration + half };
  if (r >= 0) out[r] = { ...out[r], duration: out[r].duration + (freed - half) };
  return repack(out, out[0].start);
}
```

### 3.3 `lib/stats.ts` — focus totals, goal, streak

```ts
import { addDays, format, parseISO, subDays } from "date-fns";
export const dayBlocks = (d:DayState, tpl:Block[]) => { const b = d.blocksOverride ?? tpl; return d.lowEnergy ? applyLowEnergy(b) : b; };
export const totalFocusMs = (d:DayState, now:number) =>
  d.flexLoggedMs + (d.flexRunningSince ? now - d.flexRunningSince : 0) + Object.values(d.focusMsByBlock).reduce((a,b) => a + b, 0);
export const goalMs = (d:DayState, tpl:Block[]) =>
  (d.flexGoalMin + dayBlocks(d, tpl).filter(isStudy).reduce((a,b) => a + b.duration, 0)) * 60000;
export function streak(days:Record<string,DayState>, today:string) {
  let n = 0, d = parseISO(today);
  if (!days[today]?.goalMet) d = subDays(d, 1);
  while (days[format(d, "yyyy-MM-dd")]?.goalMet) { n++; d = subDays(d, 1); }
  return n;
}
```

`goalMet` is a **snapshot flag** set once (by `GoalWatcher`, §8.5) so later edits to the schedule can't retroactively break a streak. Optional kindness feature: one "rest pass" per week that keeps the streak alive.

### 3.4 `lib/store.ts` — Zustand + localStorage (offline-first)

```ts
import { create } from "zustand"; import { persist, createJSONStorage } from "zustand/middleware";

export interface DayState {
  flexGoalMin:number; flexLoggedMs:number; flexRunningSince:number|null;
  lowEnergy:boolean; blocksOverride?:Block[];
  focusMsByBlock:Record<string,number>; doneBlockIds:string[]; pomodoros:number;
  mood?:string[]; goalMet?:boolean;
}
export const emptyDay = ():DayState => ({ flexGoalMin:120, flexLoggedMs:0, flexRunningSince:null, lowEnergy:false, focusMsByBlock:{}, doneBlockIds:[], pomodoros:0 });

interface Pomo { phase:"idle"|"focus"|"break"; endAt:number|null; pausedLeftMs:number|null; preset:{focus:number;brk:number}; linkedBlockId?:string }

interface AppState {
  template:Block[]; days:Record<string,DayState>; pomo:Pomo;
  brainDump:{ id:string; text:string; done:boolean; at:number }[];
  settings:{ shareStatus:boolean; sound:{ kind:Ambience|null; volume:number }; deskClock:boolean; seenEnvelope?:string; onboarded?:boolean };
  patchDay:(d:string, fn:(x:DayState)=>DayState)=>void;
  setTemplate:(b:Block[])=>void;
  flexToggle:(d:string)=>void; flexAdd:(d:string, min:number)=>void;
  startFocus:(linked?:string)=>void; pausePomo:()=>void; resumePomo:()=>void; stopPomo:()=>void; completePhase:()=>void;
  setPreset:(focus:number, brk:number)=>void;
}

export const useApp = create<AppState>()(persist((set, get) => ({
  template:DEFAULT_BLOCKS, days:{},
  pomo:{ phase:"idle", endAt:null, pausedLeftMs:null, preset:{ focus:25, brk:5 } },
  brainDump:[], settings:{ shareStatus:true, sound:{ kind:null, volume:0.5 }, deskClock:true },

  patchDay:(d, fn) => set(s => ({ days:{ ...s.days, [d]: fn(s.days[d] ?? emptyDay()) } })),
  setTemplate:(b) => set({ template:b }),

  flexToggle:(d) => get().patchDay(d, x => x.flexRunningSince
    ? { ...x, flexLoggedMs:x.flexLoggedMs + (Date.now() - x.flexRunningSince), flexRunningSince:null }
    : { ...x, flexRunningSince:Date.now() }),
  flexAdd:(d, min) => get().patchDay(d, x => ({ ...x, flexLoggedMs:Math.max(0, x.flexLoggedMs + min*60000) })),

  startFocus:(linked) => set(s => ({ pomo:{ ...s.pomo, phase:"focus", endAt:Date.now() + s.pomo.preset.focus*60000, pausedLeftMs:null, linkedBlockId:linked } })),
  pausePomo:() => set(s => s.pomo.endAt ? { pomo:{ ...s.pomo, pausedLeftMs:s.pomo.endAt - Date.now(), endAt:null } } : s),
  resumePomo:() => set(s => s.pomo.pausedLeftMs != null ? { pomo:{ ...s.pomo, endAt:Date.now() + s.pomo.pausedLeftMs, pausedLeftMs:null } } : s),
  stopPomo:() => set(s => ({ pomo:{ ...s.pomo, phase:"idle", endAt:null, pausedLeftMs:null, linkedBlockId:undefined } })),
  setPreset:(focus, brk) => set(s => ({ pomo:{ ...s.pomo, preset:{ focus, brk } } })),

  completePhase:() => {
    const { pomo, patchDay } = get(), date = todayKey();
    if (pomo.phase === "focus") {
      const ms = pomo.preset.focus * 60000;
      patchDay(date, d => {
        if (pomo.linkedBlockId) return { ...d, pomodoros:d.pomodoros + 1, focusMsByBlock:{ ...d.focusMsByBlock, [pomo.linkedBlockId]:(d.focusMsByBlock[pomo.linkedBlockId] ?? 0) + ms } };
        if (minutesIST() < FLEX_END) return { ...d, pomodoros:d.pomodoros + 1, flexLoggedMs:d.flexLoggedMs + ms };   // morning pomodoro → flex bank
        return { ...d, pomodoros:d.pomodoros + 1, focusMsByBlock:{ ...d.focusMsByBlock, free:(d.focusMsByBlock.free ?? 0) + ms } };
      });
      set({ pomo:{ ...pomo, phase:"break", endAt:Date.now() + pomo.preset.brk*60000 } });
    } else set({ pomo:{ ...pomo, phase:"idle", endAt:null, linkedBlockId:undefined } });
  },
}), { name:"komorebi:v1", version:1, storage:createJSONStorage(() => localStorage) }));
```

Housekeeping: on app start, drop `days` entries older than ~120 days (keep a compact `{date, focusMin, goalMet}` history if you want the heatmap to go further back).

### 3.5 `components/Providers.tsx`

Gate the first render on `useHydrated()` (render a cream skeleton until true). This avoids the SSR/localStorage mismatch. Inside, mount once: `<PomodoroEngine/>`, `<GoalWatcher/>`, `<FlexAutoStop/>`, `<RoomProvider/>` (§10.3), `<Drops/>`, `<Whisper/>`.

---

## 4. Phase 1 — Morning Flex Bank (< 3:00 PM)

State lives in `DayState` (`flexGoalMin`, `flexLoggedMs`, `flexRunningSince`). Banked time = `flexLoggedMs + (running ? now - since : 0)`.

- **Goal slider:** `<input type="range" min={0} max={360} step={15}>` → `patchDay(date, d => ({...d, flexGoalMin:v}))`. Default 120.
- **Stopwatch:** start/stop button calls `flexToggle(date)`; display `fmtHM(banked)`; tick with `useNow(1000)` only while running.
- **Quick-log:** buttons `+15 +30 +45 +60` → `flexAdd(date, n)`; a small "−15" undo for mistakes.
- **Radial ring:**

```tsx
const R = 70, C = 2 * Math.PI * R, pct = Math.min(1, banked / (goalMin * 60000));
<svg viewBox="0 0 180 180" className="w-44">
  <circle cx="90" cy="90" r={R} fill="none" strokeWidth="12" className="stroke-matcha/25" />
  <circle cx="90" cy="90" r={R} fill="none" strokeWidth="12" strokeLinecap="round" className="stroke-sage transition-[stroke-dashoffset] duration-700"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 90 90)" />
</svg>
```

- **Auto-stop at 3 PM** (`FlexAutoStop`): effect on `useNow(15000)`; if `minutesIST() >= FLEX_END` and `flexRunningSince` → fold elapsed (capped at 15:00) into `flexLoggedMs`.
- After 3 PM the card collapses into a chip: **"Banked 1h 45m of 2h"** at the top of the timeline.

---

## 5. Phase 2 — Evening Flow Timeline

### 5.1 Effective schedule for today

```ts
const date = todayKey(), day = useApp(s => s.days[date] ?? emptyDay()), tpl = useApp(s => s.template);
const blocks = dayBlocks(day, tpl);
const now = useNow(1000), nowMin = minutesIST(now, true);
const { sorted, current, next } = locate(blocks, nowMin);
const state = (b:Block) => nowMin >= b.start + b.duration ? "past" : nowMin >= b.start ? "active" : "future";
```

Rules: **template edits** (drag, durations, custom blocks) persist for all days; **Quick Bump** writes `blocksOverride` for today only; **Low Energy** is a per-day boolean.

### 5.2 "Right Now & Up Next" hero

- `nowMin < 900` and no block → show "Morning flex ☀️" with banked time and "Next: Deep Focus at 3:00 PM (in 2h 10m)".
- `current` → emoji + title, countdown `fmtMMSS((current.start + current.duration) * 60000 - minutesIST(now,true) * 60000)` (compute remaining as `(end - nowMin) * 60000`), progress bar `(nowMin - start) / duration`, and a one-line preview of `next`.
- No `current` and after last block end → "Day complete 🌙".
- Action buttons on the active block: **Start focus** (calls `startFocus(current.id)` for study blocks), **Done ✓** (credits the block, §5.4), **+15m / +30m** (bump).

### 5.3 Timeline River

Vertical list of `BlockCard`s. Styling by state:

```tsx
const cls = { past:"opacity-50", active:"ring-2 ring-sage shadow-aura animate-pulse-slow", future:"" }[state];
```

Add `animate-pulse-slow` in the Tailwind config (`keyframes: pulseSlow {0%,100%{box-shadow:0 0 20px rgba(125,157,139,.25)} 50%{box-shadow:0 0 44px rgba(125,157,139,.55)}}`). On mount and each time `current?.id` changes: `activeRef.current?.scrollIntoView({ block:"center", behavior:"smooth" })`.

### 5.4 Completing a study block

```ts
patchDay(date, d => ({ ...d,
  doneBlockIds:[...new Set([...d.doneBlockIds, id])],
  focusMsByBlock:{ ...d.focusMsByBlock, [id]: Math.max(d.focusMsByBlock[id] ?? 0, dur * 60000) } }));
confetti({ particleCount:60, spread:70, origin:{ y:.7 }, colors:["#7D9D8B","#98B2A0","#F4C2C8"] });
```

### 5.5 Sunburst Radial view

```tsx
const polar = (cx:number, cy:number, r:number, deg:number) => { const a = (deg - 90) * Math.PI / 180; return [cx + r*Math.cos(a), cy + r*Math.sin(a)]; };
const arc = (cx:number, cy:number, ro:number, ri:number, a0:number, a1:number) => {
  const [x0,y0] = polar(cx,cy,ro,a0), [x1,y1] = polar(cx,cy,ro,a1), [x2,y2] = polar(cx,cy,ri,a1), [x3,y3] = polar(cx,cy,ri,a0), L = a1 - a0 > 180 ? 1 : 0;
  return `M${x0} ${y0} A${ro} ${ro} 0 ${L} 1 ${x1} ${y1} L${x2} ${y2} A${ri} ${ri} 0 ${L} 0 ${x3} ${y3} Z`;
};
const deg = (min:number) => min / 1440 * 360;
// <path d={arc(150,150,130,95,deg(b.start),deg(b.start+b.duration))} fill={KIND_COLOR[b.kind]} />   one per block
// morning flex arc: deg(0)→deg(900), outer 130 / inner 95, fill with pct of goal
// "now" hand: polar(150,150,135,deg(nowMin)) line from centre; ☀️/🌙 emoji at centre by hour
```

Toggle between River and Sunburst with a segmented control; remember the choice in `settings`.

### 5.6 Schedule editing (drag-drop, durations, custom blocks)

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint:{ distance:6 } }),
  useSensor(TouchSensor,   { activationConstraint:{ delay:180, tolerance:6 } }));
function onDragEnd({ active, over }:DragEndEvent) {
  if (!over || active.id === over.id) return;
  const ids = blocks.map(b => b.id);
  setTemplate(repack(arrayMove(blocks, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))), blocks[0].start));
}
```

Use a drag **handle** (`style={{ touchAction:"none" }}`) so scrolling still works. Per block: ±5 / ±15 min stepper (`repack` after), rename, emoji, delete. "Add block" form (title, emoji, minutes) inserts before `reflect`, then `repack`. Never let `Σduration` push past 24:00; clamp.

---

## 6. Focus Engine

### 6.1 Pomodoro

Presets: `25/5`, `50/10`, `custom` (two number inputs) → `setPreset`. UI: big `fmtMMSS(left)`, Start / Pause / Resume / Stop. `left = pausedLeftMs ?? (endAt ? endAt - now : preset.focus*60000)`.

`PomodoroEngine.tsx` (mounted once):

```tsx
export default function PomodoroEngine() {
  const now = useNow(500);
  const endAt = useApp(s => s.pomo.endAt), phase = useApp(s => s.pomo.phase), done = useApp(s => s.completePhase);
  useEffect(() => {
    if (endAt && now >= endAt) { done(); sound.chime(); buzz([200,100,200]); }
  }, [now, endAt]);
  return null;
}
```

Auto-link: when the user taps "Start focus" with no explicit block, pass `current && isStudy(current) ? current.id : undefined`.

### 6.2 Zen Focus Mode

Fullscreen overlay (`fixed inset-0 z-50`), gradient bg, huge timer, a breathing circle and a quiet "Exit" button:

```tsx
useWakeLock(open);
<motion.div className="size-56 rounded-full bg-matcha/40" animate={{ scale:[1, 1.3, 1] }} transition={{ duration:8, repeat:Infinity, ease:"easeInOut" }} />
// text alternates "breathe in" / "breathe out" with a 4s setInterval
```

Open it with `document.documentElement.requestFullscreen?.().catch(()=>{})`. Don't play sounds other than the chime.

### 6.3 Desk Clock / Flip display

```tsx
const landscape = useMedia("(orientation: landscape) and (max-height: 500px)");
const show = landscape && settings.deskClock && (pomo.phase !== "idle" || true);
```

Overlay with big flip digits (IST `HH:MM`), current block title, and pomodoro remaining. Flip digit:

```tsx
<AnimatePresence mode="popLayout">
  <motion.span key={digit} initial={{ rotateX:-90, opacity:0 }} animate={{ rotateX:0, opacity:1 }} exit={{ rotateX:90, opacity:0 }} transition={{ duration:.35 }}>{digit}</motion.span>
</AnimatePresence>
```

She needs Android auto-rotate on. Set `"orientation":"any"` in the manifest. Keep the screen awake with `useWakeLock(show)`.

### 6.4 20-20-20 break nudge

Shown during `phase === "break"`. Local 20-second countdown ring ("Look at something 20 feet away 👀"), then a 4-step stretch list (shoulder rolls ×5, neck tilt each side, open chest, drink water) with gentle fade-in steps. Dismissible.

### 6.5 Brain Dump

Floating 🧠 button (bottom-right, above the safe area) opens a right-side drawer (`motion.aside initial={{x:"100%"}} animate={{x:0}}`): textarea + Enter to add, list with check-off, "clear done". Stored in `brainDump`. Opening it must **not** pause the Pomodoro.

---

## 7. Ambient Soundscape (Web Audio, no files)

`lib/audio.ts`:

```ts
export type Ambience = "rain" | "lofi" | "forest" | "white";

class Soundscape {
  private ctx?: AudioContext; private master?: GainNode; private vol = 0.5;
  private stops: (() => void)[] = []; kind: Ambience | null = null;

  private ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();    // must be called from a tap
    return this.ctx;
  }
  setVolume(v:number) { this.vol = v; if (this.master) this.master.gain.setTargetAtTime(v, this.ctx!.currentTime, 0.1); }

  private noise(ctx:AudioContext, brown = false) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random()*2 - 1; if (brown) { last = (last + 0.02*w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s;
  }

  stop() { this.stops.forEach(f => { try { f(); } catch {} }); this.stops = []; this.kind = null; }

  start(kind:Ambience) {
    this.stop(); const ctx = this.ensure(), out = this.master!; this.kind = kind;
    if (kind === "white") {
      const n = this.noise(ctx), g = ctx.createGain(); g.gain.value = 0.18; n.connect(g).connect(out);
      this.stops.push(() => n.stop());
    }
    if (kind === "rain") {
      const n = this.noise(ctx), hp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      hp.type = "highpass"; hp.frequency.value = 900; lp.type = "lowpass"; lp.frequency.value = 7000; g.gain.value = 0.22;
      n.connect(hp).connect(lp).connect(g).connect(out);
      const drip = setInterval(() => {            // droplets on glass
        if (Math.random() < 0.5) return; const t = ctx.currentTime, o = ctx.createOscillator(), dg = ctx.createGain();
        o.frequency.value = 1200 + Math.random()*1800; dg.gain.setValueAtTime(0.0001, t);
        dg.gain.exponentialRampToValueAtTime(0.03, t + 0.01); dg.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
        o.connect(dg).connect(out); o.start(t); o.stop(t + 0.08);
      }, 140);
      this.stops.push(() => n.stop(), () => clearInterval(drip));
    }
    if (kind === "forest") {
      const n = this.noise(ctx, true), lp = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      lp.type = "lowpass"; lp.frequency.value = 500; g.gain.value = 0.5; lfo.frequency.value = 0.12; lg.gain.value = 250;
      lfo.connect(lg).connect(lp.frequency); lfo.start(); n.connect(lp).connect(g).connect(out);   // breeze swell
      const bird = setInterval(() => {
        if (Math.random() < 0.6) return; const t = ctx.currentTime;
        for (let i = 0; i < 2 + Math.floor(Math.random()*2); i++) {
          const o = ctx.createOscillator(), bg = ctx.createGain(), s = t + i*0.18;
          o.frequency.setValueAtTime(2400, s); o.frequency.exponentialRampToValueAtTime(3600, s + 0.12);
          bg.gain.setValueAtTime(0.0001, s); bg.gain.exponentialRampToValueAtTime(0.025, s + 0.03); bg.gain.exponentialRampToValueAtTime(0.0001, s + 0.14);
          o.connect(bg).connect(out); o.start(s); o.stop(s + 0.16);
        }
      }, 5000);
      this.stops.push(() => n.stop(), () => lfo.stop(), () => clearInterval(bird));
    }
    if (kind === "lofi") {
      const chords = [[130.8,164.8,196,246.9],[110,130.8,164.8,196],[87.3,110,130.8,164.8],[98,123.5,146.8,174.6]]; // Cmaj7 Am7 Fmaj7 G7-ish
      let i = 0; const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.connect(out);
      const play = () => {
        const t = ctx.currentTime;
        chords[i++ % chords.length].forEach(f => {
          const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "triangle"; o.frequency.value = f; o.detune.value = (Math.random()-0.5)*14;
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 1.5); g.gain.exponentialRampToValueAtTime(0.0001, t + 7);
          o.connect(g).connect(lp); o.start(t); o.stop(t + 7.2);
        });
      };
      play(); const loop = setInterval(play, 6000);
      const crackle = setInterval(() => {          // vinyl crackle
        if (Math.random() < 0.7) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "square"; o.frequency.value = 3000 + Math.random()*4000; g.gain.setValueAtTime(0.012, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
        o.connect(g).connect(out); o.start(t); o.stop(t + 0.015);
      }, 90);
      this.stops.push(() => clearInterval(loop), () => clearInterval(crackle));
    }
  }

  chime() {   // end-of-block chime, independent of ambience volume
    const ctx = this.ensure(), t = ctx.currentTime;
    [880, 1318.5, 1760].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), s = t + i*0.12;
      o.frequency.value = f; g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.18/(i+1), s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 1.6);
      o.connect(g).connect(ctx.destination); o.start(s); o.stop(s + 1.8);
    });
  }
}
export const sound = new Soundscape();
```

`SoundPanel`: five buttons (Rain / Lofi / Forest / White / Off) + volume slider; clicking calls `sound.start(kind)` (this is the user gesture that unlocks audio) and saves `settings.sound`. Never auto-start on page load — Android Chrome blocks it. Start/stop with the Pomodoro focus phase is a nice option, still triggered from the Start tap.

Known limit: with the screen locked, Chrome may suspend audio. Zen/Desk Clock keep the screen awake via Wake Lock, which covers the study use case.

`lib/haptics.ts`: `export const buzz = (p:number|number[]) => { try { navigator.vibrate?.(p); } catch {} };`

---

## 8. Gamification & Growth

### 8.1 Komorebi Bonsai

Leaves = `min(24, 4·doneBlocks + pomodoros + 2·floor(flexMin/30))` (tune to taste). Bloom when `goalMet`.

```tsx
const A:[number,number][] = [[100,48],[88,56],[112,56],[100,66],[76,66],[124,66],[88,76],[112,78],[64,80],[138,60],[148,74],[126,86],
  [54,94],[72,94],[86,98],[40,102],[134,96],[150,90],[60,108],[116,98],[96,88],[30,92],[160,80],[104,110]];
export function Bonsai({ leaves, bloom }:{ leaves:number; bloom:boolean }) {
  return (
    <svg viewBox="0 0 200 225" className="w-48">
      <path d="M100 200 C100 160 85 140 95 110 C100 90 110 80 100 60" stroke="#6B4F3A" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M96 125 C80 115 70 105 62 92" stroke="#6B4F3A" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M102 100 C120 92 130 84 138 70" stroke="#6B4F3A" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M68 200 h64 l-9 20 h-46 z" fill="#B08968" />
      {A.slice(0, Math.min(leaves, A.length)).map(([x,y], i) => (
        <motion.circle key={i} cx={x} cy={y} r={9} initial={{ scale:0 }} animate={{ scale:1, fill: bloom ? "#F4C2C8" : "#7D9D8B" }} transition={{ delay:i*0.04 }} />
      ))}
    </svg>
  );
}
```

When `bloom`, overlay ~10 petals: small `motion.div`s with `animate={{ y:[0,160], x:[0,±30], rotate:[0,360], opacity:[1,0] }}` and `repeat:Infinity` with random delays.

### 8.2 Monthly Matcha Heatmap

Grid for the current month (`startOfMonth`, leading blanks = `getDay`). For each day `r = totalFocusMs / goalMs`: `0 → bg-paper`, `<0.5 → bg-matcha/30`, `<1 → bg-matcha`, `≥1 → bg-sage`. Tap a cell → small popover with hours focused. Month arrows to browse.

### 8.3 Milestone Love Coupons

Captain creates coupons in his portal (`coupons` table: title, emoji, `unlock_streak`). Her app lists them: locked ones show a padlock + "unlocks at a 7-day streak"; when `streak(days, today) >= unlock_streak` they unlock with confetti. **Redeem** → `supabase.rpc("redeem_coupon", { p_id })`, which marks `redeemed_at` (he sees it in his portal). Cache the list in localStorage so locked/unlocked state renders offline.

### 8.4 End-of-Day Reflection & Memory Reel

- Mood picker: grid of ~12 emojis, choose up to 3 → `patchDay(date, d => ({ ...d, mood }))`. Show from 9 PM (and always inside the Reflection block).
- **WhatsApp share:**

```ts
export const shareWhatsApp = (text:string) =>
  window.open(`https://wa.me/${process.env.NEXT_PUBLIC_CAPTAIN_WA}?text=${encodeURIComponent(text)}`, "_blank");
// text = `Komorebi day 🌿\nFocus: ${fmtHM(total)}  •  Mood: ${mood.join("")}\nStreak: ${n} days`
```

- **Story card (1080×1920 canvas):**

```ts
export async function storyCard(o:{ date:string; focus:string; mood:string[]; streak:number }) {
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1920; const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0,0,0,1920); g.addColorStop(0,"#FDFBF7"); g.addColorStop(1,"#98B2A0"); x.fillStyle = g; x.fillRect(0,0,1080,1920);
  x.fillStyle = "#3A3833"; x.textAlign = "center";
  x.font = "600 96px Georgia, serif"; x.fillText("Komorebi 木漏れ日", 540, 300);
  x.font = "400 54px sans-serif"; x.fillText(o.date, 540, 400);
  x.font = "600 180px sans-serif"; x.fillText(o.focus, 540, 900);
  x.font = "400 60px sans-serif"; x.fillText("of focus today", 540, 990);
  x.font = "160px sans-serif"; x.fillText(o.mood.join(" "), 540, 1300);
  x.font = "400 54px sans-serif"; x.fillText(`🔥 ${o.streak}-day streak`, 540, 1600);
  return new Promise<Blob>(r => c.toBlob(b => r(b!), "image/png"));
}
// share: const f = new File([blob], "komorebi.png", { type:"image/png" });
// navigator.canShare?.({ files:[f] }) ? navigator.share({ files:[f] }) : download via <a download>
```

(You can render a mini bonsai on the card by drawing the same circles with `arc()`.)

### 8.5 `GoalWatcher` + celebrations

```ts
useEffect(() => {
  const d = days[date]; if (!d || d.goalMet) return;
  if (totalFocusMs(d, now) >= goalMs(d, tpl)) {
    patchDay(date, x => ({ ...x, goalMet:true }));
    confetti({ particleCount:160, spread:100, origin:{ y:.6 }, colors:["#F4C2C8","#FFFFFF","#7D9D8B"] }); sound.chime(); buzz([100,60,100,60,200]);
  }
}, [now]);
```

---

## 9. Supabase backend

Create the project, then **Authentication → Users → Add user** (tick *Auto Confirm*) twice, and **Authentication → Providers → Email → turn off "Allow new users to sign up"**. Copy both user UUIDs. If an `extension` line errors, enable it in *Database → Extensions*.

### 9.1 `supabase/migrations/0001_init.sql`

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ── identity ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('captain','her')),
  display_name text
);
create or replace function public.is_member() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid()) $$;
create or replace function public.is_captain() returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'captain') $$;
alter table public.profiles enable row level security;
create policy "members read profiles" on public.profiles for select to authenticated using (public.is_member());

-- after creating the two auth users, run (with real UUIDs):
-- insert into public.profiles values ('<captain-uuid>','captain','Captain'), ('<her-uuid>','her','Her');

-- ── morning note + polaroid ──────────────────────────────
create table public.daily_notes (
  date date primary key, body text, caption text, polaroid_path text, updated_at timestamptz not null default now()
);
alter table public.daily_notes enable row level security;
create policy "members read notes" on public.daily_notes for select to authenticated using (public.is_member());
create policy "captain writes notes" on public.daily_notes for all to authenticated using (public.is_captain()) with check (public.is_captain());

-- ── time-locked capsules (REAL server-side lock) ─────────
create table public.capsules (
  id uuid primary key default gen_random_uuid(),
  title text not null, body text, media_path text,
  unlock_at timestamptz not null, opened_at timestamptz, created_at timestamptz not null default now()
);
alter table public.capsules enable row level security;
create policy "captain manages capsules" on public.capsules for all to authenticated using (public.is_captain()) with check (public.is_captain());
-- she reads through a view that hides body/media until unlock time (view runs as owner, bypassing RLS on purpose)
create view public.capsules_for_her as
  select id, title, unlock_at, opened_at,
         case when unlock_at <= now() then body end as body,
         case when unlock_at <= now() then media_path end as media_path
  from public.capsules;
grant select on public.capsules_for_her to authenticated;
create or replace function public.open_capsule(p_id uuid) returns void language sql security definer set search_path = public as
$$ update public.capsules set opened_at = now() where id = p_id and unlock_at <= now() and opened_at is null and public.is_member() $$;
grant execute on function public.open_capsule(uuid) to authenticated;

-- ── coupons ──────────────────────────────────────────────
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  title text not null, emoji text default '🎟️', unlock_streak int not null, redeemed_at timestamptz, created_at timestamptz default now()
);
alter table public.coupons enable row level security;
create policy "members read coupons" on public.coupons for select to authenticated using (public.is_member());
create policy "captain writes coupons" on public.coupons for all to authenticated using (public.is_captain()) with check (public.is_captain());
create or replace function public.redeem_coupon(p_id uuid) returns void language sql security definer set search_path = public as
$$ update public.coupons set redeemed_at = now() where id = p_id and redeemed_at is null and public.is_member() $$;
grant execute on function public.redeem_coupon(uuid) to authenticated;

-- ── last-known status (fallback when presence is offline) ─
create table public.status (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  label text, emoji text, pomodoro boolean default false, updated_at timestamptz default now()
);
alter table public.status enable row level security;
create policy "members read status" on public.status for select to authenticated using (public.is_member());
create policy "own status insert" on public.status for insert to authenticated with check (user_id = auth.uid());
create policy "own status update" on public.status for update to authenticated using (user_id = auth.uid());

-- ── sanctuary chat ───────────────────────────────────────
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('text','polaroid','voice')),
  body text, media_path text, mime text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  viewed_at timestamptz
);
alter table public.chat_messages enable row level security;
create policy "members read chat" on public.chat_messages for select to authenticated using (public.is_member() and expires_at > now());
create policy "members send chat" on public.chat_messages for insert to authenticated with check (public.is_member() and sender = auth.uid());
-- no update/delete policies: only Edge Functions (service role) change rows after insert
alter publication supabase_realtime add table public.chat_messages;

-- ── storage ──────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('ephemeral','ephemeral',false), ('daily','daily',false) on conflict do nothing;
-- ephemeral: members may upload into their own folder; NOBODY can read (only the service role in consume-media)
create policy "ephemeral upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'ephemeral' and public.is_member() and (storage.foldername(name))[1] = auth.uid()::text);
-- daily (morning polaroid + capsule photos): members read, captain writes
create policy "daily read" on storage.objects for select to authenticated using (bucket_id = 'daily' and public.is_member());
create policy "daily captain write" on storage.objects for insert to authenticated with check (bucket_id = 'daily' and public.is_captain());
create policy "daily captain update" on storage.objects for update to authenticated using (bucket_id = 'daily' and public.is_captain());
create policy "daily captain delete" on storage.objects for delete to authenticated using (bucket_id = 'daily' and public.is_captain());

-- ── private realtime channels (broadcast + presence) ─────
create policy "room read"  on realtime.messages for select to authenticated using (public.is_member());
create policy "room write" on realtime.messages for insert to authenticated with check (public.is_member());
```

In **Project Settings → Realtime**, turn **off** "Allow public access" so only private (authorized) channels work.

### 9.2 Edge Functions

`supabase/functions/notify-sos/index.ts`

```ts
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers:cors });
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN"), chat = Deno.env.get("TELEGRAM_CHAT_ID");
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ chat_id:chat, text:"🆘 Komorebi: she tapped SOS. Open the app → /captain → Sanctuary chat." }),
  });
  return new Response(JSON.stringify({ ok:true }), { headers:{ ...cors, "Content-Type":"application/json" } });
});
```

`supabase/functions/consume-media/index.ts` (**view-once, server-enforced**)

```ts
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers:cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global:{ headers:{ Authorization:req.headers.get("Authorization")! } } });
  const { data:{ user } } = await asUser.auth.getUser();
  if (!user) return new Response("unauthorized", { status:401, headers:cors });

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { messageId } = await req.json();
  const { data:msg } = await admin.from("chat_messages").select("*").eq("id", messageId).single();
  if (!msg || msg.sender === user.id || !msg.media_path) return new Response("gone", { status:410, headers:cors });  // sender can't consume their own; second view = gone

  const { data:file, error } = await admin.storage.from("ephemeral").download(msg.media_path);
  if (error || !file) return new Response("gone", { status:410, headers:cors });
  const bytes = await file.arrayBuffer();
  await admin.storage.from("ephemeral").remove([msg.media_path]);
  await admin.from("chat_messages").update({ media_path:null, viewed_at:new Date().toISOString() }).eq("id", messageId);
  return new Response(bytes, { headers:{ ...cors, "Content-Type":"application/octet-stream", "Cache-Control":"no-store" } });
});
```

`supabase/functions/cleanup/index.ts`

```ts
import { createClient } from "npm:@supabase/supabase-js@2";
Deno.serve(async (req) => {
  const mode = new URL(req.url).searchParams.get("mode") ?? "expired";   // "all" = midnight wipe
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let q = admin.from("chat_messages").select("id, media_path");
  if (mode !== "all") q = q.lt("expires_at", new Date().toISOString());
  const { data:rows } = await q;
  const paths = (rows ?? []).map(r => r.media_path).filter(Boolean) as string[];
  if (paths.length) await admin.storage.from("ephemeral").remove(paths);          // files must be removed via the Storage API, not SQL
  const ids = (rows ?? []).map(r => r.id);
  if (ids.length) await admin.from("chat_messages").delete().in("id", ids);
  return new Response(JSON.stringify({ removed:ids.length }), { headers:{ "Content-Type":"application/json" } });
});
```

Deploy:

```bash
npx supabase login && npx supabase link --project-ref <ref>
npx supabase db push                      # or paste 0001_init.sql into the SQL editor
npx supabase functions deploy notify-sos consume-media cleanup
npx supabase secrets set TELEGRAM_BOT_TOKEN=<token> TELEGRAM_CHAT_ID=<id>
```

**Telegram setup (2 min):** message `@BotFather` → `/newbot` → copy the token. Send any message to your new bot, then open `https://api.telegram.org/bot<token>/getUpdates` and copy `chat.id`.

### 9.3 Cron (midnight wipe + hourly expiry)

Store the service key once in Vault (SQL editor): `select vault.create_secret('<service_role_key>', 'service_role_key');` then:

```sql
-- 00:00 IST == 18:30 UTC
select cron.schedule('komorebi-midnight-wipe', '30 18 * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cleanup?mode=all',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='service_role_key')));
$$);
select cron.schedule('komorebi-hourly-expiry', '0 * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cleanup?mode=expired',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='service_role_key')));
$$);
```

---

## 10. LDR Sanctuary — client side

### 10.1 Supabase client + session

`lib/supabase.ts`

```ts
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
```

`useSession()` returns `{ ready, uid, role }` (read `profiles.role` for the signed-in user; subscribe with `supabase.auth.onAuthStateChange`).

**Important:** her dashboard (timetable, timers, sounds, growth) must **render and work without a session or network**. Only the LDR layer (`RoomProvider`, envelope, capsules, coupons, chat, SOS) mounts when `session` exists. First launch → a one-time friendly sign-in sheet in Settings (email + password, Chrome will save it). `/login` is for the captain; after login: role `captain` → `/captain`, role `her` → `/`. In `captain/page.tsx`, redirect anyone whose role isn't `captain`.

### 10.2 First-run consent (her privacy)

On first sign-in show a sheet: "He can see which block you're in and whether a Pomodoro is running. Nothing else." with a **Share my status** switch (`settings.shareStatus`). Keep a small always-visible chip on her dashboard: "👀 He can see: Studying Block 2". Toggle off → track `{ label:"Away 🌙" }` or untrack entirely.

### 10.3 Realtime room: presence + broadcast (`lib/room.ts`)

```ts
export type RoomEvents = {
  onWhisper?:(p:{ text:string })=>void; onDrop?:(p:{ emoji:string })=>void;
  onTouch?:(p:{ who:string; holding:boolean })=>void; onSos?:()=>void; onPresence?:(s:Record<string, any[]>)=>void;
};
export function joinRoom(role:"her"|"captain", h:RoomEvents) {
  const ch = supabase.channel("komorebi:room", { config:{ private:true, broadcast:{ self:false }, presence:{ key:role } } });
  ch.on("broadcast", { event:"whisper" }, ({ payload }) => h.onWhisper?.(payload))
    .on("broadcast", { event:"drop" },    ({ payload }) => h.onDrop?.(payload))
    .on("broadcast", { event:"touch" },   ({ payload }) => h.onTouch?.(payload))
    .on("broadcast", { event:"sos" },     () => h.onSos?.())
    .on("presence",  { event:"sync" },    () => h.onPresence?.(ch.presenceState()))
    .subscribe(s => { if (s === "SUBSCRIBED") ch.track({ role, label:"Online", ts:Date.now() }); });
  return ch;
}
export const send = (ch:RealtimeChannel, event:string, payload:object = {}) => ch.send({ type:"broadcast", event, payload });
```

Put the channel in a React context (`RoomProvider`) so any component can `send(room, "touch", …)`. `presenceState()` shape: `{ her:[{ label, emoji, pomodoro, … }], captain:[…] }`.

### 10.4 Live telemetry (her → captain)

```ts
export function statusLabel(nowMin:number, current:Block|null, pomoRunning:boolean, flexRunning:boolean) {
  if (pomoRunning) return { label:"Pomodoro active", emoji:"🍅" };
  if (current) return { label:current.title, emoji:current.emoji };
  if (nowMin < FLEX_END) return flexRunning ? { label:"Morning focus", emoji:"⏱️" } : { label:"Morning flex", emoji:"☀️" };
  return { label:"Day complete", emoji:"🌙" };
}
```

An effect watches `[label, pomodoro]` and (debounced 2 s, only if `shareStatus`) calls `room.track({ role:"her", label, emoji, pomodoro, ts })` **and** upserts `status` (`supabase.from("status").upsert({ label, emoji, pomodoro, updated_at:new Date().toISOString() })`, throttled to ≥30 s). The captain's `Live.tsx` shows presence if present, otherwise "Last seen 4:12 PM · Outside Walk 🌿" from `status`.

### 10.5 Morning Envelope + captain's note

- Captain `NoteEditor`: textarea (love note), optional caption, photo picker → `toSquareJpeg()` → upload to `daily/<date>/polaroid.jpg` (`upsert:true`) → `supabase.from("daily_notes").upsert({ date, body, caption, polaroid_path })`. Allow editing tomorrow's note too.
- Her `Envelope.tsx`: if `settings.seenEnvelope !== todayKey()` and a note exists → fullscreen sealed-envelope animation → tap to open → note text + **tap-to-flip Polaroid**:

```tsx
<motion.div onClick={() => setFlip(f => !f)} animate={{ rotateY: flip ? 180 : 0 }} transition={{ duration:.6 }} style={{ transformStyle:"preserve-3d" }}>
  <div style={{ backfaceVisibility:"hidden" }}>{/* front: photo in white polaroid frame */}</div>
  <div style={{ backfaceVisibility:"hidden", transform:"rotateY(180deg)" }}>{/* back: handwritten caption */}</div>
</motion.div>
```

- Photo URL: `supabase.storage.from("daily").createSignedUrl(path, 3600)`. Cache note text + last photo blob in localStorage/IndexedDB so reopening offline still works. Set `seenEnvelope` after opening; a small ✉️ button re-opens it anytime.
- Refetch on app open, on `visibilitychange`, and every 5 min.

`lib/media.ts`

```ts
export async function toSquareJpeg(file:Blob, size = 720, q = 0.8):Promise<Blob> {
  const bmp = await createImageBitmap(file), s = Math.min(bmp.width, bmp.height);
  const c = document.createElement("canvas"); c.width = c.height = size;
  c.getContext("2d")!.drawImage(bmp, (bmp.width - s)/2, (bmp.height - s)/2, s, s, 0, 0, size, size);
  return new Promise(r => c.toBlob(b => r(b!), "image/jpeg", q));
}
```

### 10.6 Time-locked capsules

- **Captain `CapsuleScheduler`:** title, message, optional photo, then either a date+time picker **or** "At the start of: [block] on [date]". Convert to a real instant (IST):

```ts
const unlockAt = new Date(`${date}T${String(Math.floor(min/60)).padStart(2,"0")}:${String(min%60).padStart(2,"0")}:00+05:30`).toISOString();
await supabase.from("capsules").insert({ title, body, media_path, unlock_at:unlockAt });
```

- **Her `Capsules.tsx`:** `supabase.from("capsules_for_her").select("*").order("unlock_at")` on open + every 60 s + `visibilitychange`. Locked → sealed envelope with live countdown (`unlock_at - now`). When `unlock_at <= now` and `opened_at` is null → pulsing "💌 A surprise is ready" → tap → `rpc("open_capsule", { p_id })` → show `body` (+ signed photo). The server genuinely withholds the content until unlock time.

### 10.7 Floating drops + Study Whispers (broadcast, zero DB)

```tsx
// captain Dispatcher: ["🤗","☕","🌸","💌","🍵"].map(e => <button onClick={() => send(room, "drop", { emoji:e })}>{e}</button>)
// whisper input: send(room, "whisper", { text })
```

Her side: `Drops.tsx` keeps an array `{ id, emoji, x }`; each renders

```tsx
<motion.div initial={{ y:"100vh", x:`${x}vw`, opacity:0 }}
  animate={{ y:"-20vh", x:[`${x}vw`, `${x+6}vw`, `${x-6}vw`, `${x}vw`], opacity:[0,1,1,0] }}
  transition={{ duration:5, ease:"easeOut" }} onAnimationComplete={() => remove(id)} className="fixed text-5xl pointer-events-none z-40">{emoji}</motion.div>
```

`Whisper.tsx`: top ribbon (`fixed top-3 inset-x-4 pointer-events-none z-40`, soft glow gradient `from-sage/0 via-sage/60 to-sage/0`), fades in, auto-dismiss with `setTimeout(5000)`, **no sound, no vibration, no notification, no storage**. If she's offline the whisper is simply lost (by design).

### 10.8 SOS Sanctuary Chat

**SOS button:** small discreet 🫶 icon in the header. Tap → confirm sheet ("Call him in?") to prevent accidental taps → on confirm:

```ts
await Promise.allSettled([ supabase.functions.invoke("notify-sos"), send(room, "sos") ]);
openChat();
```

Captain portal: `onSos` shows a persistent banner "🆘 She needs you" + "Open chat" (and he also gets the Telegram ping).

**Chat (`Chat.tsx`, shared modal):**

- Load: `supabase.from("chat_messages").select("*").order("created_at")`.
- Live: 

```ts
supabase.channel("chat").on("postgres_changes", { event:"*", schema:"public", table:"chat_messages" }, p => {
  if (p.eventType === "INSERT") add(p.new); if (p.eventType === "UPDATE") patch(p.new); if (p.eventType === "DELETE") remove(p.old.id);
}).subscribe();
```

(The midnight wipe arrives as DELETE events → the thread empties live. Show a "fresh slate ✨" empty state.)

- **Text:** `insert({ kind:"text", body })`. Bubbles: mine right/sage, theirs left/paper.
- **Polaroid selfie:** `<input type="file" accept="image/*" capture="user" hidden>` (opens the front camera on Android without any getUserMedia code) → `toSquareJpeg` → send:

```ts
async function sendMedia(kind:"polaroid"|"voice", blob:Blob, mime:string) {
  const uid = (await supabase.auth.getUser()).data.user!.id, path = `${uid}/${crypto.randomUUID()}`;
  const { error } = await supabase.storage.from("ephemeral").upload(path, blob, { contentType:mime }); if (error) throw error;
  await supabase.from("chat_messages").insert({ kind, media_path:path, mime });
}
```

- **Receiving a Polaroid:** shows a sealed "📸 Tap to develop" card. On tap:

```ts
const { data, error } = await supabase.functions.invoke("consume-media", { body:{ messageId:m.id } });
if (error || !(data instanceof Blob)) return markGone(m.id);
const url = URL.createObjectURL(new Blob([data], { type:m.mime }));
// show in a retro white frame; "developing" animation: <motion.img initial={{ filter:"brightness(0) sepia(1)", opacity:.2 }} animate={{ filter:"brightness(1) sepia(0)", opacity:1 }} transition={{ duration:3 }} />
// on close (or after 20 s): URL.revokeObjectURL(url); then bubble becomes "✨ vanished"
```

  The sender sees "Sent · waiting" → "Opened" (via the `viewed_at` UPDATE event). Copy to use: *"Polaroids vanish after they're opened"* — nothing about screenshots.

- **Voice notes:** hold-to-record with pointer events:

```ts
const mime = ["audio/webm;codecs=opus", "audio/mp4"].find(t => MediaRecorder.isTypeSupported(t))!;
const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
const rec = new MediaRecorder(stream, { mimeType:mime }), chunks:Blob[] = [];
rec.ondataavailable = e => chunks.push(e.data);
rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); sendMedia("voice", new Blob(chunks, { type:mime }), mime); };
rec.start(); /* auto-stop at 60 s; release → rec.stop() */
```

  Play-once: `consume-media` → `new Audio(URL.createObjectURL(blob)).play()`; on `ended` → revoke + mark "played".
- **Text expiry banner:** "Messages clear every night at midnight 🌙".

### 10.9 (Optional) real end-to-end text encryption

Shared passphrase (set once on both phones, stored in localStorage, never sent): derive a key with PBKDF2 and AES-GCM encrypt `body` before insert / decrypt after read.

```ts
const enc = new TextEncoder(), dec = new TextDecoder();
async function key(pass:string) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name:"PBKDF2", salt:enc.encode("komorebi-v1"), iterations:150000, hash:"SHA-256" }, base, { name:"AES-GCM", length:256 }, false, ["encrypt","decrypt"]);
}
export async function encrypt(pass:string, text:string) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name:"AES-GCM", iv }, await key(pass), enc.encode(text))); return btoa(String.fromCharCode(...iv, ...ct)); }
export async function decrypt(pass:string, b64:string) { const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); return dec.decode(await crypto.subtle.decrypt({ name:"AES-GCM", iv:raw.slice(0,12) }, await key(pass), raw.slice(12))); }
```

Skip this unless there's time; if you skip it, keep the "private & auto-deleting" wording.

### 10.10 Sync Touch (haptic orb)

```tsx
export default function SyncOrb({ me }:{ me:"her"|"captain" }) {
  const room = useRoom(); const [mine, setMine] = useState(false), [theirs, setTheirs] = useState(false);
  const lastSeen = useRef(0);
  useEffect(() => { room.onTouch = ({ who, holding }) => { if (who !== me) { setTheirs(holding); lastSeen.current = Date.now(); } }; }, []);
  useEffect(() => {                                   // heartbeat + stale guard
    const id = setInterval(() => {
      if (mine) send(room, "touch", { who:me, holding:true });
      if (theirs && Date.now() - lastSeen.current > 2500) setTheirs(false);
    }, 1000);
    return () => clearInterval(id);
  }, [mine, theirs]);
  const both = mine && theirs;
  useEffect(() => {
    if (!both) return; buzz([40, 60, 40]); const id = setInterval(() => buzz([40, 60, 40]), 900); return () => { clearInterval(id); navigator.vibrate?.(0); };
  }, [both]);
  const set = (v:boolean) => { setMine(v); send(room, "touch", { who:me, holding:v }); };
  return (
    <motion.div onPointerDown={() => set(true)} onPointerUp={() => set(false)} onPointerCancel={() => set(false)} onContextMenu={e => e.preventDefault()}
      animate={{ scale: both ? [1,1.12,1] : mine ? 1.05 : 1 }} transition={{ duration:both ? .9 : .2, repeat:both ? Infinity : 0 }}
      className={`size-40 rounded-full select-none touch-none ${both ? "bg-sakura shadow-[0_0_60px_rgba(244,194,200,.8)]" : "bg-matcha/60 shadow-aura"}`} />
  );
}
```

Also release the hold on `visibilitychange` (hidden). Text under the orb: "Hold together — he's here 🌿" / "Waiting for him…". Both phones need the app open in the foreground; `navigator.vibrate` needs a prior tap (the hold is one). Broadcast latency is typically well under 100 ms.

### 10.11 Captain portal (`/captain`) — assembly

Sections in order: **Live status** (presence/last seen) · **SOS banner** (when active) · **Morning note** editor · **Dispatcher** (drops + whisper) · **Capsules** (create + list with opened/pending) · **Coupons** (create, see redeemed) · **Sanctuary chat** button · **Sync orb**. Mobile-first single column; bookmark `https://<app>/captain` and "Add to Home screen" on his phone too.

---

## 11. PWA

### 11.1 `app/manifest.ts`

```ts
import type { MetadataRoute } from "next";
export default function manifest():MetadataRoute.Manifest {
  return {
    name:"Komorebi 木漏れ日", short_name:"Komorebi", start_url:"/", scope:"/", display:"standalone", orientation:"any",
    background_color:"#FDFBF7", theme_color:"#7D9D8B",
    icons:[ { src:"/icons/icon-192.png", sizes:"192x192", type:"image/png" }, { src:"/icons/icon-512.png", sizes:"512x512", type:"image/png" },
            { src:"/icons/maskable-512.png", sizes:"512x512", type:"image/png", purpose:"maskable" } ],
  };
}
```

Make icons from a simple sage-leaf glyph on cream (any generator; keep the maskable icon's art inside the centre 80%).

### 11.2 `public/sw.js`

```js
const V = "komorebi-v1";
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(["/"]))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;     // Supabase calls pass straight through
  if (r.url.includes("/_next/static/")) {                                                                // hashed assets: cache-first
    e.respondWith(caches.match(r).then(h => h || fetch(r).then(res => { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); return res; }))); return;
  }
  e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); return res; })   // everything else: network-first
    .catch(() => caches.match(r).then(h => h || caches.match("/"))));
});
```

### 11.3 Register + headers

In a client component: `useEffect(() => { if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js"); }, [])`.

`next.config.ts`: add `async headers() { return [{ source:"/sw.js", headers:[{ key:"Cache-Control", value:"no-cache" }] }]; }`.

Show a small "offline" pill when `navigator.onLine === false` (listen to `online`/`offline`). Timetable, timers, sounds and growth all run from localStorage + cache.

### 11.4 (Optional) Web Push for her

Only if time allows: generate VAPID keys (`npx web-push generate-vapid-keys`), table `push_subscriptions(user_id, sub jsonb)`, `Notification.requestPermission()` + `registration.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey })`, a `push` handler in `sw.js` calling `showNotification`, and an Edge Function (`npm:web-push`) invoked when the captain sends a chat message while she's offline. Skip if short on time; SOS → Telegram already covers the critical path.

---

## 12. Build order & definition of done

**Sprint 0 — Skeleton (do today)**
- Scaffold, Tailwind v3, fonts, theme + dark toggle, `Providers`, store, `time.ts`, `schedule.ts`.
- Supabase project, run migration, create the 2 users + profiles, deploy empty app to Vercel, **she installs it on her Poco**.
- ✅ Done when: the app opens full-screen from her home screen and shows the IST clock.

**Sprint 1 — Foundation & timetable**
- Morning Flex Bank (slider, stopwatch, quick-log, ring, 3 PM auto-stop).
- Hero widget, Timeline River, block states, scroll-to-active, Done ✓, Quick Bump, Low Energy.
- Schedule editor (drag-drop, durations, custom blocks). Streak + `GoalWatcher` + confetti.
- ✅ Done when: kill and reopen Chrome mid-day and every timer/progress value is still correct; airplane mode still works.

**Sprint 2 — Focus & ambient**
- Pomodoro (presets, auto-link, break), `PomodoroEngine`, Zen mode + Wake Lock, Desk Clock, 20-20-20, Brain Dump.
- `audio.ts` soundscapes + chime, `SoundPanel`, haptics helper.
- ✅ Done when: a 25-minute Pomodoro ends with a chime and credits the right block even if the app was backgrounded for a while.

**Sprint 3 — LDR bridge & captain portal**
- Auth + session hook, first-run consent sheet, `RoomProvider`, telemetry (presence + `status`).
- Captain portal: live status, note editor + polaroid upload, dispatcher (drops + whispers), capsules, coupons.
- Her side: Morning Envelope + flip Polaroid, Capsules, Coupons, Drops, Whisper ribbon.
- ✅ Done when: he edits tomorrow's note on his phone and she sees it on hers; a capsule set for 2 minutes ahead stays hidden, then opens.

**Sprint 4 — Sanctuary & delight**
- Edge functions + cron, SOS button + Telegram alert, Chat (text, polaroid, voice, view-once), Sync Orb.
- Bonsai, Heatmap, Reflection + WhatsApp share + story card. Optional: E2EE text, Web Push.
- ✅ Done when: SOS pings his Telegram within seconds; a Polaroid can be opened exactly once; both holding the orb makes both phones buzz.

---

## 13. Poco / Android checklist

**Setup for her phone (send her this):**
1. Open the site in **Chrome** (not Mi Browser) → ⋮ menu → **Install app** / Add to Home screen.
2. Settings → Apps → Manage apps → **Chrome** → Battery saver → **No restrictions**; turn **Autostart** on.
3. Allow **Notifications**, **Microphone**, **Camera** when asked. Turn on **Auto-rotate** (for the Desk Clock).
4. Optional: lock the app in the Recents screen so MIUI/HyperOS doesn't kill it.

**Test list (on the real phone, before calling a sprint done):**
- [ ] Airplane mode: app loads, timer/timetable work, sounds play.
- [ ] Start a Pomodoro, lock the screen for 5 min, unlock: remaining time is correct and the phase completed properly.
- [ ] Rain/Lofi/Forest/White start from a tap; chime plays; Zen keeps the screen on.
- [ ] Landscape shows the Desk Clock; portrait returns to the dashboard.
- [ ] `navigator.vibrate` works (Sync Orb + goal celebration).
- [ ] Selfie capture (front camera), voice recording (mic permission), Polaroid opens once, second open shows "vanished".
- [ ] Midnight IST: chat empties; her local data is untouched.
- [ ] Timezone safety: change phone timezone → schedule still follows IST.

---

## 14. Deploy & security checklist

- **Vercel:** import the repo (set Root Directory to `projects/komorebi` if it's a monorepo), add the three `NEXT_PUBLIC_*` env vars, deploy.
- **Supabase → Auth → URL Configuration:** set Site URL to the Vercel domain.
- Sign-ups disabled; both users have strong passwords; the captain account is never shared.
- RLS is enabled on every table (the migration does this); `ephemeral` bucket has **no** select policy.
- The **service-role key lives only** in Vault and Edge Function env — never in the client or git. `.env.local` is gitignored.
- Realtime "Allow public access" is off; channel `komorebi:room` is `private: true`.
- In the UI copy, promise only what's true: "private", "auto-deleting", "vanishes after it's opened".

---

## Appendix — `AGENTS.md` for your coding agent

```md
# Komorebi
Next.js 16 App Router, React 19, TypeScript, Tailwind v3, Framer Motion, Zustand (persist), Supabase (Auth, Realtime, Storage, Edge Functions).
- Read docs/IMPLEMENTATION.md and the product spec before changing behaviour. Section numbers there are the source of truth.
- All schedule logic uses IST via lib/time.ts. Never use the device timezone for schedule math.
- Timers store absolute timestamps (endAt / flexRunningSince). Never count ticks.
- The dashboard must work offline from localStorage. LDR features may require network but must fail quietly.
- Mobile-first (Poco Android, Chrome). Tap targets ≥ 44px. No hover-only UI.
- Never expose the Supabase service key to the client. All tables have RLS; keep it that way.
- Palette tokens: sage, matcha, cream, paper, mocha, obsidian, sakura. Rounded-2xl cards. Serif headings.
- Commands: `npm run dev`, `npm run build`, `npx supabase db push`, `npx supabase functions deploy <name>`.
```
