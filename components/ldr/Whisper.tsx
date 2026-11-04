"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoom } from "@/lib/room";
import { Sparkles } from "lucide-react";

export default function Whisper() {
  const room = useRoom();
  const [whisperText, setWhisperText] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const unregister = room.registerHandlers({
      onWhisper: ({ text }) => {
        setWhisperText(text);
        clearTimeout(timer);
        timer = setTimeout(() => {
          setWhisperText(null);
        }, 6000);
      },
    });

    return () => {
      unregister();
      clearTimeout(timer);
    };
  }, [room]);

  return (
    <div className="fixed top-4 inset-x-4 pointer-events-none z-[9999] flex justify-center">
      <AnimatePresence>
        {whisperText && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-sm w-full mx-auto px-4 py-3 rounded-2xl bg-paper/95 dark:bg-obsidian/95 backdrop-blur-md border border-sage/40 shadow-aura text-center"
          >
            <div className="flex items-center justify-center gap-1.5 text-sage dark:text-matcha mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px] font-sans uppercase tracking-widest font-semibold">
                Gentle Whisper from Captain
              </span>
            </div>
            <p className="font-serif italic text-base sm:text-lg text-ink dark:text-cream leading-snug">
              &ldquo;{whisperText}&rdquo;
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
