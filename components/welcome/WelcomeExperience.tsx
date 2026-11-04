"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  X,
  Camera,
  Clock,
  Volume2,
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

const SCENE_DURATION_MS = 9000;

const SCENES = [
  {
    id: "flow",
    badge: "ACT I • THE RIVER OF TIME",
    title: "Your Peaceful Daily River 🌊",
    subtitle: "A calm, unhurried flow for your daily rhythm",
    narration:
      "Your day is not an anxious checklist - it is a gentle river. Watch your schedule blocks drift peacefully, bank your morning flex hours, and shape your day at your own serene pace.",
    theme: "from-[#1F2923] via-[#141C17] to-[#0D120F]",
    accent: "text-sage dark:text-matcha",
    icon: CalendarClock,
  },
  {
    id: "zen",
    badge: "ACT II • THE SECRET COCOON",
    title: "Breathe, Focus & Rest Your Eyes 🍃",
    subtitle: "Your personal study nest & aesthetic desk stand",
    narration:
      "When the world gets loud, step inside your Zen cocoon. Soft rain falls outside, your breath gently syncs with the breathing orb, and your phone transforms into an aesthetic retro flip clock.",
    theme: "from-[#1A2421] via-[#121A16] to-[#0B100E]",
    accent: "text-matcha",
    icon: Compass,
  },
  {
    id: "sanctuary",
    badge: "ACT III • THE HEARTBEAT BRIDGE",
    title: "Touching Across Any Distance ❤️",
    subtitle: "Single-view Polaroids, voice waves & real-time pulse",
    narration:
      "Our private bridge that no one else in the world can see. Snap single-view Polaroid selfies with the live camera, leave whispered voice notes, and touch the Sync Orb to feel my heartbeat in real-time.",
    theme: "from-[#2A1B22] via-[#1C1217] to-[#120B0F]",
    accent: "text-sakura",
    icon: MessageCircle,
  },
  {
    id: "growth",
    badge: "ACT IV • THE BLOOMING BONSAI",
    title: "Bloom Together & Unlock Real Dates 🪴",
    subtitle: "Every minute of focus unlocks cute love coupons",
    narration:
      "Every study session nourishes your bonsai tree with blooming blossoms. Build your streak to unlock secret Love Coupons redeemable with Captain - like midnight ice-cream runs and massage passes.",
    theme: "from-[#2B2313] via-[#1D170C] to-[#130E07]",
    accent: "text-amber-400",
    icon: Award,
  },
  {
    id: "sos",
    badge: "ACT V • THE LIGHTHOUSE BEACON",
    title: "Never Alone, Just One Tap Away 💌",
    subtitle: "Instant reassurance, sweet drops & constant presence",
    narration:
      "Whenever you feel tired, anxious, or just miss me, press the SOS beacon. I will drop everything to send love drops, sweet whispers, and comforting reassurance straight to your screen.",
    theme: "from-[#28181D] via-[#1B0F13] to-[#10080B]",
    accent: "text-rose-400",
    icon: Shield,
  },
  {
    id: "finale",
    badge: "FINALE • WELCOME HOME",
    title: "Komorebi is Yours, My Love ✨",
    subtitle: "The sunlight filtering through the trees",
    narration:
      "The doors to your private sanctuary are wide open. Built with endless love, patience, and devotion just for you. Welcome home, darling.",
    theme: "from-[#261E1A] via-[#1A1412] to-[#100D0B]",
    accent: "text-sakura",
    icon: Heart,
  },
];

const STATIC_PETALS = Array.from({ length: 12 }).map((_, i) => ({
  id: i,
  startX: ((i * 29) % 320) + 20,
  driftX: (i % 2 === 0 ? 1 : -1) * ((i * 13) % 50 + 20),
  duration: 9 + (i % 4) * 1.5,
  delay: (i % 4) * 0.7,
}));

export default function WelcomeExperience({
  isOpen,
  onComplete,
  previewMode = false,
}: WelcomeExperienceProps) {
  const [phase, setPhase] = useState<"curtain" | "movie">("curtain");
  const [isRibbonCut, setIsRibbonCut] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  const startTimeRef = useRef<number>(0);

  // Handle ribbon snip
  const handleCutRibbon = () => {
    haptics.heavy();
    setIsRibbonCut(true);

    // Burst of confetti
    const pieces: ConfettiPiece[] = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 500,
      y: (Math.random() - 0.5) * 500 - 80,
      color: [
        "#F4C2C8", // sakura
        "#8EA893", // sage
        "#B2D0B6", // matcha
        "#FFD700", // gold
        "#FFF5EB", // cream
        "#E87A90", // rose
      ][i % 6],
      size: Math.floor(Math.random() * 10) + 6,
      rotate: Math.floor(Math.random() * 360),
    }));
    setConfetti(pieces);

    setTimeout(() => {
      setPhase("movie");
      setActiveScene(0);
      setSceneProgress(0);
      startTimeRef.current = Date.now();
      setIsPlaying(true);
    }, 1100);
  };

  // Movie autoplay loop
  useEffect(() => {
    if (phase !== "movie" || !isPlaying) return;

    const interval = 50;
    const timer = setInterval(() => {
      setSceneProgress((prev) => {
        const next = prev + (interval / SCENE_DURATION_MS) * 100;
        if (next >= 100) {
          if (activeScene < SCENES.length - 1) {
            setActiveScene((s) => s + 1);
            return 0;
          } else {
            // Stay at finale
            return 100;
          }
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [phase, isPlaying, activeScene]);

  const handleNextScene = () => {
    haptics.light();
    if (activeScene < SCENES.length - 1) {
      setActiveScene((s) => s + 1);
      setSceneProgress(0);
    } else {
      handleComplete();
    }
  };

  const handlePrevScene = () => {
    haptics.light();
    if (activeScene > 0) {
      setActiveScene((s) => s - 1);
      setSceneProgress(0);
    }
  };

  const handleComplete = async () => {
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
    setPhase("curtain");
    setIsRibbonCut(false);
    setActiveScene(0);
    setSceneProgress(0);
    onComplete();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Komorebi Movie Journey"
      className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-[100dvh] z-[99999] bg-[#0A0A09] text-[#FDFBF7] flex flex-col justify-between overflow-hidden select-none"
    >
      {/* ======================================================== */}
      {/* PHASE 1: THE GRAND CEREMONIAL RIBBON CUTTING CURTAIN     */}
      {/* ======================================================== */}
      {phase === "curtain" && (
        <div className="relative w-full h-full flex flex-col items-center justify-between p-6 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] bg-gradient-to-b from-[#1C1719] via-[#120F10] to-[#0A0A09]">
          {/* Ambient magical glow */}
          <div className="absolute top-1/4 -left-32 w-80 h-80 bg-sakura/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-amber-400/15 rounded-full blur-[100px] pointer-events-none" />

          {/* Floating Sakura Petals in Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {STATIC_PETALS.map((petal) => (
              <motion.div
                key={petal.id}
                initial={{
                  x: petal.startX,
                  y: -40,
                  opacity: 0.6,
                  rotate: 0,
                }}
                animate={{
                  y: 900,
                  x: petal.startX + petal.driftX,
                  rotate: 540,
                  opacity: [0.6, 0.9, 0.2],
                }}
                transition={{
                  duration: petal.duration,
                  repeat: Infinity,
                  ease: "linear",
                  delay: petal.delay,
                }}
                className="absolute text-sakura/50 text-xl"
              >
                🌸
              </motion.div>
            ))}
          </div>

          {/* Top Cinema Header */}
          <div className="relative z-10 flex flex-col items-center space-y-2 text-center pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-sakura/15 border border-sakura/30 text-sakura text-xs font-semibold tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>THE GRAND PREMIERE</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#FFF5EB] drop-shadow-md">
              Komorebi • 木漏れ日
            </h1>
            <p className="text-xs sm:text-sm font-sans text-cream/70 max-w-xs leading-relaxed">
              A private digital sanctuary crafted with love, dedicated completely to you.
            </p>
          </div>

          {/* Center Ribbon & Ceremonial Golden Scissors */}
          <div className="relative z-10 w-full max-w-md my-auto flex flex-col items-center justify-center">
            {/* The Satin Silk Ribbon */}
            <div className="relative w-full h-16 flex items-center justify-center">
              {/* Left Ribbon Piece */}
              <motion.div
                animate={
                  isRibbonCut
                    ? { x: -350, opacity: 0, rotate: -25 }
                    : { x: 0, opacity: 1 }
                }
                transition={{ duration: 0.75, ease: "easeOut" }}
                className="absolute left-0 w-1/2 h-12 bg-gradient-to-r from-sakura via-[#F89DAE] to-[#F5879C] shadow-[0_4px_25px_rgba(244,194,200,0.5)] border-y-2 border-amber-200/80 rounded-l-xl flex items-center justify-end pr-2"
              >
                <div className="w-1.5 h-full bg-white/30 blur-xs" />
              </motion.div>

              {/* Right Ribbon Piece */}
              <motion.div
                animate={
                  isRibbonCut
                    ? { x: 350, opacity: 0, rotate: 25 }
                    : { x: 0, opacity: 1 }
                }
                transition={{ duration: 0.75, ease: "easeOut" }}
                className="absolute right-0 w-1/2 h-12 bg-gradient-to-l from-sakura via-[#F89DAE] to-[#F5879C] shadow-[0_4px_25px_rgba(244,194,200,0.5)] border-y-2 border-amber-200/80 rounded-r-xl flex items-center justify-start pl-2"
              >
                <div className="w-1.5 h-full bg-white/30 blur-xs" />
              </motion.div>

              {/* Center Golden Bow & Golden Scissors Button */}
              <motion.button
                type="button"
                onClick={handleCutRibbon}
                disabled={isRibbonCut}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="relative z-20 w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 via-amber-300 to-amber-500 p-1 shadow-[0_0_40px_rgba(255,215,0,0.5)] border-4 border-[#FFF5EB] flex flex-col items-center justify-center cursor-pointer group active:scale-95 transition-transform"
                aria-label="Cut the ceremonial ribbon"
              >
                <motion.div
                  animate={
                    isRibbonCut
                      ? { rotate: 120, scale: 1.4, opacity: 0 }
                      : { rotate: [0, -12, 12, 0] }
                  }
                  transition={{
                    repeat: isRibbonCut ? 0 : Infinity,
                    duration: 2.2,
                    ease: "easeInOut",
                  }}
                >
                  <Scissors className="w-10 h-10 text-[#2B1B17] drop-shadow-sm" />
                </motion.div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2B1B17] mt-0.5">
                  Cut Ribbon
                </span>
              </motion.button>
            </div>

            {/* Confetti Explosion Burst */}
            {isRibbonCut && (
              <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
                {confetti.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                    animate={{
                      x: p.x,
                      y: p.y,
                      opacity: 0,
                      scale: 0.3,
                      rotate: p.rotate,
                    }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    style={{
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                      borderRadius: p.id % 2 === 0 ? "50%" : "2px",
                    }}
                    className="absolute shadow-lg"
                  />
                ))}
              </div>
            )}

            {/* Pulsing prompt */}
            <div className="mt-8 flex items-center gap-2 text-xs font-medium text-amber-200/90 animate-pulse">
              <Scissors className="w-4 h-4 text-amber-300" />
              <span>Tap the golden scissors to snip the ribbon!</span>
            </div>
          </div>

          {/* Bottom Footnote */}
          <div className="relative z-10 text-center">
            <span className="text-[11px] font-sans text-cream/40 tracking-wider">
              Prepared especially for Her by Captain • 2026
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PHASE 2: THE ANIMATED CINEMA MOVIE JOURNEY               */}
      {/* ======================================================== */}
      {phase === "movie" && (
        <div
          className={`relative w-full h-full flex flex-col justify-between bg-gradient-to-b ${SCENES[activeScene].theme} transition-colors duration-1000 overflow-hidden`}
        >
          {/* Floating Starlight / Bokeh particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-sakura/15 rounded-full blur-[90px] animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-sage/15 rounded-full blur-[100px] animate-pulse" />
          </div>

          {/* TOP STORY HEADER & PROGRESS BARS */}
          <div className="relative z-20 p-4 pt-[max(1rem,env(safe-area-inset-top))] space-y-3">
            {/* Story Bars (5-6 segment progress bars) */}
            <div className="flex items-center gap-1.5 w-full max-w-lg mx-auto">
              {SCENES.map((s, idx) => (
                <div
                  key={s.id}
                  className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden cursor-pointer"
                  onClick={() => {
                    setActiveScene(idx);
                    setSceneProgress(0);
                  }}
                >
                  <div
                    className="h-full bg-sakura transition-all duration-100 ease-linear"
                    style={{
                      width:
                        idx < activeScene
                          ? "100%"
                          : idx === activeScene
                          ? `${sceneProgress}%`
                          : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Act Title & Player Controls */}
            <div className="flex items-center justify-between max-w-lg mx-auto px-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-mono tracking-widest text-amber-200">
                  {SCENES[activeScene].badge}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Play / Pause toggle */}
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  aria-label={isPlaying ? "Pause tour" : "Play tour"}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5 ml-0.5" />
                  )}
                </button>

                {/* Skip / Close */}
                <button
                  type="button"
                  onClick={handleComplete}
                  aria-label="Skip movie and enter app"
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-sans text-white/80 hover:text-white flex items-center gap-1"
                >
                  <span>Skip</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* CENTER CINEMATIC ANIMATION STAGE (The Living App World) */}
          {/* ======================================================== */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
            <AnimatePresence mode="wait">
              {/* SCENE 1: THE LIVING RIVER (Flow & Schedule) */}
              {activeScene === 0 && (
                <motion.div
                  key="scene-river"
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full flex flex-col items-center space-y-5"
                >
                  {/* Floating River Graphic */}
                  <div className="relative w-full h-44 rounded-3xl bg-gradient-to-r from-sage/20 via-matcha/20 to-sage/30 border border-sage/40 shadow-2xl p-4 flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between text-xs text-sage dark:text-matcha font-mono">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-4 h-4" />
                        <span>Daily River IST</span>
                      </span>
                      <span className="font-bold">09:00 - 21:00</span>
                    </div>

                    {/* Animated Floating Task Blocks bobbing on river waves */}
                    <div className="space-y-2 relative">
                      <motion.div
                        animate={{ x: [-8, 8, -8] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-between text-xs shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">☀️</span>
                          <span className="font-medium text-white">Morning Flex Bank</span>
                        </div>
                        <span className="text-[11px] font-mono text-matcha font-bold">
                          +1h 30m Banked
                        </span>
                      </motion.div>

                      <motion.div
                        animate={{ x: [8, -8, 8] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                        className="p-2.5 rounded-xl bg-sage/30 backdrop-blur-md border border-sage/50 flex items-center justify-between text-xs shadow-md"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">📚</span>
                          <span className="font-semibold text-white">Deep Study Block</span>
                        </div>
                        <span className="text-[11px] font-mono text-white/80">
                          10:00 - 12:30
                        </span>
                      </motion.div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-white/60">
                      <span>Tap &apos;Customize&apos; to reshape anytime</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SCENE 2: THE ZEN COCOON (Focus & Rain Ambience) */}
              {activeScene === 1 && (
                <motion.div
                  key="scene-zen"
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full flex flex-col items-center space-y-4"
                >
                  {/* Glowing Breathing Circle Orb */}
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    {/* Concentric Breathing Pulses */}
                    <motion.div
                      animate={{ scale: [1, 1.45, 1], opacity: [0.2, 0.6, 0.2] }}
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full bg-gradient-to-br from-sage/30 to-matcha/40 blur-xl"
                    />

                    <motion.div
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                      className="w-36 h-36 rounded-full bg-gradient-to-tr from-sage/40 via-matcha/50 to-cream/20 border-2 border-matcha/60 shadow-[0_0_50px_rgba(178,208,182,0.4)] flex flex-col items-center justify-center text-center p-4 backdrop-blur-md"
                    >
                      <motion.span
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 6, repeat: Infinity }}
                        className="font-serif text-sm font-semibold text-white tracking-wider"
                      >
                        breathe in...
                      </motion.span>
                      <span className="text-[10px] font-sans text-matcha mt-1">
                        4s rhythm
                      </span>
                    </motion.div>

                    {/* Retro Desk Flip Clock Badge */}
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -bottom-2 px-3 py-1 rounded-xl bg-[#1C1A17] border border-[#3A3833] shadow-lg flex items-center gap-1.5 text-xs font-mono text-cream"
                    >
                      <Clock className="w-3.5 h-3.5 text-matcha" />
                      <span className="font-bold">25:00 • Zen Active</span>
                    </motion.div>
                  </div>

                  {/* 20-20-20 Care Badge */}
                  <div className="px-3.5 py-1.5 rounded-full bg-matcha/15 border border-matcha/30 text-matcha text-xs font-medium flex items-center gap-1.5 mt-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Automated 20-20-20 eye care breaks included</span>
                  </div>
                </motion.div>
              )}

              {/* SCENE 3: THE HEARTBEAT BRIDGE (Sanctuary Chat & Touch) */}
              {activeScene === 2 && (
                <motion.div
                  key="scene-sanctuary"
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full flex flex-col items-center space-y-4"
                >
                  {/* Floating Developing Polaroid + Audio Waveform */}
                  <div className="relative w-52 bg-white rounded-2xl p-2.5 pb-5 shadow-[0_15px_40px_rgba(244,194,200,0.35)] -rotate-3 border-2 border-sakura/60">
                    {/* Viewfinder photo with animated glow */}
                    <div className="relative aspect-square w-full rounded-xl bg-gradient-to-tr from-sakura/40 via-[#F8B5C0] to-cream/80 overflow-hidden flex flex-col items-center justify-center text-center p-2">
                      <Camera className="w-8 h-8 text-mocha/70 mb-1" />
                      <span className="font-serif text-xs font-bold text-mocha">
                        Single-View Polaroid
                      </span>
                      <span className="text-[10px] font-sans text-mocha/70">
                        Vashes in 30s once viewed
                      </span>
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/40 text-[9px] text-white font-mono">
                        LIVE
                      </div>
                    </div>
                    <div className="pt-2 text-center">
                      <span className="font-serif text-xs text-[#3A2E2B] font-semibold">
                        &quot;Forever yours ❤️&quot;
                      </span>
                    </div>
                  </div>

                  {/* Reactive Frequency Bars for Voice Notes */}
                  <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-black/40 border border-sakura/40 backdrop-blur-md">
                    <Volume2 className="w-4 h-4 text-sakura" />
                    <div className="flex items-center gap-1 h-5">
                      {[14, 24, 18, 28, 12, 22, 16, 26, 20].map((h, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: [6, h, 6] }}
                          transition={{
                            duration: 0.8 + (i % 3) * 0.2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="w-1 rounded-full bg-sakura"
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-mono text-sakura ml-1">0:14</span>
                  </div>
                </motion.div>
              )}

              {/* SCENE 4: THE BLOOMING BONSAI (Growth & Love Coupons) */}
              {activeScene === 3 && (
                <motion.div
                  key="scene-growth"
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full flex flex-col items-center space-y-4"
                >
                  {/* Blooming Tree Graphic */}
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.08, 1], rotate: [0, 2, -2, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      className="text-7xl select-none filter drop-shadow-[0_10px_20px_rgba(255,215,0,0.3)]"
                    >
                      🪴
                    </motion.div>
                    {/* Floating Blossom Sparkles */}
                    <div className="absolute inset-0 pointer-events-none">
                      <motion.div
                        animate={{ y: [-10, 10, -10], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute top-2 right-4 text-sakura text-lg"
                      >
                        🌸
                      </motion.div>
                      <motion.div
                        animate={{ y: [10, -10, 10], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 3.5, repeat: Infinity }}
                        className="absolute bottom-4 left-2 text-amber-300 text-lg"
                      >
                        ✨
                      </motion.div>
                    </div>
                  </div>

                  {/* Golden Unlocked Love Voucher Card */}
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/20 border border-amber-300/60 shadow-xl text-left space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-serif font-bold text-amber-200">
                        🎉 Milestone Streak Reward
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-100 font-mono">
                        Redeemable
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🍨</span>
                      <div>
                        <h4 className="text-xs font-serif font-semibold text-white">
                          Midnight Dessert & Long Drive
                        </h4>
                        <p className="text-[10px] text-cream/70">
                          Redeemable with Captain anytime with zero expiration.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* SCENE 5: THE LIGHTHOUSE BEACON (SOS & Whispers) */}
              {activeScene === 4 && (
                <motion.div
                  key="scene-sos"
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full flex flex-col items-center space-y-5"
                >
                  {/* Glowing SOS Heart Beacon */}
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full border-2 border-rose-500"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.1, 0.6] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                      className="absolute inset-0 rounded-full border border-rose-400"
                    />

                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 shadow-[0_0_40px_rgba(244,63,94,0.6)] flex items-center justify-center text-white">
                      <Heart className="w-12 h-12 fill-white animate-pulse" />
                    </div>
                  </div>

                  {/* Reassurance Droplets Floating Down */}
                  <div className="space-y-1.5 w-full">
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                      className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center text-xs text-white/90 shadow-sm"
                    >
                      💌 &quot;You are doing amazing. Take a breath, I am right here.&quot;
                    </motion.div>
                    <div className="text-center">
                      <span className="text-[11px] text-rose-300/80 font-mono">
                        Instant notification dispatched to Captain
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SCENE 6: THE FINALE (Welcome Home) */}
              {activeScene === 5 && (
                <motion.div
                  key="scene-finale"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full flex flex-col items-center space-y-5 text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sakura via-[#F8A5B2] to-amber-300 p-1 shadow-[0_0_50px_rgba(244,194,200,0.5)] flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-[#1A1412] flex items-center justify-center text-sakura">
                      <Sparkles className="w-10 h-10 animate-spin" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#FFF5EB] leading-tight">
                      Your Sanctuary Awaits 🌸
                    </h3>
                    <p className="text-xs text-cream/70 max-w-xs leading-relaxed">
                      Every tool, button, and sound was crafted to bring stillness to your heart and focus to your mind.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleComplete}
                    className="w-full h-13 py-3 rounded-2xl bg-gradient-to-r from-sakura via-[#F49FAF] to-sage text-[#2B1B17] font-bold text-sm shadow-[0_4px_25px_rgba(244,194,200,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
                  >
                    <span>Enter Komorebi Now</span>
                    <Heart className="w-4 h-4 fill-[#2B1B17]" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ======================================================== */}
          {/* BOTTOM MOVIE NARRATION & CINEMA SUBTITLE CONSOLE         */}
          {/* ======================================================== */}
          <div className="relative z-20 p-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col space-y-3">
            {/* Movie Subtitle Card */}
            <div className="w-full max-w-lg mx-auto bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-1.5 shadow-2xl">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-serif font-bold ${SCENES[activeScene].accent}`}>
                  {SCENES[activeScene].title}
                </span>
              </div>
              <p className="text-xs font-sans text-cream/90 leading-relaxed">
                {SCENES[activeScene].narration}
              </p>
            </div>

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between w-full max-w-lg mx-auto pt-1">
              <button
                type="button"
                onClick={handlePrevScene}
                disabled={activeScene === 0}
                className="h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-medium text-white flex items-center gap-1 active:scale-95 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Act</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs text-white/50 font-mono">
                <span>{activeScene + 1}</span>
                <span>/</span>
                <span>{SCENES.length}</span>
              </div>

              {activeScene < SCENES.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextScene}
                  className="h-10 px-4 rounded-xl bg-sakura hover:bg-sakura/90 text-mocha font-bold text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
                >
                  <span>Next Act</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-sakura to-amber-300 text-mocha font-bold text-xs flex items-center gap-1 shadow-md active:scale-95 transition-all"
                >
                  <span>Enter</span>
                  <Heart className="w-3.5 h-3.5 fill-current" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
