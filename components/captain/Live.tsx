"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, HeartHandshake, ShieldAlert, Sparkles, UserCheck, Wifi } from "lucide-react";
import { supabase, UserStatus } from "@/lib/supabase";
import { useRoom } from "@/lib/room";
import { haptics } from "@/lib/haptics";

export interface LiveProps {
  onOpenChat: () => void;
  className?: string;
}

export default function Live({ onOpenChat, className = "" }: LiveProps) {
  const room = useRoom();
  const [herStatus, setHerStatus] = useState<UserStatus | null>(null);
  const [sosAlert, setSosAlert] = useState(false);

  // Listen to SOS broadcast on room
  useEffect(() => {
    const unregister = room.registerHandlers({
      onSos: () => {
        setSosAlert(true);
        haptics.heavy();
      },
    });

    return () => unregister();
  }, [room]);

  // Fetch Her last-known status from database and subscribe
  useEffect(() => {
    let mounted = true;

    async function fetchStatus() {
      try {
        const { data, error } = await supabase
          .from("status")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data && mounted) {
          setHerStatus(data as UserStatus);
        }
      } catch (err) {
        console.warn("Could not fetch her status:", err);
      }
    }

    fetchStatus();

    // Subscribe to status changes
    const channel = supabase
      .channel("her-status-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "status" },
        (payload) => {
          if (mounted && payload.new) {
            setHerStatus(payload.new as UserStatus);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const herPresence = room.presence["her"]?.[0] as Record<string, unknown> | undefined;
  const isOnline = Boolean(herPresence) || room.isSubscribed;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* SOS Alert Banner */}
      {sosAlert && (
        <div className="p-4 rounded-2xl bg-sakura text-mocha border border-sakura/80 shadow-aura animate-pulse flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-mocha flex-shrink-0" />
            <div>
              <h4 className="font-serif font-bold text-sm">
                🚨 She Tapped Emergency SOS!
              </h4>
              <p className="text-xs font-sans mt-0.5">
                She needs your immediate comfort and presence.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSosAlert(false);
              onOpenChat();
            }}
            className="px-4 py-2 rounded-xl bg-mocha text-cream font-semibold text-xs active:scale-95 transition-all flex-shrink-0"
          >
            Open Chat Now
          </button>
        </div>
      )}

      {/* Live Presence & Telemetry Card */}
      <div className="p-5 rounded-2xl bg-paper dark:bg-obsidian border border-sage/30 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-sage" />
            <h3 className="font-serif text-base font-semibold text-ink dark:text-cream">
              Her Live Telemetry
            </h3>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              isOnline
                ? "bg-sage/15 text-sage dark:text-matcha border border-sage/30"
                : "bg-paper dark:bg-obsidian text-ink/50 dark:text-cream/50 border border-[#EBE7DF]"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-sage animate-ping" : "bg-ink/30"
              }`}
            />
            <span>{isOnline ? "Studying Now" : "Resting / Idle"}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-cream dark:bg-mocha/50 border border-[#EBE7DF] dark:border-[#383530]">
            <span className="text-[11px] text-ink/50 dark:text-cream/50 block">
              Current Activity
            </span>
            <span className="font-serif text-sm font-semibold text-ink dark:text-cream mt-0.5 block truncate">
              {herStatus?.label || "Flexible Morning Study"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-cream dark:bg-mocha/50 border border-[#EBE7DF] dark:border-[#383530]">
            <span className="text-[11px] text-ink/50 dark:text-cream/50 block">
              Focus Mode
            </span>
            <span className="font-serif text-sm font-semibold text-sage dark:text-matcha mt-0.5 block">
              {herStatus?.pomodoro || herStatus?.pomodoro_active
                ? "🍅 Deep Focus Active"
                : "🌿 Quiet Flow"}
            </span>
          </div>
        </div>

        {herStatus?.updated_at && (
          <p className="text-[10px] text-ink/40 dark:text-cream/40 text-right">
            Last heartbeat: {new Date(herStatus.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
}
