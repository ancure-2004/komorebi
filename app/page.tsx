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
  Sparkles,
} from "lucide-react";
import { fmtClock, minutesIST, todayKey } from "@/lib/time";
import { useNow } from "@/lib/hooks";
import { useApp } from "@/lib/store";

export type NavTab = "flow" | "focus" | "growth" | "sanctuary" | "settings";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("flow");
  const now = useNow(1000);
  const currentMin = minutesIST(now);
  const dateStr = todayKey(now);
  const { template } = useApp();

  const toggleTheme = () => {
    if (typeof document === "undefined") return;
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("komorebi:theme", isDark ? "dark" : "light");
    } catch {}
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto relative px-4 pt-6 pb-24 safe select-none">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between pb-4 border-b border-[#EBE7DF] dark:border-[#383530]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-serif text-sage font-semibold">木漏れ日</span>
            <span className="text-sm font-serif font-medium tracking-wide text-ink/70 dark:text-cream/70">
              Komorebi
            </span>
          </div>
          <p className="text-xs font-sans text-ink/50 dark:text-cream/50 mt-0.5">
            {dateStr} • {fmtClock(currentMin)} IST
          </p>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark/light theme"
          className="w-11 h-11 rounded-xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] flex items-center justify-center text-ink dark:text-cream active:scale-90 transition-all duration-150"
        >
          <Sun className="w-5 h-5 hidden dark:block text-matcha" />
          <Moon className="w-5 h-5 block dark:hidden text-sage" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-6">
        {activeTab === "flow" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-sage">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-semibold tracking-wider uppercase">Welcome</span>
              </div>
              <h2 className="text-xl font-serif font-semibold text-ink dark:text-cream">
                Study Sanctuary
              </h2>
              <p className="text-sm text-ink/70 dark:text-cream/70 mt-1 leading-relaxed">
                Your split-day timetable and peaceful focus companion. Foundation active with {template.length} scheduled blocks.
              </p>
            </div>
          </div>
        )}

        {activeTab === "focus" && (
          <div className="rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-6 text-center space-y-3">
            <Timer className="w-8 h-8 text-sage mx-auto" />
            <h3 className="text-lg font-serif font-semibold text-ink dark:text-cream">Focus Mode</h3>
            <p className="text-xs text-ink/60 dark:text-cream/60">
              Pomodoro engine & soundscapes will mount here.
            </p>
          </div>
        )}

        {activeTab === "growth" && (
          <div className="rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-6 text-center space-y-3">
            <Sprout className="w-8 h-8 text-matcha mx-auto" />
            <h3 className="text-lg font-serif font-semibold text-ink dark:text-cream">Growth & Bonsai</h3>
            <p className="text-xs text-ink/60 dark:text-cream/60">
              Bonsai garden and streak heatmap will mount here.
            </p>
          </div>
        )}

        {activeTab === "sanctuary" && (
          <div className="rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-6 text-center space-y-3">
            <HeartHandshake className="w-8 h-8 text-sakura mx-auto" />
            <h3 className="text-lg font-serif font-semibold text-ink dark:text-cream">LDR Sanctuary</h3>
            <p className="text-xs text-ink/60 dark:text-cream/60">
              Live presence and disappearing notes will mount here.
            </p>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-6 space-y-4">
            <h3 className="text-lg font-serif font-semibold text-ink dark:text-cream">Settings</h3>
            <div className="space-y-3 text-sm text-ink/80 dark:text-cream/80">
              <div className="flex items-center justify-between py-2 border-b border-[#EBE7DF] dark:border-[#383530]">
                <span>App Version</span>
                <span className="font-mono text-xs text-sage">v1.0.0</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Timezone</span>
                <span className="font-mono text-xs text-sage">Asia/Kolkata (IST)</span>
              </div>
            </div>
          </div>
        )}
      </main>

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
                ? "text-sage font-medium"
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
                ? "text-sage font-medium"
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
                ? "text-matcha font-medium"
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
                ? "text-sakura font-medium"
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
                ? "text-sage font-medium"
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
