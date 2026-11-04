"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hourglass, Lock, Unlock, Sparkles, X, Heart, Image as ImageIcon } from "lucide-react";
import { supabase, Capsule } from "@/lib/supabase";
import { useNow } from "@/lib/hooks";
import { fmtHM } from "@/lib/time";
import { haptics } from "@/lib/haptics";
import confetti from "canvas-confetti";

export interface CapsulesProps {
  className?: string;
}

export default function Capsules({ className = "" }: CapsulesProps) {
  const now = useNow(1000);
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  // Fetch time capsules
  useEffect(() => {
    let mounted = true;

    async function loadCapsules() {
      try {
        const { data, error } = await supabase
          .from("capsules_for_her")
          .select("*")
          .order("unlock_at", { ascending: true });

        if (!error && data && mounted) {
          setCapsules(data as Capsule[]);
        }
      } catch (err) {
        console.warn("Could not load capsules:", err);
      }
    }

    loadCapsules();
    const interval = setInterval(loadCapsules, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleOpenCapsule = async (capsule: Capsule) => {
    setIsOpening(true);
    haptics.medium();

    try {
      // 1. Mark as opened via security definer RPC
      await supabase.rpc("open_capsule", { p_id: capsule.id });

      // 2. If capsule has photo, fetch signed URL from daily bucket
      const photoPath = capsule.photo_path || capsule.media_path;
      if (photoPath) {
        const { data } = await supabase.storage
          .from("daily")
          .createSignedUrl(photoPath, 3600);
        if (data?.signedUrl) {
          setPhotoUrl(data.signedUrl);
        }
      }

      // Celebrate
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#F4C2C8", "#7D9D8B", "#FDFBF7"],
        });
      } catch {}

      setSelectedCapsule({
        ...capsule,
        opened_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Failed to open capsule:", err);
    } finally {
      setIsOpening(false);
    }
  };

  if (capsules.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Hourglass className="w-4 h-4 text-sage" />
        <h3 className="font-serif text-base font-semibold text-ink dark:text-cream">
          Time-Locked Capsules
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {capsules.map((c) => {
          const unlockTime = new Date(c.unlock_at).getTime();
          const isReady = now >= unlockTime;
          const isOpened = Boolean(c.opened_at);
          const leftMs = Math.max(0, unlockTime - now);

          return (
            <div
              key={c.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isOpened
                  ? "bg-paper/60 dark:bg-obsidian/40 border-[#EBE7DF] dark:border-[#383530]"
                  : isReady
                  ? "bg-sakura/15 dark:bg-sakura/10 border-sakura/50 shadow-sm animate-pulse"
                  : "bg-paper dark:bg-obsidian border-[#EBE7DF] dark:border-[#383530]"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isOpened
                      ? "bg-sage/15 text-sage"
                      : isReady
                      ? "bg-sakura text-mocha"
                      : "bg-paper dark:bg-obsidian border border-[#DDD7CD] text-ink/40"
                  }`}
                >
                  {isOpened ? (
                    <Unlock className="w-4 h-4" />
                  ) : isReady ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="font-serif text-sm font-semibold text-ink dark:text-cream truncate">
                    {c.title}
                  </h4>
                  <p className="text-[11px] text-ink/60 dark:text-cream/60 truncate font-sans">
                    {isOpened
                      ? "Opened & saved"
                      : isReady
                      ? "Sealed surprise is ready to open!"
                      : `Unlocks in ${fmtHM(leftMs)}`}
                  </p>
                </div>
              </div>

              {isOpened ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCapsule(c);
                    if (c.photo_path) {
                      supabase.storage
                        .from("daily")
                        .createSignedUrl(c.photo_path, 3600)
                        .then(({ data }) => setPhotoUrl(data?.signedUrl ?? null));
                    }
                  }}
                  className="min-h-[44px] px-3 rounded-xl border border-sage/30 text-xs font-medium text-sage dark:text-matcha hover:bg-sage/10 active:scale-95 transition-all flex-shrink-0"
                >
                  View
                </button>
              ) : isReady ? (
                <button
                  type="button"
                  disabled={isOpening}
                  onClick={() => handleOpenCapsule(c)}
                  className="min-h-[44px] px-4 rounded-xl bg-sakura text-mocha font-semibold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 flex-shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open Now</span>
                </button>
              ) : (
                <span className="text-[11px] font-mono text-ink/40 dark:text-cream/40 flex-shrink-0 pr-1">
                  Locked
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Capsule Modal */}
      <AnimatePresence>
        {selectedCapsule && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mocha/60 dark:bg-black/80 backdrop-blur-md select-none"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-cream dark:bg-obsidian border border-sakura/40 shadow-2xl p-6 relative space-y-4"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedCapsule(null);
                  setPhotoUrl(null);
                }}
                className="absolute top-4 right-4 p-2 rounded-full text-ink/40 hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-sakura">
                <Heart className="w-5 h-5 fill-current" />
                <span className="text-xs uppercase tracking-widest font-semibold font-sans">
                  Time Capsule Opened
                </span>
              </div>

              <h3 className="font-serif text-xl font-bold text-ink dark:text-cream">
                {selectedCapsule.title}
              </h3>

              <div className="p-4 rounded-2xl bg-paper dark:bg-mocha/50 border border-[#EBE7DF] dark:border-[#383530]">
                <p className="font-serif italic text-base text-ink dark:text-cream leading-relaxed whitespace-pre-wrap">
                  &ldquo;{selectedCapsule.note_text || selectedCapsule.body}&rdquo;
                </p>
              </div>

              {photoUrl && (
                <div className="rounded-xl overflow-hidden border border-[#EBE7DF] dark:border-[#383530] max-h-60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrl}
                    alt={selectedCapsule.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedCapsule(null);
                  setPhotoUrl(null);
                }}
                className="w-full h-11 min-h-[44px] rounded-xl bg-sage text-cream font-medium text-xs hover:bg-sage/90 active:scale-95 transition-all text-center"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
