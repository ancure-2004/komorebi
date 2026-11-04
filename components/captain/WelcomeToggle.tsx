"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Eye, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useRoom } from "@/lib/room";
import { haptics } from "@/lib/haptics";
import WelcomeExperience from "@/components/welcome/WelcomeExperience";

export default function WelcomeToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const room = useRoom();

  useEffect(() => {
    let mounted = true;
    async function checkStatus() {
      try {
        const res = await fetch("/api/welcome");
        const json = await res.json().catch(() => ({}));
        if (mounted && typeof json?.enabled === "boolean") {
          setEnabled(json.enabled);
        }
      } catch (err) {
        console.warn("Could not check welcome status:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    checkStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const handleToggle = async () => {
    haptics.medium();
    const nextState = !enabled;
    setIsSaving(true);
    try {
      const res = await fetch("/api/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setEnabled(nextState);
        room.send("welcome_toggle", { enabled: nextState });
      }
    } catch (err) {
      console.warn("Could not update welcome status:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="p-5 rounded-2xl bg-paper dark:bg-obsidian border border-sakura/40 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sakura/20 text-sakura flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-serif text-sm font-semibold text-ink dark:text-cream leading-tight">
                Grand Welcome Ceremony & Tour
              </h4>
              <p className="text-[11px] font-sans text-ink/60 dark:text-cream/60">
                Ribbon cutting & guided feature walkthrough for Her
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={loading || isSaving}
            onClick={handleToggle}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors flex-shrink-0 ${
              enabled
                ? "bg-sakura justify-end"
                : "bg-paper dark:bg-obsidian border border-ink/20 justify-start"
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 text-cream animate-spin" />
            ) : (
              <span className="w-4 h-4 rounded-full bg-cream shadow-sm" />
            )}
          </button>
        </div>

        {/* Live Status Description */}
        <div className="p-3 rounded-xl bg-cream/60 dark:bg-mocha/60 border border-[#EBE7DF] dark:border-[#383530] flex items-start gap-2 text-xs font-sans">
          {enabled ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-sakura flex-shrink-0 mt-0.5" />
              <div className="text-ink/80 dark:text-cream/80">
                <span className="font-semibold text-sakura">Active:</span> Next time she logs in or opens the app, she will experience the ceremonial ribbon cutting & guided tour. It will then automatically turn off.
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-ink/40 dark:text-cream/40 flex-shrink-0 mt-0.5" />
              <div className="text-ink/60 dark:text-cream/60">
                <span className="font-semibold text-ink/80 dark:text-cream/80">Off:</span> Standard dashboard entry without walkthrough. Toggle on anytime you wish to re-welcome her.
              </div>
            </>
          )}
        </div>

        {/* Preview Experience Button */}
        <button
          type="button"
          onClick={() => {
            haptics.light();
            setPreviewOpen(true);
          }}
          className="w-full py-2.5 rounded-xl border border-sakura/50 text-sakura font-medium text-xs hover:bg-sakura/10 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview Ribbon Cutting & Tour Now</span>
        </button>
      </div>

      {/* Preview Modal */}
      <WelcomeExperience
        isOpen={previewOpen}
        onComplete={() => setPreviewOpen(false)}
        previewMode={true}
      />
    </>
  );
}
