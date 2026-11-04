"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Sparkles, KeyRound, Loader2, ArrowRight } from "lucide-react";
import { supabase, useSession } from "@/lib/supabase";
import { haptics } from "@/lib/haptics";

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Auto redirect if already signed in
  useEffect(() => {
    if (session.ready && session.uid) {
      if (session.role === "captain") {
        router.push("/captain");
      } else {
        router.push("/");
      }
    }
  }, [session, router]);

  // Email + Password Sign-In
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || isSubmitting) return;

    setIsSubmitting(true);
    setAuthError(null);
    haptics.light();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      haptics.success();

      // Check role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.role === "captain") {
        router.push("/captain");
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Magic Link OTP Fallback
  const handleMagicLink = async () => {
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setAuthError(null);
    haptics.light();

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });

      if (error) throw error;

      setMagicLinkSent(true);
      haptics.success();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col justify-center px-6 py-12 select-none safe">
      {/* Brand Header */}
      <div className="text-center space-y-2 mb-8">
        <span className="font-serif text-3xl text-sage font-medium tracking-wider">
          木漏れ日
        </span>
        <h1 className="font-serif text-2xl font-bold text-ink dark:text-cream tracking-tight">
          Welcome to Komorebi
        </h1>
        <p className="text-xs text-ink/60 dark:text-cream/60 font-sans max-w-xs mx-auto">
          Private study timetable & long-distance companion bridge across the miles.
        </p>
      </div>

      {/* Auth Card */}
      <div className="rounded-3xl bg-paper dark:bg-obsidian border border-sage/30 p-6 shadow-sm space-y-5">
        {magicLinkSent ? (
          <div className="text-center py-4 space-y-3 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-sage/20 text-sage mx-auto flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-ink dark:text-cream">
              Check Your Inbox!
            </h3>
            <p className="text-xs text-ink/70 dark:text-cream/70 font-sans leading-relaxed">
              We sent a private sign-in link to <span className="font-semibold text-sage">{email}</span>. Click it to enter your sanctuary immediately.
            </p>
            <button
              type="button"
              onClick={() => setMagicLinkSent(false)}
              className="text-xs text-sage font-medium hover:underline pt-2 block mx-auto"
            >
              Sign in with password instead
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordSignIn} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-ink dark:text-cream block mb-1">
                Account Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-cream dark:bg-mocha border border-[#EBE7DF] dark:border-[#383530] text-xs sm:text-sm text-ink dark:text-cream focus:outline-none focus:ring-2 focus:ring-sage"
                />
                <Mail className="w-4 h-4 text-ink/40 dark:text-cream/40 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink dark:text-cream block mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-cream dark:bg-mocha border border-[#EBE7DF] dark:border-[#383530] text-xs sm:text-sm text-ink dark:text-cream focus:outline-none focus:ring-2 focus:ring-sage"
                />
                <Lock className="w-4 h-4 text-ink/40 dark:text-cream/40 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {authError && (
              <p className="text-xs text-sakura bg-sakura/10 p-2.5 rounded-xl text-center font-medium animate-in fade-in">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 min-h-[44px] rounded-xl bg-sage hover:bg-sage/90 text-cream font-medium text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={!email.trim() || isSubmitting}
                className="text-xs text-sage dark:text-matcha font-medium hover:underline disabled:opacity-40"
              >
                Send me a Magic Sign-In Link instead
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Quick Fast-Login Shortcuts for Local Dev */}
      <div className="mt-6 text-center space-y-2">
        <span className="text-[11px] text-ink/40 dark:text-cream/40 block">
          Quick Account Selector
        </span>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setEmail("sa.hinata792@gmail.com")}
            className="px-3 py-1.5 rounded-lg bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] text-[11px] text-ink/70 dark:text-cream/70 hover:border-sage"
          >
            🌸 Her Account
          </button>
          <button
            type="button"
            onClick={() => setEmail("ankur2004tyagi@gmail.com")}
            className="px-3 py-1.5 rounded-lg bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] text-[11px] text-ink/70 dark:text-cream/70 hover:border-sage"
          >
            ⚓ Captain Account
          </button>
        </div>
      </div>
    </div>
  );
}
