export type BlockKind = "study" | "walk" | "meal" | "relax" | "wrap" | "reflect" | "custom";

export interface Block {
  id: string;
  title: string;
  emoji: string;
  kind: BlockKind;
  start: number; // minutes since midnight IST (e.g. 900 = 3:00 PM)
  duration: number; // duration in minutes
}

export const DEFAULT_BLOCKS: Block[] = [
  { id: "s1", title: "Deep Focus Session 1", emoji: "📚", kind: "study", start: 900, duration: 120 },
  { id: "walk", title: "Outside Walk & Golden Hour", emoji: "🌿", kind: "walk", start: 1020, duration: 90 },
  { id: "s2", title: "Deep Focus Session 2", emoji: "📖", kind: "study", start: 1110, duration: 120 },
  { id: "dinner", title: "Dinner & Rest", emoji: "🍱", kind: "meal", start: 1230, duration: 30 },
  { id: "wrap", title: "Evening Study Wrap-Up", emoji: "✍️", kind: "wrap", start: 1260, duration: 60 },
  { id: "anime", title: "Anime Wind Down & Snack", emoji: "🍿", kind: "relax", start: 1320, duration: 60 },
  { id: "reflect", title: "Reflection & Sleep Prep", emoji: "🌙", kind: "reflect", start: 1380, duration: 30 },
];

export const FLEX_END = 900; // 3:00 PM in minutes since midnight

export const isStudy = (b: Block): boolean => b.kind === "study" || b.kind === "wrap";

/**
 * Re-packs blocks sequentially starting at the `from` minute,
 * ensuring no gaps or overlaps between them.
 */
export const repack = (blocks: Block[], from: number): Block[] => {
  let t = from;
  return blocks.map((b) => {
    const nb = { ...b, start: t };
    t += b.duration;
    return nb;
  });
};

/**
 * Locates current active block and next upcoming block given current IST minute.
 */
export function locate(blocks: Block[], nowMin: number): {
  sorted: Block[];
  current: Block | null;
  next: Block | null;
} {
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  const current = sorted.find((b) => nowMin >= b.start && nowMin < b.start + b.duration) ?? null;
  const next = sorted.find((b) => b.start > nowMin) ?? null;
  return { sorted, current, next };
}

/**
 * Quick Bump: current block runs `delta` minutes longer, everything after shifts accordingly.
 * Applied to TODAY's schedule only.
 */
export function bump(blocks: Block[], currentId: string, delta: number): Block[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start);
  const i = sorted.findIndex((b) => b.id === currentId);
  if (i < 0 || delta === 0) return blocks;

  return sorted.map((b, k) => {
    if (k < i) return b;
    if (k === i) return { ...b, duration: b.duration + delta };
    return { ...b, start: Math.min(b.start + delta, 1439 - b.duration) };
  });
}

/**
 * Low Energy: study + wrap halved (5h -> 2.5h); freed time goes half to the walk, half to relaxation.
 */
export function applyLowEnergy(blocks: Block[]): Block[] {
  if (blocks.length === 0) return [];
  const s = [...blocks].sort((a, b) => a.start - b.start);
  let freed = 0;

  const out = s.map((b) => {
    if (!isStudy(b)) return b;
    // Halve duration and round to nearest 5 minutes (min 15 min)
    const d = Math.max(15, Math.round(b.duration / 2 / 5) * 5);
    freed += b.duration - d;
    return { ...b, duration: d };
  });

  const half = Math.round(freed / 2 / 5) * 5;
  const w = out.map((b) => b.kind).lastIndexOf("walk");
  const r = out.map((b) => b.kind).lastIndexOf("relax");

  if (w >= 0) out[w] = { ...out[w], duration: out[w].duration + half };
  if (r >= 0) out[r] = { ...out[r], duration: out[r].duration + (freed - half) };

  return repack(out, out[0].start);
}
