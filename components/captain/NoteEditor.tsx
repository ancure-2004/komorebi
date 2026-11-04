"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mail, Camera, Sparkles, Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { todayKey } from "@/lib/time";
import { toSquareJpeg, uploadDailyPolaroid } from "@/lib/media";
import { haptics } from "@/lib/haptics";

export interface NoteEditorProps {
  className?: string;
}

export default function NoteEditor({ className = "" }: NoteEditorProps) {
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [bodyText, setBodyText] = useState("");
  const [captionText, setCaptionText] = useState("");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing note for selected date
  useEffect(() => {
    let mounted = true;

    async function loadNote() {
      try {
        const { data } = await supabase
          .from("daily_notes")
          .select("*")
          .eq("date", selectedDate)
          .maybeSingle();

        if (data && mounted) {
          setBodyText(data.body || "");
          setCaptionText(data.caption || "");
        } else if (mounted) {
          setBodyText("");
          setCaptionText("");
        }
      } catch (err) {
        console.warn("Could not load note for date:", err);
      }
    }

    loadNote();
    return () => {
      mounted = false;
    };
  }, [selectedDate]);

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

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bodyText.trim() || isSaving) return;

    setIsSaving(true);
    haptics.medium();

    try {
      let polaroidPath: string | null = null;

      // 1. Upload photo to daily storage if attached
      if (photoBlob) {
        const { path } = await uploadDailyPolaroid(selectedDate, photoBlob);
        polaroidPath = path;
      }

      // 2. Upsert into daily_notes table
      const { error } = await supabase.from("daily_notes").upsert({
        date: selectedDate,
        body: bodyText.trim(),
        caption: captionText.trim() || null,
        polaroid_path: polaroidPath,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setSavedSuccess(true);
      haptics.success();
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.warn("Failed to save morning note:", err);
      alert("Failed to save note. Please verify Supabase connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`p-5 rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] space-y-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-sakura" />
          <h3 className="font-serif text-base font-semibold text-ink dark:text-cream">
            Morning Note & Polaroid Editor
          </h3>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-2.5 py-1 rounded-xl bg-cream dark:bg-mocha border border-[#EBE7DF] dark:border-[#383530] text-xs font-mono text-ink dark:text-cream"
        />
      </div>

      <form onSubmit={handleSaveNote} className="space-y-3.5">
        <div>
          <label className="text-xs font-semibold text-ink dark:text-cream block mb-1">
            Morning Letter Body
          </label>
          <textarea
            rows={4}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Write a sweet, encouraging letter for her morning envelope..."
            className="w-full p-3 rounded-xl bg-cream dark:bg-mocha border border-[#EBE7DF] dark:border-[#383530] text-xs sm:text-sm text-ink dark:text-cream focus:outline-none focus:ring-2 focus:ring-sage resize-none leading-relaxed"
          />
        </div>

        {/* Polaroid Attachment Section */}
        <div className="p-3 rounded-xl bg-cream dark:bg-mocha/40 border border-[#EBE7DF] dark:border-[#383530] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink dark:text-cream flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-sage" /> Attached Polaroid Photo
            </span>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-paper dark:bg-obsidian border border-sage/40 text-[11px] font-medium text-sage dark:text-matcha hover:bg-sage/10 active:scale-95"
            >
              {photoPreview ? "Change Photo" : "Upload Photo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          {photoPreview && (
            <div className="flex items-center gap-3 pt-1">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#DDD7CD] flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  placeholder="Secret back-of-photo caption..."
                  className="w-full h-10 px-3 rounded-lg bg-paper dark:bg-obsidian border border-[#EBE7DF] text-xs text-ink dark:text-cream focus:outline-none focus:ring-2 focus:ring-sage"
                />
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={!bodyText.trim() || isSaving}
          className="w-full h-11 min-h-[44px] rounded-xl bg-sage hover:bg-sage/90 text-cream font-medium text-xs tracking-wide shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sealing Envelope into Vault...</span>
            </>
          ) : savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-cream" />
              <span>Sealed & Saved for {selectedDate}!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-cream" />
              <span>Seal & Publish Morning Envelope</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
