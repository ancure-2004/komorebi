"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scissors,
  Sparkles,
  Heart,
  CalendarClock,
  Compass,
  MessageCircle,
  Award,
  Shield,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";
import { haptics } from "@/lib/haptics";

export interface WelcomeExperienceProps {
  isOpen: boolean;
  onComplete: () => void;
  previewMode?: boolean;
}

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotate: number;
}

const TOUR_STEPS = [
  {
    icon: CalendarClock,
    badge: "Tab 1: Flow",
    title: "Your Daily Flow 🌊",
    subtitle: "A calm river for your day",
    text: "Here your day flows peacefully without any overwhelm. See your morning flex hours, track your daily schedule blocks, and organize your tasks at your own pace.",
    tip: "Tap 'Customize' anytime to shape and reorder blocks however you feel!",
    color: "text-sage dark:text-matcha",
    bg: "bg-sage/15 dark:bg-sage/25",
  },
  {
    icon: Compass,
    badge: "Tab 2: Focus",
    title: "Focus on Yourself & Breathe 🍃",
    subtitle: "Your quiet study & productivity nest",
    text: "Whenever you need to study, write, or lock in, this is your safe cocoon. Tap to turn on Zen Mode for a calm breathing circle, play soothing rain sounds, or flip your phone into an aesthetic Desk Clock.",
    tip: "Automated 20-20-20 care reminders will gently pop up to rest your eyes!",
    color: "text-matcha",
    bg: "bg-matcha/15",
  },
  {
    icon: MessageCircle,
    badge: "Tab 4: Sanctuary",
    title: "Connect to Your Darling ❤️",
    subtitle: "Our private secret hideaway",
    text: "Our private thread that nobody else in the universe can enter. Snap single-view Polaroid selfies with the live camera, leave voice notes with audio frequency bars, and hold the Sync Orb to feel my pulse across the miles.",
    tip: "Open the sealed envelope every morning on your dashboard for my daily love letter!",
    color: "text-sakura",
    bg: "bg-sakura/20",
  },
  {
    icon: Award,
    badge: "Tab 3: Growth",
    title: "Love Coupons & Bonsai Tree 🪴",
    subtitle: "Bloom together & unlock cute rewards",
    text: "Every session you complete helps your bonsai tree grow taller! As your study streak builds, you'll unlock real-life Love Coupons redeemable with Captain - like midnight ice-cream dates and unlimited massages.",
    tip: "Hit milestone streaks to unlock and claim special vouchers directly from your vault!",
    color: "text-amber-500",
    bg: "bg-amber-500/15",
  },
  {
    icon: Shield,
    badge: "Always On Guard",
    title: "I Am Always One Tap Away 💌",
    subtitle: "SOS reassurance & instant connection",
    text: "Whenever you feel overwhelmed, anxious, or just miss me, press the SOS button at the top. I'll drop everything and send reassurance and sweet whispers right to your screen.",
    tip: "You are never alone. I am always right here by your side.",
    color: "text-red-400",
    bg: "bg-red-400/15",
  },
];

export default function WelcomeExperience({
  isOpen,
  onComplete,
  previewMode = false,
}: WelcomeExperienceProps) {
  const [stage, setStage] = useState<"ribbon" | "celebration" | "tour">("ribbon");
  const [isRibbonCut, setIsRibbonCut] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  // Handle ribbon snip
  const handleCutRibbon = () => {
    haptics.heavy();
    setIsRibbonCut(true);

    // Generate burst of confetti
    const pieces: ConfettiPiece[] = Array.from({ length: 48 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 360,
      y: (Math.random() - 0.5) * 360 - 60,
      color: [
        "#F4C2C8", // sakura
        "#8EA893", // sage
        "#B2D0B6", // matcha
        "#FFD700", // gold
        "#FFF5EB", // cream
        "#E87A90", // rose
      ][i % 6],
      size: Math.floor(Math.random() * 8) + 6,
      rotate: Math.floor(Math.random() * 360),
    }));
    setConfetti(pieces);

    setTimeout(() => {
      setStage("celebration");
    }, 600);
  };

  // Reset state on completion
  const handleFinish = async () => {
    haptics.success();
    if (!previewMode) {
      try {
        await fetch("/api/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: false }),
        });
      } catch (err) {
        console.warn("Could not turn off welcome flag:", err);
      }
    }
    setStage("ribbon");
    setIsRibbonCut(false);
    setCurrentStep(0);
    setConfetti([]);
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Grand Welcome Experience"
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-[100dvh] z-[99999] flex items-center justify-center p-4 bg-mocha/80 dark:bg-black/90 backdrop-blur-md select-none overflow-hidden"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-cream dark:bg-obsidian border border-sakura/50 shadow-2xl p-6 overflow-hidden flex flex-col items-center text-center">
        {/* Soft background ambient glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-sakura/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-sage/30 rounded-full blur-3xl pointer-events-none" />

        <AnimatePresence mode="wait">
          {/* STAGE 1: RIBBON CUTTING CEREMONY */}
          {stage === "ribbon" && (
            <motion.div
              key="ribbon"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center space-y-5 py-4"
            >
              {/* Header Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sakura/20 text-ink dark:text-cream text-xs font-semibold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-sakura" />
                <span>Grand Opening</span>
              </div>

              {/* Title & Calligraphy */}
              <div className="space-y-1.5">
                <h2 className="font-serif text-2xl font-bold text-ink dark:text-cream leading-tight">
                  Welcome to Komorebi, My Love 🌸
                </h2>
                <p className="text-xs font-sans text-ink/70 dark:text-cream/70 leading-relaxed max-w-xs">
                  A sanctuary crafted with all my heart, designed just for your peace and focus.
                </p>
              </div>

              {/* Ceremonial Satin Ribbon & Snip Area */}
              <div className="relative w-full py-8 flex items-center justify-center">
                {/* Left Ribbon Piece */}
                <motion.div
                  animate={isRibbonCut ? { x: -220, opacity: 0, rotate: -20 } : { x: 0, opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute left-0 w-1/2 h-10 bg-gradient-to-r from-sakura to-[#F8A5B2] shadow-md border-y-2 border-amber-200/60 rounded-l-md"
                />

                {/* Right Ribbon Piece */}
                <motion.div
                  animate={isRibbonCut ? { x: 220, opacity: 0, rotate: 20 } : { x: 0, opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute right-0 w-1/2 h-10 bg-gradient-to-l from-sakura to-[#F8A5B2] shadow-md border-y-2 border-amber-200/60 rounded-r-md"
                />

                {/* Center Bow & Golden Scissors Button */}
                <motion.button
                  type="button"
                  onClick={handleCutRibbon}
                  disabled={isRibbonCut}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 shadow-xl border-4 border-cream dark:border-obsidian flex flex-col items-center justify-center text-mocha group cursor-pointer active:scale-90 transition-transform"
                  aria-label="Cut the ceremonial ribbon"
                >
                  <motion.div
                    animate={
                      isRibbonCut
                        ? { rotate: 90, scale: 1.3, opacity: 0 }
                        : { rotate: [0, -10, 10, 0] }
                    }
                    transition={{
                      repeat: isRibbonCut ? 0 : Infinity,
                      duration: 2,
                      ease: "easeInOut",
                    }}
                  >
                    <Scissors className="w-8 h-8 text-mocha drop-shadow-sm" />
                  </motion.div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-mocha/80 mt-0.5">
                    Cut Me
                  </span>
                </motion.button>
              </div>

              {/* Tap instructions prompt */}
              <div className="flex items-center gap-1.5 text-xs text-sage dark:text-matcha font-medium animate-pulse">
                <Scissors className="w-4 h-4" />
                <span>Tap the scissors to cut the ribbon!</span>
              </div>
            </motion.div>
          )}

          {/* STAGE 2: CONFETTI CELEBRATION CARD */}
          {stage === "celebration" && (
            <motion.div
              key="celebration"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.88 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full flex flex-col items-center space-y-4 py-2 relative"
            >
              {/* Confetti Explosion Particles */}
              <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
                {confetti.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                    animate={{
                      x: p.x,
                      y: p.y,
                      opacity: 0,
                      scale: 0.4,
                      rotate: p.rotate,
                    }}
                    transition={{ duration: 1.4, ease: "easeOut" }}
                    style={{
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                      borderRadius: p.id % 2 === 0 ? "50%" : "2px",
                    }}
                    className="absolute"
                  />
                ))}
              </div>

              <div className="w-16 h-16 rounded-full bg-sakura/20 text-sakura flex items-center justify-center shadow-inner animate-bounce">
                <Heart className="w-9 h-9 fill-sakura text-sakura" />
              </div>

              <div className="space-y-1">
                <h3 className="font-serif text-2xl font-bold text-ink dark:text-cream leading-tight">
                  Komorebi is Officially Yours! ✨
                </h3>
                <p className="text-xs font-sans text-ink/75 dark:text-cream/75 leading-relaxed max-w-xs">
                  The doors to your sanctuary are wide open. Let me give you a quick, cute tour of everything waiting for you inside.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStage("tour")}
                className="w-full h-12 rounded-xl bg-sage hover:bg-sage/90 text-cream font-medium text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <span>Start the Tour Together</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* STAGE 3: STEP-BY-STEP GUIDED INTERACTIVE TOUR */}
          {stage === "tour" && (
            <motion.div
              key="tour"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="w-full flex flex-col items-center space-y-4 py-1"
            >
              {/* Step indicator header */}
              <div className="w-full flex items-center justify-between text-xs text-ink/50 dark:text-cream/50 px-1">
                <span className="font-sans font-medium">
                  Tour {currentStep + 1} of {TOUR_STEPS.length}
                </span>
                <span className="font-semibold text-sage dark:text-matcha">
                  {TOUR_STEPS[currentStep].badge}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-sage/20 dark:bg-sage/30 overflow-hidden">
                <div
                  className="h-full bg-sage dark:bg-matcha transition-all duration-300"
                  style={{
                    width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%`,
                  }}
                />
              </div>

              {/* Step Card */}
              <div className="w-full p-4 rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] text-left space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-xl ${TOUR_STEPS[currentStep].bg} ${TOUR_STEPS[currentStep].color} flex items-center justify-center flex-shrink-0`}
                  >
                    {React.createElement(TOUR_STEPS[currentStep].icon, {
                      className: "w-5 h-5",
                    })}
                  </div>
                  <div>
                    <h4 className="font-serif text-base font-semibold text-ink dark:text-cream leading-tight">
                      {TOUR_STEPS[currentStep].title}
                    </h4>
                    <span className="text-[11px] font-sans text-ink/55 dark:text-cream/55">
                      {TOUR_STEPS[currentStep].subtitle}
                    </span>
                  </div>
                </div>

                <p className="text-xs font-sans text-ink/80 dark:text-cream/80 leading-relaxed">
                  {TOUR_STEPS[currentStep].text}
                </p>

                {/* Cute Tip Box */}
                <div className="pt-2 border-t border-[#EBE7DF] dark:border-[#383530] text-[11px] font-sans text-sage dark:text-matcha flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{TOUR_STEPS[currentStep].tip}</span>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="w-full flex items-center gap-2 pt-1">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((s) => s - 1)}
                    className="h-11 px-3 rounded-xl border border-[#EBE7DF] dark:border-[#383530] text-ink/60 dark:text-cream/60 hover:text-ink text-xs font-medium flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                )}

                {currentStep < TOUR_STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.light();
                      setCurrentStep((s) => s + 1);
                    }}
                    className="flex-1 h-11 rounded-xl bg-sage hover:bg-sage/90 text-cream font-medium text-xs shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <span>Next Feature</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="flex-1 h-11 rounded-xl bg-gradient-to-r from-sakura via-[#F4A7B3] to-sage text-mocha font-bold text-xs shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Check className="w-4 h-4 text-mocha" />
                    <span>Enter Your Sanctuary 💖</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
