"use client";

import React from "react";
import { CloudRain, Coffee, Trees, Wind, Volume2, VolumeX, Volume1 } from "lucide-react";
import { useApp, Ambience } from "@/lib/store";
import { sound } from "@/lib/audio";
import { haptics } from "@/lib/haptics";

export interface SoundPanelProps {
  compact?: boolean;
  className?: string;
}

interface SoundscapeOption {
  kind: Ambience | null;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SOUNDSCAPES: SoundscapeOption[] = [
  {
    kind: "rain",
    label: "Rain",
    sublabel: "Glass droplets",
    icon: CloudRain,
  },
  {
    kind: "lofi",
    label: "Lofi",
    sublabel: "Warm chords",
    icon: Coffee,
  },
  {
    kind: "forest",
    label: "Forest",
    sublabel: "Breeze & birds",
    icon: Trees,
  },
  {
    kind: "white",
    label: "White",
    sublabel: "Static calm",
    icon: Wind,
  },
  {
    kind: null,
    label: "Off",
    sublabel: "Silence",
    icon: VolumeX,
  },
];

export default function SoundPanel({ compact = false, className = "" }: SoundPanelProps) {
  const currentSound = useApp((s) => s.settings.sound);
  const updateSettings = useApp((s) => s.updateSettings);

  const activeKind = currentSound.kind;
  const volume = currentSound.volume ?? 0.5;

  const handleSelectSoundscape = (kind: Ambience | null) => {
    haptics.light();
    if (kind === null) {
      sound.stop();
      updateSettings((s) => ({
        ...s,
        sound: { ...s.sound, kind: null },
      }));
    } else {
      sound.start(kind);
      updateSettings((s) => ({
        ...s,
        sound: { ...s.sound, kind },
      }));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    sound.setVolume(val);
    updateSettings((s) => ({
      ...s,
      sound: { ...s.sound, volume: val },
    }));
  };

  const VolumeIcon = volume === 0 || activeKind === null ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={`rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-4 sm:p-5 shadow-sm transition-colors ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sage/15 dark:bg-sage/25 text-[#2D5A43] dark:text-matcha flex items-center justify-center">
            <VolumeIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-base font-semibold text-ink dark:text-cream leading-tight">
              Ambient Soundscapes
            </h3>
            <p className="text-[11px] text-ink/65 dark:text-cream/65">
              100% offline Web Audio synthesizer
            </p>
          </div>
        </div>

        {activeKind && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-sage/15 text-[#2D5A43] dark:bg-sage/25 dark:text-matcha">
            <span className="w-1.5 h-1.5 rounded-full bg-sage animate-ping" />
            Playing
          </span>
        )}
      </div>

      {/* Soundscape Options Grid */}
      <div className={`grid gap-2 mb-4 ${compact ? "grid-cols-5" : "grid-cols-2 sm:grid-cols-5"}`}>
        {SOUNDSCAPES.map((item) => {
          const Icon = item.icon;
          const isSelected = activeKind === item.kind;

          return (
            <button
              type="button"
              key={item.label}
              onClick={() => handleSelectSoundscape(item.kind)}
              aria-label={`Soundscape: ${item.label}`}
              className={`min-h-[44px] p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all active:scale-95 focus:ring-2 focus:ring-sage focus:outline-none ${
                isSelected
                  ? "bg-sage text-cream border-sage shadow-sm"
                  : "bg-paper dark:bg-obsidian border-[#EBE7DF] dark:border-[#383530] text-ink dark:text-cream hover:bg-sage/10"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-semibold leading-tight">
                {item.label}
              </span>
              {!compact && (
                <span
                  className={`text-[10px] leading-tight ${
                    isSelected ? "text-cream/80" : "text-ink/50 dark:text-cream/50"
                  }`}
                >
                  {item.sublabel}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Volume Slider Section */}
      <div className="pt-2 border-t border-[#EBE7DF] dark:border-[#383530] flex items-center gap-3">
        <VolumeIcon className="w-4 h-4 text-ink/60 dark:text-cream/60 shrink-0" />

        <div className="flex-1 flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={activeKind === null ? 0 : volume}
            onChange={handleVolumeChange}
            disabled={activeKind === null}
            aria-label="Soundscape Volume"
            className="w-full h-2 rounded-lg bg-sage/20 dark:bg-obsidian accent-sage cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:ring-2 focus:ring-sage focus:outline-none"
          />
        </div>

        <span className="font-sans text-xs font-semibold tabular-nums text-ink/75 dark:text-cream/75 w-10 text-right">
          {activeKind === null ? "0%" : `${Math.round(volume * 100)}%`}
        </span>
      </div>
    </div>
  );
}
