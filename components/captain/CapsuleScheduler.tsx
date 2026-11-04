"use client";

import React, { useState, useRef } from "react";
import { Hourglass, Sparkles, Check, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toSquareJpeg, uploadCapsulePhoto } from "@/lib/media";
import { haptics } from "@/lib/haptics";

export interface CapsuleSchedulerProps {
  className?: string;
}

export default function CapsuleScheduler({ className = "" }: CapsuleSchedulerProps) {
  const [title, setTitle] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [unlockDateTime, setUnlockDateTime] = useState("");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const squareJpeg = await toSquareJpeg(file, 720, 0.85);
      setPhotoBlob(squareJpeg);
      setPhotoPreview(URL.createObjectURL(squareJpeg));
      haptics.light();
    } catch (err) {
      console.warn("Failed to process photo:", err);
    }
  };

  const handleScheduleCapsule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !bodyText.trim() || !unlockDateTime || isSaving) return;

    setIsSaving(true);
    haptics.medium();

    try {
      const capsuleId = crypto.randomUUID();
      let photoPath: string | null = null;

      if (photoBlob) {
        const { path } = await uploadCapsulePhoto(capsuleId, photoBlob);
        photoPath = path;
      }

      // Convert local datetime to ISO instant with IST offset
      const unlockAt = new Date(unlockDateTime).toISOString();

      const { error } = await supabase.from("capsules").insert({
        id: capsuleId,
        title: title.trim(),
        body: bodyText.trim(),
        media_path: photoPath,
        unlock_at: unlockAt,
      });

      if (error) throw error;

      setSavedSuccess(true);
      haptics.success();

      setTitle("");
      setBodyText("");
      setUnlockDateTime("");
      setPhotoBlob(null);
      setPhotoPreview(null);

      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.warn("Failed to schedule capsule:", err);
      alert("Failed to schedule capsule. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`p-5 rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] space-y-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2">
        <Hourglass className="w-5 h-5 text-sage" />
        <h3 className="font-serif text-base font-semibold text-ink dark:text-cream">
          Schedule Time-Locked Capsule
        </h3>
      </div>

      <form onSubmit={handleScheduleCapsule} className="space-y-3.5">
        <div>
          <label className="text-xs font-semibold text-ink dark:text-cream block mb-1">
            Capsule Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Open after your chemistry mock test..."
            className="w-full h-11 px-3.5 rounded-xl bg-cream dark:bg-mocha border border-[#EBE7DF] dark:border-[#383530] text-xs sm:text-sm text-ink dark:text-cream focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-ink dark:text-cream block mb-1">
            Unlock Date & Time
          </label>
          <input
            type="datetime-local"
            value={unlockDateTime}
            onChange={(e) => setUnlockDateTime(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-cream dark:bg-mocha border border-[#EBE7DF] dark:border-[#383530] text-xs font-mono text-ink dark:text-cream focus:outline-none focus:ring-2 focus:ring-sage"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-ink dark:text-cream block mb-1">
            Secret Message
          </label>
          <textarea
            rows={3}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="What should she read when this capsule unseals?"
            className="w-full p-3 rounded-xl bg-cream dark:bg-mocha border border-[#EBE7DF] dark:border-[#383530] text-xs sm:text-sm text-ink dark:text-cream focus:outline-none focus:ring-2 focus:ring-sage resize-none"
          />
        </div>

        {/* Optional Surprise Photo */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-cream dark:bg-mocha/40 border border-[#EBE7DF] dark:border-[#383530]">
          <span className="text-xs font-medium text-ink dark:text-cream flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-sage" />
            {photoPreview ? "Surprise Photo Added" : "Add Surprise Photo (Optional)"}
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-paper dark:bg-obsidian border border-sage/40 text-[11px] font-medium text-sage hover:bg-sage/10 active:scale-95"
          >
            {photoPreview ? "Change" : "Browse"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>

        <button
          type="submit"
          disabled={!title.trim() || !bodyText.trim() || !unlockDateTime || isSaving}
          className="w-full h-11 min-h-[44px] rounded-xl bg-sage hover:bg-sage/90 text-cream font-medium text-xs tracking-wide shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Locking Time Capsule...</span>
            </>
          ) : savedSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Capsule Scheduled & Time-Locked!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Seal Time Capsule</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
