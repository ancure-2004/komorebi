"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Heart, Sparkles, X, RotateCw, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { todayKey } from "@/lib/time";
import { useApp } from "@/lib/store";
import { haptics } from "@/lib/haptics";

interface DailyNoteData {
  date: string;
  body: string | null;
  caption: string | null;
  polaroid_path: string | null;
}

export interface EnvelopeProps {
  date?: string;
  className?: string;
}

export default function Envelope({ date: propDate, className = "" }: EnvelopeProps) {
  const currentDate = propDate ?? todayKey();
  const settings = useApp((s) => s.settings);
  const updateSettings = useApp((s) => s.updateSettings);

  const [note, setNote] = useState<DailyNoteData | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`komorebi:envelope:${currentDate}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          return parsed.note ?? null;
        }
      } catch {}
    }
    return null;
  });

  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`komorebi:envelope:${currentDate}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          return parsed.photoUrl ?? null;
        }
      } catch {}
    }
    return null;
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch today's note from Supabase or cached offline
  useEffect(() => {
    let mounted = true;
    const cacheKey = `komorebi:envelope:${currentDate}`;

    async function fetchNote() {
      try {
        const { data, error } = await supabase
          .from("daily_notes")
          .select("date, body, caption, polaroid_path")
          .eq("date", currentDate)
          .maybeSingle();

        if (error || !data) {
          if (mounted) setIsLoading(false);
          return;
        }

        if (mounted) {
          setNote(data);
        }

        // If there's a polaroid photo, get signed URL from daily bucket
        let signedUrl: string | null = null;
        if (data.polaroid_path) {
          const { data: urlData } = await supabase.storage
            .from("daily")
            .createSignedUrl(data.polaroid_path, 86400); // 24h signed URL
          if (urlData?.signedUrl && mounted) {
            signedUrl = urlData.signedUrl;
            setPhotoUrl(signedUrl);
          }
        }

        // Cache offline
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ note: data, photoUrl: signedUrl })
          );
        } catch {}
      } catch (err) {
        console.warn("Could not fetch daily note:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchNote();

    return () => {
      mounted = false;
    };
  }, [currentDate]);

  const hasSeen = settings.seenEnvelope === currentDate;

  const handleOpenEnvelope = () => {
    haptics.medium();
    setIsOpen(true);
    updateSettings((s) => ({ ...s, seenEnvelope: currentDate }));
  };

  if (isLoading || !note) {
    return null;
  }

  return (
    <>
      {/* Unopened Sealed Envelope Banner or Small Re-read Chip */}
      {!hasSeen ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl bg-gradient-to-r from-sakura/30 via-cream to-sage/20 dark:from-sakura/15 dark:via-obsidian dark:to-sage/15 border border-sakura/40 shadow-sm flex items-center justify-between gap-3 ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sakura/30 text-sakura flex items-center justify-center flex-shrink-0 animate-bounce">
              <Mail className="w-5 h-5 text-sakura fill-current" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-semibold text-ink dark:text-cream leading-tight">
                Morning Letter from Captain ✉️
              </h4>
              <p className="text-[11px] font-sans text-ink/65 dark:text-cream/65 mt-0.5">
                A sealed morning note and Polaroid are waiting for you.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenEnvelope}
            className="min-h-[44px] px-4 rounded-xl bg-sakura text-mocha font-semibold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <Heart className="w-3.5 h-3.5 fill-current" />
            <span>Open</span>
          </button>
        </motion.div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-paper dark:bg-obsidian border border-sage/30 text-xs font-medium text-ink/75 dark:text-cream/75 hover:border-sage active:scale-95 transition-all"
        >
          <Mail className="w-4 h-4 text-sakura" />
          <span>Re-read Captain&apos;s Morning Note</span>
        </button>
      )}

      {/* Fullscreen Opened Note & Flip Polaroid Modal */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-[100dvh] z-50 flex items-center justify-center p-4 bg-mocha/60 dark:bg-black/80 backdrop-blur-md select-none overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm rounded-3xl bg-cream dark:bg-obsidian border border-sakura/40 shadow-2xl p-6 relative space-y-5"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-ink/40 dark:text-cream/40 hover:text-ink hover:bg-sage/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-2 text-sakura">
                <Heart className="w-5 h-5 fill-current" />
                <span className="text-xs uppercase tracking-widest font-semibold font-sans">
                  Morning Note • {currentDate}
                </span>
              </div>

              {/* Note Body Text */}
              <div className="p-4 rounded-2xl bg-paper dark:bg-mocha/50 border border-[#EBE7DF] dark:border-[#383530]">
                <p className="font-serif italic text-base sm:text-lg text-ink dark:text-cream leading-relaxed whitespace-pre-wrap">
                  &ldquo;{note.body}&rdquo;
                </p>
                <div className="mt-3 text-right">
                  <span className="text-xs font-serif text-sage dark:text-matcha font-medium">
                    - With all my love, Captain ❤️
                  </span>
                </div>
              </div>

              {/* Tap-to-Flip Polaroid Photo Card */}
              {photoUrl && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-ink/50 dark:text-cream/50 px-1 font-sans">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" /> Tap Polaroid to flip
                    </span>
                    <span className="flex items-center gap-1">
                      <RotateCw className="w-3 h-3" /> 3D Flip
                    </span>
                  </div>

                  {/* 3D Flip Card Container */}
                  <div
                    onClick={() => {
                      haptics.light();
                      setIsFlipped(!isFlipped);
                    }}
                    className="relative w-full aspect-square max-w-[280px] mx-auto cursor-pointer perspective-[1000px]"
                  >
                    <motion.div
                      animate={{ rotateY: isFlipped ? 180 : 0 }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                      className="w-full h-full relative [transform-style:preserve-3d] shadow-xl rounded-xl"
                    >
                      {/* FRONT FACE: White Polaroid Frame with Photo */}
                      <div className="absolute inset-0 w-full h-full bg-white dark:bg-[#FDFBF7] p-3 pb-8 rounded-xl shadow-md border border-[#E5E1D8] flex flex-col justify-between [backface-visibility:hidden]">
                        <div className="w-full h-[82%] rounded bg-paper overflow-hidden relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoUrl}
                            alt="Captain's morning Polaroid"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-center font-serif text-xs text-[#3A3833] mt-2 font-medium italic truncate">
                          {note.caption || "Good morning, my love 🌸"}
                        </p>
                      </div>

                      {/* BACK FACE: Handwritten Secret Note */}
                      <div className="absolute inset-0 w-full h-full bg-[#FDFBF7] dark:bg-[#1F1E1B] p-5 rounded-xl shadow-md border border-sakura/30 [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col justify-between text-center">
                        <div className="my-auto space-y-2">
                          <Sparkles className="w-6 h-6 text-sakura mx-auto" />
                          <p className="font-serif italic text-sm sm:text-base text-ink dark:text-cream leading-relaxed">
                            {note.caption || "I am thinking of you with every beat of my heart today."}
                          </p>
                        </div>
                        <span className="text-[10px] font-sans text-ink/40 dark:text-cream/40">
                          Captured for you • Tap to flip back
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full h-11 min-h-[44px] rounded-xl bg-sage text-cream font-medium text-xs shadow-sm hover:bg-sage/90 active:scale-95 transition-all text-center"
              >
                Close & Keep in Heart
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
