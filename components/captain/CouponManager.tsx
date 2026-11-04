"use client";

import React, { useState, useEffect } from "react";
import { Ticket, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { supabase, Coupon } from "@/lib/supabase";
import { haptics } from "@/lib/haptics";

export interface CouponManagerProps {
  className?: string;
}

export default function CouponManager({ className = "" }: CouponManagerProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadCoupons() {
      try {
        const { data } = await supabase
          .from("coupons")
          .select("*")
          .order("created_at", { ascending: true });

        if (data && mounted) {
          setCoupons(data as Coupon[]);
        }
      } catch (err) {
        console.warn("Could not load coupons:", err);
      }
    }

    loadCoupons();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className={`p-5 rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] space-y-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2">
        <Ticket className="w-5 h-5 text-sakura" />
        <h3 className="font-serif text-base font-semibold text-ink dark:text-cream">
          Love Coupon Fulfillment Tracker
        </h3>
      </div>

      <div className="space-y-2.5">
        {coupons.length === 0 ? (
          <p className="text-xs text-ink/50 dark:text-cream/50 italic py-2">
            No remote coupons found in database. Using local default rewards.
          </p>
        ) : (
          coupons.map((c) => {
            const isRedeemed = Boolean(c.redeemed_at);

            return (
              <div
                key={c.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  isRedeemed
                    ? "bg-sakura/10 border-sakura/40 shadow-sm"
                    : "bg-cream dark:bg-mocha/40 border-[#EBE7DF] dark:border-[#383530]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl select-none">{c.emoji || "🎟️"}</span>
                  <div>
                    <h4 className="font-serif text-sm font-semibold text-ink dark:text-cream">
                      {c.title}
                    </h4>
                    <p className="text-[11px] text-ink/60 dark:text-cream/60">
                      {c.description || `${c.unlock_streak || 3}-day streak reward`}
                    </p>
                  </div>
                </div>

                {isRedeemed ? (
                  <span className="px-3 py-1 rounded-full bg-sakura text-mocha text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Redeemed! Treat Her ❤️</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-paper dark:bg-obsidian text-[11px] font-mono text-ink/50 border border-[#EBE7DF] flex-shrink-0">
                    Awaiting Streak
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
