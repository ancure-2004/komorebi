"use client";

import { useState } from "react";
import { Sun, Moon, Clock, Sparkles } from "lucide-react";
import type { Block, BlockKind } from "@/lib/schedule";
import { FLEX_END } from "@/lib/schedule";
import { dayBlocks } from "@/lib/stats";
import { fmtClock, fmtHM, minutesIST, todayKey } from "@/lib/time";
import { useNow } from "@/lib/hooks";
import { EMPTY_DAY, useApp } from "@/lib/store";

export interface SunburstProps {
  blocks?: Block[];
  date?: string;
  onSelectBlock?: (block: Block) => void;
  className?: string;
}

const KIND_COLORS: Record<BlockKind, { fill: string; label: string }> = {
  study: { fill: "#7D9D8B", label: "Study" },
  walk: { fill: "#4E876A", label: "Walk" },
  meal: { fill: "#D4A373", label: "Meal" },
  relax: { fill: "#F4C2C8", label: "Relax" },
  wrap: { fill: "#98B2A0", label: "Wrap-Up" },
  reflect: { fill: "#9A8C98", label: "Reflect" },
  custom: { fill: "#B0B0A8", label: "Custom" },
};

// Converts polar coordinates (deg with 0 at 12 o'clock / top) to Cartesian coordinates
const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

// Generates an SVG annular sector arc path between angle a0 and a1 (in degrees)
const arc = (
  cx: number,
  cy: number,
  ro: number,
  ri: number,
  a0: number,
  a1: number
): string => {
  // Guard against degenerate angles
  if (Math.abs(a1 - a0) < 0.001) return "";
  const startDeg = a0;
  const endDeg = Math.min(a1, a0 + 359.99); // Prevent full circle overlap break

  const [x0, y0] = polar(cx, cy, ro, startDeg);
  const [x1, y1] = polar(cx, cy, ro, endDeg);
  const [x2, y2] = polar(cx, cy, ri, endDeg);
  const [x3, y3] = polar(cx, cy, ri, startDeg);

  const largeArcFlag = endDeg - startDeg > 180 ? 1 : 0;
  return `M${x0} ${y0} A${ro} ${ro} 0 ${largeArcFlag} 1 ${x1} ${y1} L${x2} ${y2} A${ri} ${ri} 0 ${largeArcFlag} 0 ${x3} ${y3} Z`;
};

// Converts minute of day (0-1440) to degrees (0-360)
const minToDeg = (min: number): number => ((min % 1440) / 1440) * 360;

export default function Sunburst({
  blocks: propBlocks,
  date: propDate,
  onSelectBlock,
  className = "",
}: SunburstProps) {
  const currentDate = propDate ?? todayKey();
  const rawDay = useApp((s) => s.days[currentDate]);
  const day = rawDay ?? EMPTY_DAY;
  const template = useApp((s) => s.template);

  const now = useNow(1000);
  const nowMin = minutesIST(now, true);
  const activeMinInt = Math.floor(nowMin);

  // Active blocks
  const effectiveBlocks = propBlocks ?? dayBlocks(day, template);
  const sortedBlocks = [...effectiveBlocks].sort((a, b) => a.start - b.start);

  // State for hovered / tapped block segment inspection
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const selectedBlock = sortedBlocks.find((b) => b.id === selectedBlockId);

  // Morning flex calculation
  const bankedMs =
    day.flexLoggedMs +
    (day.flexRunningSince ? Math.max(0, now - day.flexRunningSince) : 0);
  const flexGoalMs = day.flexGoalMin * 60000;
  const flexPct = flexGoalMs > 0 ? Math.min(1, bankedMs / flexGoalMs) : 0;

  // Geometry constants
  const CX = 150;
  const CY = 150;
  const R_OUTER = 130;
  const R_INNER = 94;
  const R_HAND = 135;

  // 24h clock hand coordinates
  const nowDeg = minToDeg(nowMin);
  const [hx, hy] = polar(CX, CY, R_HAND, nowDeg);
  const [hxInner, hyInner] = polar(CX, CY, R_INNER - 6, nowDeg);

  // Day/Night indicator
  const currentHour = Math.floor(nowMin / 60);
  const isDaytime = currentHour >= 6 && currentHour < 18;

  const handleBlockClick = (block: Block) => {
    setSelectedBlockId((prev) => (prev === block.id ? null : block.id));
    if (onSelectBlock) {
      onSelectBlock(block);
    }
  };

  return (
    <section
      aria-label="24-hour Sunburst Daylight View"
      className={`rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-4 sm:p-5 shadow-sm transition-colors ${className}`}
    >
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-[#EBE7DF] dark:border-[#383530]">
        <div>
          <h2 className="text-base font-serif font-semibold text-ink dark:text-cream">
            24h Daylight Sunburst
          </h2>
          <p className="text-xs font-sans text-ink/60 dark:text-cream/60">
            Circular daylight timetable (0-1440 min)
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-sans font-medium text-ink/75 dark:text-cream/75">
          <Clock className="w-3.5 h-3.5 text-sage" />
          <span className="tabular-nums">{fmtClock(activeMinInt)} IST</span>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative py-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-[280px] sm:max-w-[310px] aspect-square relative">
          <svg
            viewBox="0 0 300 300"
            className="w-full h-full select-none"
            aria-hidden="true"
          >
            {/* Background 24h Track Dial */}
            <circle
              cx={CX}
              cy={CY}
              r={R_OUTER}
              fill="none"
              strokeWidth={R_OUTER - R_INNER}
              className="stroke-sage/10 dark:stroke-obsidian/40"
            />

            {/* Morning Flex Bank Base Track (0 min to 900 min / 12 AM to 3 PM) */}
            <path
              d={arc(CX, CY, R_OUTER, R_INNER, 0, minToDeg(FLEX_END))}
              className="fill-matcha/15 dark:fill-matcha/10"
            />

            {/* Morning Flex Bank Achieved Progress Fill */}
            {flexPct > 0 && (
              <path
                d={arc(
                  CX,
                  CY,
                  R_OUTER,
                  R_INNER,
                  0,
                  minToDeg(FLEX_END) * flexPct
                )}
                className="fill-sage/60 dark:fill-sage/50"
              />
            )}

            {/* Evening Schedule Block Segments */}
            {sortedBlocks.map((b) => {
              const a0 = minToDeg(b.start);
              const a1 = minToDeg(b.start + b.duration);
              const isSelected = selectedBlockId === b.id;
              const isActive = nowMin >= b.start && nowMin < b.start + b.duration;
              const color = KIND_COLORS[b.kind]?.fill ?? KIND_COLORS.custom.fill;

              const ro = isSelected ? R_OUTER + 4 : R_OUTER;
              const ri = isSelected ? R_INNER - 3 : R_INNER;

              return (
                <path
                  key={b.id}
                  d={arc(CX, CY, ro, ri, a0, a1)}
                  fill={color}
                  opacity={isActive ? 1 : isSelected ? 0.95 : 0.8}
                  stroke={isActive ? "#FDFBF7" : "#1F1E1B"}
                  strokeWidth={isActive ? 2 : 1}
                  className="cursor-pointer transition-all duration-150 hover:opacity-100"
                  onClick={() => handleBlockClick(b)}
                />
              );
            })}

            {/* Major 6-hour Clock Ticks & Labels: 12 AM (top), 6 AM (right), 12 PM (bottom), 6 PM (left) */}
            <text
              x={CX}
              y={CY - R_OUTER - 6}
              textAnchor="middle"
              className="text-[10px] font-sans font-semibold fill-ink/60 dark:fill-cream/60"
            >
              12 AM
            </text>
            <text
              x={CX + R_OUTER + 16}
              y={CY + 3}
              textAnchor="middle"
              className="text-[10px] font-sans font-semibold fill-ink/60 dark:fill-cream/60"
            >
              6 AM
            </text>
            <text
              x={CX}
              y={CY + R_OUTER + 14}
              textAnchor="middle"
              className="text-[10px] font-sans font-semibold fill-ink/60 dark:fill-cream/60"
            >
              12 PM
            </text>
            <text
              x={CX - R_OUTER - 16}
              y={CY + 3}
              textAnchor="middle"
              className="text-[10px] font-sans font-semibold fill-ink/60 dark:fill-cream/60"
            >
              6 PM
            </text>

            {/* 3:00 PM Divider line */}
            {(() => {
              const deg3pm = minToDeg(FLEX_END);
              const [p0x, p0y] = polar(CX, CY, R_INNER - 2, deg3pm);
              const [p1x, p1y] = polar(CX, CY, R_OUTER + 2, deg3pm);
              return (
                <line
                  x1={p0x}
                  y1={p0y}
                  x2={p1x}
                  y2={p1y}
                  stroke="#3A3833"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                  opacity="0.4"
                />
              );
            })()}

            {/* Current Time ("Now") Hand Needle */}
            <line
              x1={hxInner}
              y1={hyInner}
              x2={hx}
              y2={hy}
              stroke="#7D9D8B"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Needle Pointer Head */}
            <circle cx={hx} cy={hy} r="4" fill="#7D9D8B" stroke="#FDFBF7" strokeWidth="1.5" />
          </svg>

          {/* Center Info Hub */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
            {selectedBlock ? (
              <div className="space-y-0.5 animate-fadeIn">
                <span className="text-xl leading-none" aria-hidden="true">
                  {selectedBlock.emoji}
                </span>
                <p className="text-xs font-serif font-semibold text-ink dark:text-cream truncate max-w-[110px]">
                  {selectedBlock.title}
                </p>
                <p className="text-[10px] font-sans text-ink/60 dark:text-cream/60 tabular-nums">
                  {fmtClock(selectedBlock.start)} - {fmtClock(selectedBlock.start + selectedBlock.duration)}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {isDaytime ? (
                  <Sun className="w-5 h-5 text-sage mx-auto" />
                ) : (
                  <Moon className="w-5 h-5 text-sakura mx-auto" />
                )}
                <div className="text-sm font-sans font-bold text-ink dark:text-cream tabular-nums">
                  {fmtClock(activeMinInt)}
                </div>
                <div className="text-[10px] font-sans font-medium text-ink/50 dark:text-cream/50">
                  {nowMin < FLEX_END ? "Morning Flex" : "Evening Flow"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Segment Legend */}
      <div className="pt-3 border-t border-[#EBE7DF] dark:border-[#383530]">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] font-sans text-ink/70 dark:text-cream/70">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "#7D9D8B" }}
            />
            <span>Study</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "#4E876A" }}
            />
            <span>Walk</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "#D4A373" }}
            />
            <span>Meal</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "#F4C2C8" }}
            />
            <span>Relax</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "#98B2A0" }}
            />
            <span>Wrap-Up</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: "#9A8C98" }}
            />
            <span>Reflect</span>
          </div>
        </div>
      </div>
    </section>
  );
}
