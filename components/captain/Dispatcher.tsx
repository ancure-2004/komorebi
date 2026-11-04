"use client";

import React, { useState } from "react";
import { Send, Sparkles, Heart, Coffee } from "lucide-react";
import { useRoom } from "@/lib/room";
import { haptics } from "@/lib/haptics";

const QUICK_DROPS = [
  { emoji: "💧", label: "Hydrate" },
  { emoji: "🍵", label: "Matcha" },
  { emoji: "🫂", label: "Warm Hug" },
  { emoji: "🌸", label: "Proud of You" },
  { emoji: "🍱", label: "Eat Snack" },
  { emoji: "💆‍♀️", label: "Stretch" },
];

export interface DispatcherProps {
  className?: string;
}

export default function Dispatcher({ className = "" }: DispatcherProps) {
  const room = useRoom();
  const [whisperInput, setWhisperInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastSentText, setLastSentText] = useState<string | null>(null);

  const handleSendDrop = (emoji: string) => {
    haptics.light();
    room.send("drop", { emoji });
  };

  const handleSendWhisper = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = whisperInput.trim();
    if (!text || isSending) return;

    setIsSending(true);
    haptics.medium();

    try {
      await room.send("whisper", { text });
      setLastSentText(text);
      setWhisperInput("");
      setTimeout(() => setLastSentText(null), 4000);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`p-5 rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] space-y-4 shadow-sm ${className}`}>
      {/* Quick Drops Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sage" />
          <h3 className="font-serif text-base font-semibold text-ink dark:text-cream">
            Quick Drops & Study Whispers
          </h3>
        </div>
        <p className="text-xs text-ink/60 dark:text-cream/60 font-sans mt-0.5">
          Tap any drop to float an emoji onto her screen with zero sound or distraction.
        </p>
      </div>

      {/* Quick Drops Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {QUICK_DROPS.map((drop) => (
          <button
            key={drop.label}
            type="button"
            onClick={() => handleSendDrop(drop.emoji)}
            className="p-2.5 rounded-xl bg-cream dark:bg-mocha/60 border border-[#EBE7DF] dark:border-[#383530] hover:border-sage active:scale-95 transition-all flex flex-col items-center justify-center gap-1 min-h-[56px]"
          >
            <span className="text-2xl select-none">{drop.emoji}</span>
            <span className="text-[10px] font-sans text-ink/70 dark:text-cream/70 font-medium truncate w-full text-center">
              {drop.label}
            </span>
          </button>
        ))}
      </div>

      {/* Whisper Input Form */}
      <form onSubmit={handleSendWhisper} className="pt-2 border-t border-[#EBE7DF] dark:border-[#383530] space-y-2">
        <label className="text-xs font-semibold text-ink dark:text-cream block">
          Send Silent Study Whisper
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={whisperInput}
            onChange={(e) => setWhisperInput(e.target.value)}
            placeholder="e.g. You are doing so well today, my superstar..."
            className="flex-1 h-11 px-3.5 rounded-xl bg-cream dark:bg-mocha border border-[#EBE7DF] dark:border-[#383530] text-xs sm:text-sm text-ink dark:text-cream focus:outline-none focus:ring-2 focus:ring-sage"
          />
          <button
            type="submit"
            disabled={!whisperInput.trim() || isSending}
            aria-label="Send Whisper"
            className="h-11 px-4 rounded-xl bg-sage text-cream font-medium text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>

        {lastSentText && (
          <p className="text-[11px] text-sage font-medium italic animate-in fade-in">
            Whisper sent: &ldquo;{lastSentText}&rdquo; ✨
          </p>
        )}
      </form>
    </div>
  );
}
