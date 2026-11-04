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
  /** Optional override for current streak. If omitted, calculated from store days and today. */
  currentStreak?: number;
  /** Optional external coupon list. If omitted, uses local/mock storage. */
  coupons?: Coupon[];
  /** Optional callback invoked upon redemption. */
  onRedeem?: (couponId: string) => Promise<void> | void;
  /** Custom CSS classes for container. */
  className?: string;
}

const LOCAL_STORAGE_KEY = "komorebi:coupons:v1";

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

  // Compute active streak: props take precedence, fallback to stats helper
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

  const saveCoupons = (newList: Coupon[]) => {
    setCouponsList(newList);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
    } catch {
      // Ignore quota errors
    }
  };

  const handleRedeemConfirm = async (coupon: Coupon) => {
    setRedeemingId(coupon.id);
    const nowIso = new Date().toISOString();

    // Trigger sweet confetti celebration
    try {
      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.6 },
        colors: ["#F4C2C8", "#7D9D8B", "#98B2A0", "#FDFBF7"],
      });
    } catch {
      // Ignore if canvas is unavailable
    }

    try {
      await onRedeem?.(coupon.id);
    } catch {
      // Continue with local redemption even if remote network fails
    }

    const updated = couponsList.map((c) =>
      c.id === coupon.id ? { ...c, redeemedAt: nowIso } : c
    );
    saveCoupons(updated);

    setRedeemingId(null);
    setSelectedCoupon(null);
    setJustRedeemedTitle(coupon.title);

    // Clear confirmation banner after 6 seconds
    setTimeout(() => {
      setJustRedeemedTitle(null);
    }, 6000);
  };

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

      {/* Coupon Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {couponsList.map((c) => {
          const isUnlocked = activeStreak >= c.unlockStreak;
          const isRedeemed = Boolean(c.redeemedAt);

          return (
            <div
              key={c.id}
              className={`relative rounded-xl p-4 flex flex-col justify-between transition-all duration-200 border ${
                isRedeemed
                  ? "bg-paper/50 dark:bg-obsidian/40 border-[#EBE7DF] dark:border-[#383530] opacity-75"
                  : isUnlocked
                  ? "bg-cream dark:bg-obsidian border-sage/50 dark:border-matcha/40 shadow-sm hover:border-sage"
                  : "bg-paper/80 dark:bg-obsidian/60 border-dashed border-[#DDD7CD] dark:border-[#3A3731]"
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
                  ) : isUnlocked ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sage/15 text-[11px] font-semibold text-sage dark:text-matcha border border-sage/30">
                      <Sparkles className="w-3 h-3 text-sage" />
                      Ready to Use
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-paper dark:bg-obsidian text-[11px] font-medium text-ink/60 dark:text-cream/60 border border-[#EBE7DF] dark:border-[#383530]">
                      <Lock className="w-3 h-3 text-ink/40 dark:text-cream/40" />
                      {c.unlockStreak}-day streak
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
                ) : isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => setSelectedCoupon(c)}
                    className="w-full h-11 min-h-[44px] px-4 rounded-xl bg-sage hover:bg-sage/90 text-cream font-medium text-xs tracking-wide shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Gift className="w-4 h-4 text-cream" />
                    <span>Redeem Voucher</span>
                  </button>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-ink/60 dark:text-cream/60 mb-1.5">
                      <span>Progress</span>
                      <span>
                        {activeStreak} / {c.unlockStreak} days
                      </span>
                    </div>
                    {/* Visual streak progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-[#E8E4DB] dark:bg-[#383530] overflow-hidden">
                      <div
                        className="h-full bg-sage/60 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((activeStreak / c.unlockStreak) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail & Redemption Modal */}
      {selectedCoupon && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-mocha/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
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
