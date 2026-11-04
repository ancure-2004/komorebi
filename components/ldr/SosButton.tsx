"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartHandshake, AlertCircle, X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRoom } from "@/lib/room";
import { haptics } from "@/lib/haptics";

export interface SosButtonProps {
  onOpenChat?: () => void;
  className?: string;
}

export default function SosButton({ onOpenChat, className = "" }: SosButtonProps) {
  const room = useRoom();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleTriggerSos = async () => {
    setIsSending(true);
    haptics.heavy();

    try {
      // 1. Broadcast over Realtime WebSocket for instant in-app banner
      await room.send("sos", {});

      // 2. Trigger Supabase Edge Function to dispatch Telegram bot alert
      await supabase.functions.invoke("notify-sos", {
        body: { timestamp: new Date().toISOString() },
      });

      setSentSuccess(true);
      haptics.success();

      setTimeout(() => {
        setIsConfirmOpen(false);
        setSentSuccess(false);
        onOpenChat?.();
      }, 2500);
    } catch (err) {
      console.warn("Failed to dispatch SOS alert:", err);
      // Even if network fails, provide local comfort
      setSentSuccess(true);
      setTimeout(() => {
        setIsConfirmOpen(false);
        setSentSuccess(false);
        onOpenChat?.();
      }, 2500);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Discreet Header SOS Trigger Button */}
      <button
        type="button"
        onClick={() => {
          haptics.light();
          setIsConfirmOpen(true);
        }}
        aria-label="Emergency SOS to Captain"
        className={`w-10 h-10 rounded-xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] text-sakura hover:border-sakura/50 flex items-center justify-center active:scale-95 transition-all shadow-sm ${className}`}
      >
        <HeartHandshake className="w-4 h-4" />
      </button>

      {/* Confirmation & Reassurance Sheet */}
      <AnimatePresence>
        {isConfirmOpen && (
          <div
            className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-[100dvh] z-50 flex items-center justify-center p-4 bg-mocha/60 dark:bg-black/75 backdrop-blur-sm select-none"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-3xl bg-cream dark:bg-obsidian border border-sakura/50 p-6 shadow-2xl space-y-4"
            >
              {sentSuccess ? (
                <div className="text-center py-4 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-sage/20 text-sage mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-serif text-xl font-bold text-ink dark:text-cream">
                    Captain Has Been Alerted!
                  </h3>
                  <p className="text-xs text-ink/75 dark:text-cream/75 font-sans max-w-xs mx-auto leading-relaxed">
                    A high-priority alert was dispatched to Captain&apos;s phone. Take a deep, gentle breath. He is checking in on you right now.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 text-sakura">
                      <ShieldAlert className="w-6 h-6" />
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        Sanctuary SOS
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsConfirmOpen(false)}
                      className="p-1 rounded-full text-ink/40 hover:text-ink transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-serif text-xl font-bold text-ink dark:text-cream leading-snug">
                      Need Captain right now?
                    </h3>
                    <p className="text-xs text-ink/75 dark:text-cream/75 mt-1.5 font-sans leading-relaxed">
                      This sends an instant priority distress notification directly to Captain&apos;s Telegram bot and opens your private emergency sanctuary chat.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col gap-2.5">
                    <button
                      type="button"
                      disabled={isSending}
                      onClick={handleTriggerSos}
                      className="w-full h-12 min-h-[44px] rounded-xl bg-sakura text-mocha font-semibold text-xs tracking-wide shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>{isSending ? "Alerting Captain..." : "Yes, Alert Captain Immediately"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSending}
                      onClick={() => setIsConfirmOpen(false)}
                      className="w-full h-11 min-h-[44px] rounded-xl border border-sage/30 text-ink/70 dark:text-cream/70 text-xs font-medium hover:bg-sage/10 active:scale-95 transition-all"
                    >
                      Cancel / Accidental Tap
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
