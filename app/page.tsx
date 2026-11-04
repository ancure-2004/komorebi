"use client";

import { useState } from "react";
import {
  CalendarClock,
  Timer,
  Sprout,
  HeartHandshake,
  Settings2,
  Moon,
  Sun,
  Flame,
  SlidersHorizontal,
  Compass,
  PieChart,
  List,
  Sparkles,
  Maximize2,
  Monitor,
} from "lucide-react";
import { fmtClock, minutesIST, todayKey } from "@/lib/time";
import { useNow } from "@/lib/hooks";
import { useApp, emptyDay } from "@/lib/store";
import { streak, totalFocusMs } from "@/lib/stats";
import { useRoom } from "@/lib/room";

// Flow Components
import Hero from "@/components/Hero";
import MorningFlex from "@/components/MorningFlex";
import Timeline from "@/components/Timeline";
import Sunburst from "@/components/Sunburst";
import ScheduleEditor from "@/components/ScheduleEditor";

// Focus Components
import Pomodoro from "@/components/focus/Pomodoro";
import Zen from "@/components/focus/Zen";
import DeskClock from "@/components/focus/DeskClock";
import BreakNudge from "@/components/focus/BreakNudge";
import BrainDump from "@/components/focus/BrainDump";
import SoundPanel from "@/components/sound/SoundPanel";

// Growth Components
import Bonsai from "@/components/growth/Bonsai";
import Heatmap from "@/components/growth/Heatmap";
import Coupons from "@/components/growth/Coupons";
import Reflection from "@/components/growth/Reflection";
import StoryCard from "@/components/growth/StoryCard";

// PWA
import PwaRegister from "@/components/PwaRegister";

export type NavTab = "flow" | "focus" | "growth" | "sanctuary" | "settings";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("flow");
  const [flowView, setFlowView] = useState<"river" | "sunburst">("river");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isZenOpen, setIsZenOpen] = useState(false);
  const [isDeskClockOpen, setIsDeskClockOpen] = useState(false);
  const [isBrainDumpOpen, setIsBrainDumpOpen] = useState(false);

  const now = useNow(1000);
  const currentMin = minutesIST(now);
  const dateStr = todayKey(now);
  const { days, template, startFocus } = useApp();
  const todayState = days[dateStr];
  const currentStreak = streak(days, dateStr);
  const room = useRoom();

  const toggleTheme = () => {
    if (typeof document === "undefined") return;
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("komorebi:theme", isDark ? "dark" : "light");
    } catch {}
  };

  const handleStartFocus = (blockId?: string) => {
    startFocus(blockId);
    setActiveTab("focus");
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto relative px-4 pt-5 pb-24 safe select-none">
      <PwaRegister />

      {/* Top Header Bar */}
      <header className="flex items-center justify-between pb-3.5 border-b border-[#EBE7DF] dark:border-[#383530]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-serif text-sage font-semibold tracking-tight">木漏れ日</span>
            <span className="text-sm font-serif font-medium tracking-wide text-ink/70 dark:text-cream/70">
              Komorebi
            </span>
          </div>
          <p className="text-[11px] font-sans text-ink/50 dark:text-cream/50 mt-0.5">
            {dateStr} • {fmtClock(currentMin)} IST
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Streak Indicator */}
          <div
            title={`${currentStreak} day streak`}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-paper dark:bg-obsidian border border-sage/20 text-xs font-medium text-sage dark:text-matcha"
          >
            <Flame className="w-3.5 h-3.5 text-sage fill-sage/20" />
            <span className="tabular-nums font-semibold">{currentStreak}</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark/light theme"
            className="w-10 h-10 rounded-xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] flex items-center justify-center text-ink dark:text-cream active:scale-90 transition-all duration-150"
          >
            <Sun className="w-4 h-4 hidden dark:block text-matcha" />
            <Moon className="w-4 h-4 block dark:hidden text-sage" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-4 space-y-5">
        {/* TAB 1: FLOW */}
        {activeTab === "flow" && (
          <div className="space-y-4">
            {/* Hero Card */}
            <Hero date={dateStr} onStartFocus={handleStartFocus} />

            {/* View Switcher & Customizer Bar */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1 p-1 rounded-xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530]">
                <button
                  onClick={() => setFlowView("river")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    flowView === "river"
                      ? "bg-sage text-cream shadow-sm"
                      : "text-ink/60 dark:text-cream/60 hover:text-ink"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>River</span>
                </button>
                <button
                  onClick={() => setFlowView("sunburst")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    flowView === "sunburst"
                      ? "bg-sage text-cream shadow-sm"
                      : "text-ink/60 dark:text-cream/60 hover:text-ink"
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5" />
                  <span>24h Sunburst</span>
                </button>
              </div>

              <button
                onClick={() => setIsEditorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] text-xs font-medium text-sage dark:text-matcha active:scale-95 transition-all"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Customize</span>
              </button>
            </div>

            {/* Morning Flex Bank (< 3:00 PM) */}
            <MorningFlex date={dateStr} />

            {/* Schedule View: River vs. Sunburst */}
            {flowView === "river" ? (
              <Timeline date={dateStr} onStartFocus={handleStartFocus} />
            ) : (
              <Sunburst date={dateStr} />
            )}

            {/* Schedule Editor Drawer Modal */}
            {isEditorOpen && (
              <div className="fixed inset-0 z-50 flex items-end justify-center bg-mocha/40 dark:bg-black/60 backdrop-blur-sm">
                <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl bg-cream dark:bg-mocha p-4 safe shadow-2xl">
                  <ScheduleEditor onClose={() => setIsEditorOpen(false)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FOCUS */}
        {activeTab === "focus" && (
          <div className="space-y-4">
            {/* Pomodoro Widget */}
            <Pomodoro onOpenZen={() => setIsZenOpen(true)} />

            {/* Zen & Desk Clock Triggers */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsZenOpen(true)}
                className="h-12 rounded-xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] flex items-center justify-center gap-2 text-xs font-medium text-ink dark:text-cream active:scale-95 transition-all"
              >
                <Maximize2 className="w-4 h-4 text-sage" />
                <span>Zen Mode</span>
              </button>

              <button
                onClick={() => setIsDeskClockOpen(true)}
                className="h-12 rounded-xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] flex items-center justify-center gap-2 text-xs font-medium text-ink dark:text-cream active:scale-95 transition-all"
              >
                <Monitor className="w-4 h-4 text-sage" />
                <span>Desk Clock</span>
              </button>
            </div>

            {/* Break Nudge (20-20-20 Rule) */}
            <BreakNudge autoShowOnBreak={true} />

            {/* Soundscape Panel */}
            <SoundPanel />

            {/* Overlays */}
            <Zen isOpen={isZenOpen} onClose={() => setIsZenOpen(false)} />
            <DeskClock forceOpen={isDeskClockOpen} onClose={() => setIsDeskClockOpen(false)} />
          </div>
        )}

        {/* TAB 3: GROWTH */}
        {activeTab === "growth" && (
          <div className="space-y-4">
            {/* Bonsai Plant Card */}
            <Bonsai
              doneBlocks={todayState?.doneBlockIds?.length ?? 0}
              pomodoros={todayState?.pomodoros ?? 0}
              flexMinutes={Math.floor((todayState?.flexLoggedMs ?? 0) / 60000)}
              bloom={Boolean(todayState?.goalMet)}
            />

            {/* Consistency Heatmap */}
            <Heatmap days={days} />

            {/* Love Coupons Vault */}
            <Coupons currentStreak={currentStreak} />

            {/* End-of-Day Reflection */}
            <Reflection
              date={dateStr}
              totalFocusMs={totalFocusMs(todayState ?? emptyDay(), now)}
              streakCount={currentStreak}
            />

            {/* Daily Story Card Generator */}
            <StoryCard date={dateStr} streak={currentStreak} />
          </div>
        )}

        {/* TAB 4: SANCTUARY */}
        {activeTab === "sanctuary" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-paper dark:bg-obsidian border border-sage/30 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sakura">
                  <HeartHandshake className="w-5 h-5" />
                  <span className="font-serif font-semibold text-base text-ink dark:text-cream">
                    Long-Distance Sanctuary
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-sage/10 text-sage dark:text-matcha">
                  {room.isSubscribed ? "Connected" : "Standing By"}
                </span>
              </div>

              <p className="text-xs text-ink/70 dark:text-cream/70 leading-relaxed">
                A private emotional bridge across the miles. During study sessions, silent whispers, floating hugs, and emergency support are kept one tap away.
              </p>

              <div className="p-3.5 rounded-xl bg-cream/60 dark:bg-mocha/60 border border-[#EBE7DF] dark:border-[#383530] flex items-center justify-between text-xs">
                <span className="text-ink/60 dark:text-cream/60">Live Presence</span>
                <span className="font-medium text-sage dark:text-matcha flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sage animate-ping" />
                  Studying Under The Same Sky
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] text-center space-y-2">
              <Sparkles className="w-6 h-6 text-sage mx-auto" />
              <h4 className="text-sm font-serif font-semibold text-ink dark:text-cream">
                Phase 3 LDR Bridge Ready
              </h4>
              <p className="text-xs text-ink/60 dark:text-cream/60 max-w-xs mx-auto">
                Real-time Sync Touch, disappearing Polaroids, one-time voice notes, and Morning Envelope are scaffolded and ready for your go-ahead.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-5 space-y-4">
              <h3 className="text-base font-serif font-semibold text-ink dark:text-cream flex items-center gap-2">
                <Compass className="w-4 h-4 text-sage" />
                <span>Operating Preferences</span>
              </h3>

              <div className="space-y-3 text-xs text-ink/80 dark:text-cream/80">
                <div className="flex items-center justify-between py-2 border-b border-[#EBE7DF] dark:border-[#383530]">
                  <span>App Version</span>
                  <span className="font-mono text-sage">v1.0.0 (Phase 2)</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#EBE7DF] dark:border-[#383530]">
                  <span>Clock Timezone</span>
                  <span className="font-mono text-sage">Asia/Kolkata (IST)</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-[#EBE7DF] dark:border-[#383530]">
                  <span>Offline Storage</span>
                  <span className="text-matcha font-medium">LocalStorage Active</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span>PWA Standalone</span>
                  <span className="text-sage font-medium">Enabled (Chrome / Android)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Brain Dump Trigger */}
      <BrainDump
        isOpen={isBrainDumpOpen}
        onToggle={() => setIsBrainDumpOpen(!isBrainDumpOpen)}
        showFloatingTrigger={true}
      />

      {/* Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-cream/95 dark:bg-mocha/95 backdrop-blur-md border-t border-[#EBE7DF] dark:border-[#383530] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 h-16">
          <button
            onClick={() => setActiveTab("flow")}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === "flow"
                ? "text-sage font-semibold"
                : "text-ink/40 dark:text-cream/40 hover:text-ink/70"
            }`}
          >
            <CalendarClock className="w-5 h-5" />
            <span className="text-[11px] font-sans">Flow</span>
          </button>

          <button
            onClick={() => setActiveTab("focus")}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === "focus"
                ? "text-sage font-semibold"
                : "text-ink/40 dark:text-cream/40 hover:text-ink/70"
            }`}
          >
            <Timer className="w-5 h-5" />
            <span className="text-[11px] font-sans">Focus</span>
          </button>

          <button
            onClick={() => setActiveTab("growth")}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === "growth"
                ? "text-matcha font-semibold"
                : "text-ink/40 dark:text-cream/40 hover:text-ink/70"
            }`}
          >
            <Sprout className="w-5 h-5" />
            <span className="text-[11px] font-sans">Growth</span>
          </button>

          <button
            onClick={() => setActiveTab("sanctuary")}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === "sanctuary"
                ? "text-sakura font-semibold"
                : "text-ink/40 dark:text-cream/40 hover:text-ink/70"
            }`}
          >
            <HeartHandshake className="w-5 h-5" />
            <span className="text-[11px] font-sans">Sanctuary</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`min-h-[48px] flex flex-col items-center justify-center gap-1 transition-colors ${
              activeTab === "settings"
                ? "text-sage font-semibold"
                : "text-ink/40 dark:text-cream/40 hover:text-ink/70"
            }`}
          >
            <Settings2 className="w-5 h-5" />
            <span className="text-[11px] font-sans">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
