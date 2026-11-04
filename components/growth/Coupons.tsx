"use client";

import React, { useState, useEffect, useMemo } from "react";
import confetti from "canvas-confetti";
import {
  Ticket,
  Lock,
  Gift,
  Sparkles,
  Check,
  X,
  Flame,
  Heart,
  CalendarCheck,
  Award,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { streak } from "@/lib/stats";
import { todayKey } from "@/lib/time";
import { useHydrated } from "@/lib/hooks";

export interface Coupon {
  id: string;
  title: string;
  emoji: string;
  description: string;
  unlockStreak: number;
  redeemedAt?: string | null;
  terms?: string;
}

export interface CouponsProps {
  currentStreak?: number;
  coupons?: Coupon[];
  onRedeem?: (couponId: string) => Promise<void> | void;
  className?: string;
}

const LOCAL_STORAGE_KEY = "komorebi:coupons:v1";
const CELEBRATED_STORAGE_KEY = "komorebi:coupons:celebrated:v1";

const DEFAULT_COUPONS: Coupon[] = [
  {
    id: "boba-date",
    title: "Boba Date",
    emoji: "🧋",
    unlockStreak: 3,
    description:
      "A sweet iced boba tea date with your favorite brown sugar boba & cheese foam toppings, anywhere you want.",
    terms: "Valid anytime. 100% on Captain's treat.",
    redeemedAt: null,
  },
  {
    id: "ice-cream",
    title: "Late-Night Ice Cream",
    emoji: "🍨",
    unlockStreak: 5,
    description:
      "Spontaneous late-night ice cream run for double-scoop waffle cones to celebrate your relentless focus.",
    terms: "Redeemable after 10:00 PM for maximum spontaneous joy.",
    redeemedAt: null,
  },
  {
    id: "cooked-dinner",
    title: "Home-Cooked Dinner",
    emoji: "🍱",
    unlockStreak: 7,
    description:
      "A warm, nourishing 3-course dinner cooked specially for you by the Captain, plus zero dish duty.",
    terms: "Custom menu of your choice prepared with all my love.",
    redeemedAt: null,
  },
  {
    id: "movie-marathon",
    title: "Movie Marathon",
    emoji: "🍿",
    unlockStreak: 10,
    description:
      "Studio Ghibli or anime movie marathon night with plush blankets, fairy lights, and unlimited warm snacks.",
    terms: "Captain provides cozy pillows, snacks, and uninterrupted cuddles.",
    redeemedAt: null,
  },
];

export function Coupons({
  currentStreak: propStreak,
  coupons: propCoupons,
  onRedeem,
  className = "",
}: CouponsProps) {
  const isHydrated = useHydrated();
  const storeDays = useApp((s) => s.days);
  const today = todayKey();

  const activeStreak = useMemo(() => {
    if (typeof propStreak === "number") return propStreak;
    if (!isHydrated) return 0;
    return streak(storeDays, today);
  }, [propStreak, isHydrated, storeDays, today]);

  // Manage coupons state with localStorage fallback
  const [couponsList, setCouponsList] = useState<Coupon[]>(() => {
    if (propCoupons && propCoupons.length > 0) return propCoupons;
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Coupon[];
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_COUPONS;
  });

  // Track coupons whose unlock animation was already celebrated
  const [celebratedIds, setCelebratedIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(CELEBRATED_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [justRedeemedTitle, setJustRedeemedTitle] = useState<string | null>(null);

  const [prevProps, setPrevProps] = useState(propCoupons);
  if (propCoupons && propCoupons !== prevProps) {
    setPrevProps(propCoupons);
    if (propCoupons.length > 0) {
      setCouponsList(propCoupons);
    }
  }

  // Derive newly unlocked coupon for "You Won This!" celebration without extra state
  const newlyUnlocked = useMemo(() => {
    if (!isHydrated || activeStreak <= 0) return null;
    return (
      couponsList.find(
        (c) => activeStreak >= c.unlockStreak && !celebratedIds.includes(c.id)
      ) ?? null
    );
  }, [isHydrated, activeStreak, couponsList, celebratedIds]);

  // Trigger celebration confetti side-effect when a new coupon is unlocked
  useEffect(() => {
    if (newlyUnlocked) {
      try {
        confetti({
          particleCount: 160,
          spread: 100,
          origin: { y: 0.55 },
          colors: ["#F4C2C8", "#7D9D8B", "#98B2A0", "#FDFBF7"],
        });
      } catch {}
    }
  }, [newlyUnlocked]);

  const handleDismissCelebration = (couponId: string) => {
    const updated = [...new Set([...celebratedIds, couponId])];
    setCelebratedIds(updated);
    try {
      localStorage.setItem(CELEBRATED_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const saveCoupons = (newList: Coupon[]) => {
    setCouponsList(newList);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
    } catch {}
  };

  const handleRedeemConfirm = async (coupon: Coupon) => {
    setRedeemingId(coupon.id);
    const nowIso = new Date().toISOString();

    try {
      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#F4C2C8", "#7D9D8B", "#98B2A0", "#FDFBF7"],
      });
    } catch {}

    try {
      await onRedeem?.(coupon.id);
    } catch {}

    const updated = couponsList.map((c) =>
      c.id === coupon.id ? { ...c, redeemedAt: nowIso } : c
    );
    saveCoupons(updated);

    setRedeemingId(null);
    setSelectedCoupon(null);
    setJustRedeemedTitle(coupon.title);

    setTimeout(() => {
      setJustRedeemedTitle(null);
    }, 6000);
  };

  // Only revealed/unlocked coupons are shown to preserve surprise!
  const unlockedCoupons = couponsList.filter((c) => activeStreak >= c.unlockStreak);
  const nextLockedCoupon = couponsList.find((c) => activeStreak < c.unlockStreak);

  return (
    <div
      className={`rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-4 sm:p-5 shadow-sm transition-colors duration-200 ${className}`}
    >
      {/* Header & Streak Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-sage" />
            <h3 className="font-serif text-lg sm:text-xl font-medium text-ink dark:text-cream tracking-tight">
              Love Coupon Vault
            </h3>
          </div>
          <p className="text-xs text-ink/70 dark:text-cream/70 font-sans mt-0.5">
            Earned milestone rewards from Captain for study consistency
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream dark:bg-mocha/80 border border-sage/40 text-xs font-semibold text-ink dark:text-cream self-start sm:self-auto shadow-sm">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>{activeStreak} Day Streak</span>
        </div>
      </div>

      {/* Just Redeemed Alert Banner */}
      {justRedeemedTitle && (
        <div className="mb-4 p-3.5 rounded-xl bg-sage/15 border border-sage/40 flex items-center gap-2.5 text-xs text-ink dark:text-cream animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 text-sage flex-shrink-0" />
          <div>
            <span className="font-semibold">{justRedeemedTitle}</span> redeemed!
            Captain has been notified to fulfill your request. ❤️
          </div>
        </div>
      )}

      {/* Unlocked Coupons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {unlockedCoupons.map((c) => {
          const isRedeemed = Boolean(c.redeemedAt);

          return (
            <div
              key={c.id}
              className={`relative rounded-xl p-4 flex flex-col justify-between transition-all duration-200 border ${
                isRedeemed
                  ? "bg-paper/50 dark:bg-obsidian/40 border-[#EBE7DF] dark:border-[#383530] opacity-75"
                  : "bg-cream dark:bg-obsidian border-sage/50 dark:border-matcha/40 shadow-sm hover:border-sage"
              }`}
            >
              <div>
                {/* Top Badge: Emoji & Status */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl select-none" role="img" aria-label={c.title}>
                    {c.emoji}
                  </span>

                  {isRedeemed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-paper dark:bg-obsidian text-[11px] font-semibold text-ink/70 dark:text-cream/70 border border-[#EBE7DF] dark:border-[#383530]">
                      <Check className="w-3 h-3 text-sage" />
                      Redeemed 🌸
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sage/15 text-[11px] font-semibold text-sage dark:text-matcha border border-sage/30">
                      <Sparkles className="w-3 h-3 text-sage" />
                      Ready to Use
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h4 className="font-serif text-base font-semibold text-ink dark:text-cream mt-2.5">
                  {c.title}
                </h4>
                <p className="text-xs text-ink/80 dark:text-cream/80 font-sans mt-1 leading-relaxed">
                  {c.description}
                </p>
              </div>

              {/* Bottom Action Area */}
              <div className="mt-4 pt-3 border-t border-[#EBE7DF]/80 dark:border-[#383530]/80">
                {isRedeemed ? (
                  <div className="text-[11px] text-ink/60 dark:text-cream/60 flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-sage" />
                    <span>Redeemed and recorded with Captain</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedCoupon(c)}
                    className="w-full h-11 min-h-[44px] px-4 rounded-xl bg-sage hover:bg-sage/90 text-cream font-medium text-xs tracking-wide shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Gift className="w-4 h-4 text-cream" />
                    <span>Redeem Voucher</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Secret Next Mystery Reward Card (Keeps unachieved coupons hidden) */}
        {nextLockedCoupon && (
          <div className="relative rounded-xl p-4 border border-dashed border-[#DDD7CD] dark:border-[#3A3731] bg-paper/60 dark:bg-obsidian/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-3xl select-none" role="img" aria-label="Mystery Reward">
                  🎁
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-paper dark:bg-obsidian text-[11px] font-medium text-ink/60 dark:text-cream/60 border border-[#EBE7DF] dark:border-[#383530]">
                  <Lock className="w-3 h-3 text-sage" />
                  Secret Surprise
                </span>
              </div>

              <h4 className="font-serif text-base font-semibold text-ink/85 dark:text-cream/85 mt-2.5">
                Secret Love Reward
              </h4>
              <p className="text-xs text-ink/65 dark:text-cream/65 font-sans mt-1 leading-relaxed">
                A surprise reward prepared by Captain will reveal itself when you hit a{" "}
                <span className="font-semibold text-sage dark:text-matcha">
                  {nextLockedCoupon.unlockStreak}-day streak
                </span>
                !
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[#EBE7DF]/80 dark:border-[#383530]/80">
              <div className="flex items-center justify-between text-[11px] text-ink/60 dark:text-cream/60 mb-1.5">
                <span>Streak Progress</span>
                <span className="font-mono font-medium">
                  {activeStreak} / {nextLockedCoupon.unlockStreak} days
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#E8E4DB] dark:bg-[#383530] overflow-hidden">
                <div
                  className="h-full bg-sage rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((activeStreak / nextLockedCoupon.unlockStreak) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State when no coupons are unlocked yet */}
      {unlockedCoupons.length === 0 && !nextLockedCoupon && (
        <div className="p-6 text-center rounded-xl bg-paper/50 dark:bg-obsidian/30 border border-dashed border-[#DDD7CD] dark:border-[#3A3731]">
          <Gift className="w-7 h-7 text-sage mx-auto mb-2 opacity-60" />
          <p className="font-serif text-sm font-medium text-ink dark:text-cream">
            All secret rewards are resting in the vault.
          </p>
          <p className="text-xs text-ink/60 dark:text-cream/60 mt-1">
            Build your study streak to unlock sweet surprises from Captain!
          </p>
        </div>
      )}

      {/* "YOU WON THIS!" Unlock Celebration Modal */}
      {newlyUnlocked && (
        <div
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-[100dvh] z-50 flex items-center justify-center p-4 bg-mocha/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl bg-cream dark:bg-obsidian border border-sakura/50 dark:border-sakura/40 shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200 space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sakura/20 text-sakura mx-auto">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-sakura/20 text-[11px] font-semibold text-ink dark:text-cream uppercase tracking-wider mb-2">
                🎉 Milestone Unlocked!
              </span>
              <h3 className="font-serif text-2xl font-bold text-ink dark:text-cream leading-tight">
                You Won This!
              </h3>
              <p className="text-xs text-ink/75 dark:text-cream/75 mt-1 font-sans">
                You hit a {newlyUnlocked.unlockStreak}-day streak! Captain prepared this special reward for you:
              </p>
            </div>

            {/* Revealed Voucher Card */}
            <div className="p-4 rounded-2xl bg-paper dark:bg-mocha/60 border border-sage/40 dark:border-matcha/30 shadow-sm text-left">
              <div className="flex items-center gap-3">
                <span className="text-4xl select-none" role="img" aria-label={newlyUnlocked.title}>
                  {newlyUnlocked.emoji}
                </span>
                <div>
                  <h4 className="font-serif text-lg font-semibold text-ink dark:text-cream">
                    {newlyUnlocked.title}
                  </h4>
                  <span className="text-[11px] font-sans text-sage dark:text-matcha font-medium">
                    {newlyUnlocked.unlockStreak}-Day Streak Reward
                  </span>
                </div>
              </div>
              <p className="text-xs text-ink/80 dark:text-cream/80 font-sans mt-3 leading-relaxed">
                {newlyUnlocked.description}
              </p>
              {newlyUnlocked.terms && (
                <div className="mt-3 pt-2.5 border-t border-[#DDD7CD] dark:border-[#3A3731] flex items-center gap-2 text-[11px] text-ink/70 dark:text-cream/70">
                  <Heart className="w-3.5 h-3.5 text-sakura flex-shrink-0" />
                  <span>{newlyUnlocked.terms}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleDismissCelebration(newlyUnlocked.id)}
              className="w-full h-12 min-h-[44px] rounded-xl bg-sage hover:bg-sage/90 text-cream font-medium text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Claim & Save to Vault</span>
            </button>
          </div>
        </div>
      )}

      {/* Detail & Redemption Modal */}
      {selectedCoupon && (
        <div
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-[100dvh] z-50 flex items-center justify-center p-4 bg-mocha/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="coupon-modal-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-paper dark:bg-obsidian border border-sage/40 shadow-2xl p-5 sm:p-6 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-2">
              <span className="text-4xl select-none" role="img" aria-label={selectedCoupon.title}>
                {selectedCoupon.emoji}
              </span>
              <button
                type="button"
                onClick={() => setSelectedCoupon(null)}
                aria-label="Close coupon modal"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-ink/70 dark:text-cream/70 hover:bg-sage/10 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voucher Aesthetics */}
            <div className="mt-3 text-center">
              <div className="inline-block px-3 py-1 rounded-full bg-sage/15 text-[11px] font-semibold text-sage dark:text-matcha uppercase tracking-wider mb-2">
                Official Love Voucher
              </div>
              <h3
                id="coupon-modal-title"
                className="font-serif text-2xl font-semibold text-ink dark:text-cream"
              >
                {selectedCoupon.title}
              </h3>
              <p className="text-xs text-ink/80 dark:text-cream/80 font-sans mt-2 leading-relaxed">
                {selectedCoupon.description}
              </p>
            </div>

            {/* Terms of Love */}
            {selectedCoupon.terms && (
              <div className="mt-4 p-3 rounded-xl bg-cream dark:bg-mocha/60 border border-dashed border-[#DDD7CD] dark:border-[#3A3731] text-[11px] text-ink/70 dark:text-cream/70 flex items-center gap-2">
                <Heart className="w-3.5 h-3.5 text-sakura flex-shrink-0" />
                <span>{selectedCoupon.terms}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={redeemingId === selectedCoupon.id}
                onClick={() => handleRedeemConfirm(selectedCoupon)}
                className="w-full h-11 min-h-[44px] px-5 rounded-xl bg-sage hover:bg-sage/90 text-cream font-medium text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-cream" />
                <span>
                  {redeemingId === selectedCoupon.id
                    ? "Redeeming..."
                    : "Confirm Redemption"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCoupon(null)}
                className="w-full h-11 min-h-[44px] px-4 rounded-xl bg-transparent text-ink/70 dark:text-cream/70 font-medium text-xs hover:bg-sage/10 active:scale-95 transition-all"
              >
                Keep for Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Coupons;
