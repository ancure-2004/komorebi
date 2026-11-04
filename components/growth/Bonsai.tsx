"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/lib/store";
import { todayKey } from "@/lib/time";
import { useHydrated } from "@/lib/hooks";
import { Sparkles, Sprout } from "lucide-react";

export interface BonsaiProps {
  /** Explicit number of leaves (0 to 24). If omitted, calculated from doneBlocks, pomodoros, and flexMinutes or the global store. */
  leaves?: number;
  /** Whether the bonsai has blossomed into cherry blossoms. Defaults to today's goalMet status if omitted. */
  bloom?: boolean;
  /** Number of finished schedule blocks (each adds 4 leaves). */
  doneBlocks?: number;
  /** Number of completed Pomodoro sessions (each adds 1 leaf). */
  pomodoros?: number;
  /** Number of morning flex study minutes logged (every 30 min adds 2 leaves). */
  flexMinutes?: number;
  /** Whether to show a caption badge below the bonsai indicating leaf count and bloom status. */
  showLabel?: boolean;
  /** Optional custom CSS classes for the container. */
  className?: string;
}

// 24 coordinate anchors for leaf nodes across main trunk and lateral boughs
const LEAF_COORDINATES: [number, number][] = [
  [100, 48],
  [88, 56],
  [112, 56],
  [100, 66],
  [76, 66],
  [124, 66],
  [88, 76],
  [112, 78],
  [64, 80],
  [138, 60],
  [148, 74],
  [126, 86],
  [54, 94],
  [72, 94],
  [86, 98],
  [40, 102],
  [134, 96],
  [150, 90],
  [60, 108],
  [116, 98],
  [96, 88],
  [30, 92],
  [160, 80],
  [104, 110],
];

// Falling sakura petal definitions for the full-bloom state
interface PetalConfig {
  id: number;
  startX: number;
  driftX: number;
  duration: number;
  delay: number;
  scale: number;
}

const FALLING_PETALS: PetalConfig[] = [
  { id: 1, startX: 45, driftX: -24, duration: 4.2, delay: 0.1, scale: 0.9 },
  { id: 2, startX: 95, driftX: 30, duration: 5.0, delay: 0.8, scale: 1.1 },
  { id: 3, startX: 135, driftX: -18, duration: 4.6, delay: 1.6, scale: 0.85 },
  { id: 4, startX: 70, driftX: 22, duration: 3.8, delay: 2.2, scale: 1.0 },
  { id: 5, startX: 110, driftX: -26, duration: 4.9, delay: 2.9, scale: 1.15 },
  { id: 6, startX: 55, driftX: 16, duration: 4.4, delay: 3.5, scale: 0.8 },
  { id: 7, startX: 145, driftX: -32, duration: 5.3, delay: 1.2, scale: 1.05 },
  { id: 8, startX: 85, driftX: 20, duration: 4.7, delay: 2.6, scale: 0.95 },
  { id: 9, startX: 125, driftX: -20, duration: 4.1, delay: 3.8, scale: 0.75 },
  { id: 10, startX: 100, driftX: 28, duration: 5.2, delay: 0.4, scale: 1.1 },
];

export function Bonsai({
  leaves,
  bloom,
  doneBlocks,
  pomodoros,
  flexMinutes,
  showLabel = true,
  className = "",
}: BonsaiProps) {
  const isHydrated = useHydrated();
  const today = todayKey();
  const dayState = useApp((s) => s.days[today]);

  // Determine active values: props take precedence, fallback to store
  const computedDoneBlocks = doneBlocks ?? (isHydrated && dayState ? dayState.doneBlockIds?.length ?? 0 : 0);
  const computedPomodoros = pomodoros ?? (isHydrated && dayState ? dayState.pomodoros ?? 0 : 0);
  const computedFlexMin =
    flexMinutes ??
    (isHydrated && dayState ? Math.floor((dayState.flexLoggedMs ?? 0) / 60000) : 0);

  const activeLeaves = useMemo(() => {
    if (typeof leaves === "number") {
      return Math.max(0, Math.min(LEAF_COORDINATES.length, leaves));
    }
    // Spec §8.1 formula: min(24, 4 * doneBlocks + pomodoros + 2 * floor(flexMin / 30))
    const calculated =
      4 * computedDoneBlocks +
      computedPomodoros +
      2 * Math.floor(computedFlexMin / 30);
    return Math.max(0, Math.min(LEAF_COORDINATES.length, calculated));
  }, [leaves, computedDoneBlocks, computedPomodoros, computedFlexMin]);

  const isBloomed = bloom ?? (isHydrated && dayState ? Boolean(dayState.goalMet) : false);

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      aria-label={`Komorebi Bonsai with ${activeLeaves} leaves${isBloomed ? ", in full cherry blossom" : ""}`}
    >
      {/* Falling Sakura Petals Overlay when goalMet is achieved */}
      <AnimatePresence>
        {isBloomed && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            {FALLING_PETALS.map((p) => (
              <motion.div
                key={p.id}
                className="absolute top-2 w-3 h-3 rounded-full bg-sakura/80 shadow-sm"
                style={{
                  left: `${p.startX}%`,
                  borderRadius: "70% 30% 60% 40% / 60% 40% 70% 30%",
                }}
                initial={{ y: -10, x: 0, rotate: 0, opacity: 0, scale: p.scale }}
                animate={{
                  y: [0, 220],
                  x: [0, p.driftX, -p.driftX / 2, p.driftX],
                  rotate: [0, 180, 360],
                  opacity: [0, 0.95, 0.95, 0],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* SVG Canvas for Bonsai */}
      <svg
        viewBox="0 0 200 230"
        className="w-48 sm:w-56 h-auto drop-shadow-sm transition-transform duration-300 hover:scale-[1.02]"
        role="img"
        aria-hidden="true"
      >
        <defs>
          {/* Subtle gradient for terracotta pot */}
          <linearGradient id="potGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#9C7355" />
            <stop offset="50%" stopColor="#B08968" />
            <stop offset="100%" stopColor="#8C6547" />
          </linearGradient>

          {/* Leaf gradient in growth mode */}
          <radialGradient id="leafGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#98B2A0" />
            <stop offset="100%" stopColor="#7D9D8B" />
          </radialGradient>

          {/* Sakura petal gradient in bloom mode */}
          <radialGradient id="bloomGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFF0F2" />
            <stop offset="50%" stopColor="#F4C2C8" />
            <stop offset="100%" stopColor="#E59CA5" />
          </radialGradient>

          {/* Soft soil gradient */}
          <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3F2F23" />
            <stop offset="100%" stopColor="#2E2219" />
          </linearGradient>
        </defs>

        {/* Ambient Ground Shadow */}
        <ellipse cx="100" cy="222" rx="44" ry="5" fill="#3A3833" fillOpacity="0.12" />

        {/* Terracotta / Ceramic Bonsai Pot */}
        {/* Pot Rim */}
        <rect x="62" y="196" width="76" height="6" rx="2" fill="url(#potGrad)" />
        {/* Pot Base Body */}
        <path d="M68 202 h64 l-9 20 h-46 z" fill="url(#potGrad)" />
        {/* Pot Bottom Stand Legs */}
        <rect x="74" y="222" width="10" height="2" rx="1" fill="#8C6547" />
        <rect x="116" y="222" width="10" height="2" rx="1" fill="#8C6547" />
        {/* Soil inside pot */}
        <ellipse cx="100" cy="198" rx="30" ry="3" fill="url(#soilGrad)" />

        {/* Trunk & Main Boughs */}
        {/* Main curved trunk */}
        <path
          d="M100 200 C100 160 85 140 95 110 C100 90 110 80 100 60"
          stroke="#6B4F3A"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
        {/* Left branch */}
        <path
          d="M96 125 C80 115 70 105 62 92"
          stroke="#6B4F3A"
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Right branch */}
        <path
          d="M102 100 C120 92 130 84 138 70"
          stroke="#6B4F3A"
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Small upper twig */}
        <path
          d="M97 78 C90 70 82 66 74 65"
          stroke="#6B4F3A"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* Sprouted Leaves / Sakura Blossoms */}
        {LEAF_COORDINATES.slice(0, activeLeaves).map(([x, y], i) => {
          return (
            <g key={`leaf-${i}`}>
              {isBloomed ? (
                // Sakura Blossom Shape: gentle petal cluster
                <motion.g
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: i * 0.03,
                  }}
                  transform={`translate(${x}, ${y})`}
                >
                  {/* Blossom petals */}
                  <circle cx="0" cy="-3.5" r="4.2" fill="url(#bloomGrad)" opacity="0.95" />
                  <circle cx="3.5" cy="0" r="4.2" fill="url(#bloomGrad)" opacity="0.95" />
                  <circle cx="0" cy="3.5" r="4.2" fill="url(#bloomGrad)" opacity="0.95" />
                  <circle cx="-3.5" cy="0" r="4.2" fill="url(#bloomGrad)" opacity="0.95" />
                  {/* Pistil center */}
                  <circle cx="0" cy="0" r="2.2" fill="#E88B97" />
                </motion.g>
              ) : (
                // Growth Leaf: aesthetic matcha/sage circle with gentle spring
                <motion.circle
                  cx={x}
                  cy={y}
                  r={8.5}
                  fill="url(#leafGrad)"
                  stroke="#5F7F6E"
                  strokeWidth="0.5"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 24,
                    delay: i * 0.035,
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Status Caption / Growth Metric Badge */}
      {showLabel && (
        <motion.div
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] text-xs font-medium text-ink dark:text-cream shadow-sm"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isBloomed ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-sakura animate-pulse" />
              <span>Full Blossom - Daily Target Met!</span>
            </>
          ) : (
            <>
              <Sprout className="w-3.5 h-3.5 text-sage" />
              <span>
                {activeLeaves} / {LEAF_COORDINATES.length} leaves sprouted
              </span>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default Bonsai;
