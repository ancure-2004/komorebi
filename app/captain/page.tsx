"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  Heart,
  MessageCircle,
  LogOut,
  Sparkles,
  ArrowLeft,
  Shield,
  Loader2,
} from "lucide-react";
import { supabase, useSession } from "@/lib/supabase";

import Live from "@/components/captain/Live";
import Dispatcher from "@/components/captain/Dispatcher";
import NoteEditor from "@/components/captain/NoteEditor";
import CapsuleScheduler from "@/components/captain/CapsuleScheduler";
import CouponManager from "@/components/captain/CouponManager";
import SyncOrb from "@/components/ldr/SyncOrb";
import Chat from "@/components/ldr/Chat";
import NotificationBell from "@/components/NotificationBell";

export default function CaptainPortalPage() {
  const router = useRouter();
  const session = useSession();
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const handleOpenChat = () => setIsChatOpen(true);
    window.addEventListener("komorebi:open-chat", handleOpenChat);
    return () => window.removeEventListener("komorebi:open-chat", handleOpenChat);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Loading state
  if (!session.ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-mocha">
        <Loader2 className="w-8 h-8 text-sage animate-spin" />
      </div>
    );
  }

  // Access check: only role 'captain' can view this portal
  if (session.role !== "captain") {
    return (
      <div className="min-h-screen max-w-md mx-auto flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-sakura/20 text-sakura flex items-center justify-center">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-xl font-bold text-ink dark:text-cream">
          Captain Access Restricted
        </h2>
        <p className="text-xs text-ink/65 dark:text-cream/65 font-sans max-w-xs leading-relaxed">
          This portal is reserved exclusively for Captain&apos;s dispatch and LDR bridge controls.
        </p>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-xl bg-sage text-cream text-xs font-medium hover:bg-sage/90"
        >
          Sign In as Captain
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto px-4 pt-5 pb-24 space-y-5 select-none safe">
      {/* Top Header */}
      <header className="flex items-center justify-between pb-3.5 border-b border-[#EBE7DF] dark:border-[#383530]">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-xl text-ink/60 dark:text-cream/60 hover:text-ink"
            aria-label="Back to App Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-lg font-bold text-ink dark:text-cream leading-tight">
                Captain Portal ⚓
              </span>
            </div>
            <p className="text-[11px] font-sans text-sage dark:text-matcha mt-0.5">
              Connected to Her Sanctuary Bridge
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification Bell Icon */}
          <NotificationBell variant="icon" />

          {/* Quick Chat Open */}
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            aria-label="Open Sanctuary Chat"
            className="min-h-[44px] px-3.5 rounded-xl bg-sage text-cream text-xs font-medium flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat</span>
          </button>

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#EBE7DF] dark:border-[#383530] text-ink/50 dark:text-cream/50 hover:text-ink"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 1. Her Live Status & SOS Banner */}
      <Live onOpenChat={() => setIsChatOpen(true)} />

      {/* 2. Quick Drops & Study Whispers Dispatcher */}
      <Dispatcher />

      {/* 3. Sync Touch Orb for Captain */}
      <div className="p-5 rounded-2xl bg-paper dark:bg-obsidian border border-sage/30 text-center space-y-3">
        <h4 className="font-serif text-sm font-semibold text-ink dark:text-cream">
          Live Heartbeat Sync Touch
        </h4>
        <SyncOrb me="captain" />
      </div>

      {/* 4. Morning Letter & Polaroid Editor */}
      <NoteEditor />

      {/* 5. Schedule Time-Locked Capsules */}
      <CapsuleScheduler />

      {/* 6. Love Coupon Fulfillment Tracker */}
      <CouponManager />

      {/* Sanctuary Chat Modal */}
      <Chat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}
