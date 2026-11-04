"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Download, Share2, Sparkles, Image as ImageIcon, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { todayKey, fmtHM } from "@/lib/time";
import { totalFocusMs, streak } from "@/lib/stats";
import { useHydrated } from "@/lib/hooks";

export interface StoryCardProps {
  /** Formatted date string or YYYY-MM-DD. Defaults to today's date in IST. */
  date?: string;
  /** Formatted study hours string (e.g. "5h 30m"). Defaults to today's total focus. */
  studyHours?: string;
  /** Anime watched duration or title (e.g. "1h 00m" or "1h"). Defaults to anime block time or "1h". */
  animeWatched?: string;
  /** Mood emojis array (e.g. ["😊", "😌"]). Defaults to today's mood or fallback. */
  mood?: string[];
  /** Consecutive streak count. Defaults to calculated streak. */
  streak?: number;
  /** Optional custom CSS classes. */
  className?: string;
  /** Optional callback after image download or share. */
  onDownloaded?: () => void;
}

// Mini Bonsai coordinates scaled for 1080x1920 canvas
const MINI_BONSAI_LEAVES: [number, number][] = [
  [540, 680],
  [510, 695],
  [570, 695],
  [540, 720],
  [480, 720],
  [600, 720],
  [510, 745],
  [570, 750],
  [450, 750],
  [630, 710],
  [650, 740],
  [610, 770],
  [430, 785],
  [470, 785],
  [500, 800],
  [400, 800],
  [620, 790],
  [660, 775],
  [440, 815],
  [580, 795],
];

/**
 * Draws the high-res 1080x1920 Instagram Story graphic onto an HTML5 Canvas.
 */
function renderStoryToCanvas(
  canvas: HTMLCanvasElement,
  data: {
    date: string;
    studyHours: string;
    animeWatched: string;
    mood: string[];
    streak: number;
  }
) {
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Background linear gradient: Warm Cream (#FDFBF7) -> Matcha (#98B2A0)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
  bgGrad.addColorStop(0, "#FDFBF7");
  bgGrad.addColorStop(0.35, "#F7F4EE");
  bgGrad.addColorStop(0.7, "#B4CEBC");
  bgGrad.addColorStop(1, "#8CA895");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Elegant Outer Border Frame (Japanese stationery style)
  ctx.save();
  ctx.strokeStyle = "rgba(125, 157, 139, 0.4)";
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, 984, 1824);

  ctx.strokeStyle = "rgba(125, 157, 139, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(58, 58, 964, 1804);
  ctx.restore();

  // 3. Header Section
  ctx.textAlign = "center";
  ctx.fillStyle = "#7D9D8B";
  ctx.font = "600 36px sans-serif";
  ctx.fillText("KOMOREBI • 木漏れ日", 540, 160);

  ctx.fillStyle = "#1F1E1B";
  ctx.font = "600 82px Georgia, serif";
  ctx.fillText("Daily Growth Journal", 540, 260);

  ctx.fillStyle = "#3A3833";
  ctx.font = "400 44px sans-serif";
  ctx.fillText(data.date, 540, 335);

  // Decorative header divider line
  ctx.beginPath();
  ctx.moveTo(340, 380);
  ctx.lineTo(740, 380);
  ctx.strokeStyle = "rgba(125, 157, 139, 0.45)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // 4. Mini Bonsai Illustration
  ctx.save();
  // Soil shadow
  ctx.beginPath();
  ctx.ellipse(540, 890, 100, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(58, 56, 51, 0.12)";
  ctx.fill();

  // Ceramic / Terracotta Pot
  ctx.fillStyle = "#B08968";
  // Pot Rim
  ctx.fillRect(455, 835, 170, 14);
  // Pot Body
  ctx.beginPath();
  ctx.moveTo(465, 849);
  ctx.lineTo(615, 849);
  ctx.lineTo(595, 890);
  ctx.lineTo(485, 890);
  ctx.closePath();
  ctx.fill();

  // Bonsai Trunk
  ctx.beginPath();
  ctx.moveTo(540, 840);
  ctx.bezierCurveTo(540, 780, 510, 750, 530, 710);
  ctx.bezierCurveTo(540, 680, 560, 660, 540, 630);
  ctx.strokeStyle = "#6B4F3A";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.stroke();

  // Bonsai Left Branch
  ctx.beginPath();
  ctx.moveTo(530, 740);
  ctx.bezierCurveTo(500, 725, 470, 715, 450, 690);
  ctx.lineWidth = 9;
  ctx.stroke();

  // Bonsai Right Branch
  ctx.beginPath();
  ctx.moveTo(535, 700);
  ctx.bezierCurveTo(570, 685, 600, 675, 620, 650);
  ctx.lineWidth = 9;
  ctx.stroke();

  // Bonsai Leaves / Sakura Buds
  MINI_BONSAI_LEAVES.forEach(([lx, ly], i) => {
    ctx.beginPath();
    ctx.arc(lx, ly, 18, 0, Math.PI * 2);
    // Alternate sakura pink and matcha green
    ctx.fillStyle = i % 3 === 0 ? "#F4C2C8" : "#7D9D8B";
    ctx.fill();
    ctx.strokeStyle = "#5F7F6E";
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  ctx.restore();

  // 5. Main Study Metric Bento Card
  ctx.save();
  const cardX = 140;
  const cardY = 940;
  const cardW = 800;
  const cardH = 290;
  const radius = 32;

  // Card background with rounded corners
  ctx.fillStyle = "rgba(253, 251, 247, 0.92)";
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, radius);
  ctx.fill();
  ctx.strokeStyle = "rgba(125, 157, 139, 0.5)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Card Content
  ctx.fillStyle = "#7D9D8B";
  ctx.font = "600 34px sans-serif";
  ctx.fillText("TOTAL STUDY TIME", 540, 1010);

  ctx.fillStyle = "#1F1E1B";
  ctx.font = "700 130px sans-serif";
  ctx.fillText(data.studyHours, 540, 1145);

  ctx.fillStyle = "#3A3833";
  ctx.font = "400 36px sans-serif";
  ctx.fillText("focused study & flow today", 540, 1200);
  ctx.restore();

  // 6. Dual Sub-Metrics: Anime Watched & Streak
  const subY = 1270;
  const subW = 385;
  const subH = 220;

  // Left Sub-Card: Anime Wind Down
  ctx.save();
  ctx.fillStyle = "rgba(253, 251, 247, 0.92)";
  ctx.beginPath();
  ctx.roundRect(140, subY, subW, subH, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(125, 157, 139, 0.5)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = "#3A3833";
  ctx.font = "500 30px sans-serif";
  ctx.fillText("ANIME WIND DOWN", 140 + subW / 2, subY + 60);

  ctx.fillStyle = "#1F1E1B";
  ctx.font = "700 70px sans-serif";
  ctx.fillText(`🍿 ${data.animeWatched}`, 140 + subW / 2, subY + 140);

  ctx.fillStyle = "#5F5D56";
  ctx.font = "400 26px sans-serif";
  ctx.fillText("guilt-free rest", 140 + subW / 2, subY + 185);
  ctx.restore();

  // Right Sub-Card: Daily Streak
  ctx.save();
  ctx.fillStyle = "rgba(253, 251, 247, 0.92)";
  ctx.beginPath();
  ctx.roundRect(555, subY, subW, subH, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(125, 157, 139, 0.5)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = "#3A3833";
  ctx.font = "500 30px sans-serif";
  ctx.fillText("STUDY STREAK", 555 + subW / 2, subY + 60);

  ctx.fillStyle = "#1F1E1B";
  ctx.font = "700 70px sans-serif";
  ctx.fillText(`🔥 ${data.streak} Days`, 555 + subW / 2, subY + 140);

  ctx.fillStyle = "#5F5D56";
  ctx.font = "400 26px sans-serif";
  ctx.fillText("unbroken consistency", 555 + subW / 2, subY + 185);
  ctx.restore();

  // 7. Mood Badge Section
  ctx.save();
  ctx.fillStyle = "#1F1E1B";
  ctx.font = "500 34px sans-serif";
  ctx.fillText("TODAY'S MOOD & FEELINGS", 540, 1555);

  const moodString = data.mood.length > 0 ? data.mood.join("   ") : "😊   🌿";
  ctx.font = "90px sans-serif";
  ctx.fillText(moodString, 540, 1665);
  ctx.restore();

  // 8. Loving Footer
  ctx.save();
  ctx.fillStyle = "#1F1E1B";
  ctx.font = "italic 400 36px Georgia, serif";
  ctx.fillText('"Gently growing, one leaf at a time."', 540, 1765);

  ctx.fillStyle = "rgba(31, 30, 27, 0.75)";
  ctx.font = "400 28px sans-serif";
  ctx.fillText("Crafted with love for my superstar • Komorebi", 540, 1815);
  ctx.restore();
}

export function StoryCard({
  date: propDate,
  studyHours: propStudyHours,
  animeWatched: propAnimeWatched = "1h 00m",
  mood: propMood,
  streak: propStreak,
  className = "",
  onDownloaded,
}: StoryCardProps) {
  const isHydrated = useHydrated();
  const storeDays = useApp((s) => s.days);
  const today = todayKey();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  // Resolve active props with store fallbacks
  const activeDate = useMemo(() => {
    if (propDate) return propDate;
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date());
    } catch {
      return today;
    }
  }, [propDate, today]);

  const activeStudyHours = useMemo(() => {
    if (propStudyHours) return propStudyHours;
    if (!isHydrated) return "0h 00m";
    const dState = storeDays[today];
    return dState ? fmtHM(totalFocusMs(dState)) : "0h 00m";
  }, [propStudyHours, isHydrated, storeDays, today]);

  const activeMood = useMemo(() => {
    if (propMood && propMood.length > 0) return propMood;
    if (!isHydrated) return ["😊", "😌"];
    const dState = storeDays[today];
    return dState?.mood && dState.mood.length > 0 ? dState.mood : ["😊", "😌"];
  }, [propMood, isHydrated, storeDays, today]);

  const activeStreak = useMemo(() => {
    if (typeof propStreak === "number") return propStreak;
    if (!isHydrated) return 1;
    return Math.max(1, streak(storeDays, today));
  }, [propStreak, isHydrated, storeDays, today]);

  // Redraw canvas whenever data updates
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    renderStoryToCanvas(canvasRef.current, {
      date: activeDate,
      studyHours: activeStudyHours,
      animeWatched: propAnimeWatched,
      mood: activeMood,
      streak: activeStreak,
    });
  }, [activeDate, activeStudyHours, propAnimeWatched, activeMood, activeStreak]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // 1-Tap Download Handler
  const handleDownload = async () => {
    if (!canvasRef.current) return;
    setIsRendering(true);

    canvasRef.current.toBlob((blob) => {
      setIsRendering(false);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `komorebi-story-${todayKey()}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      onDownloaded?.();
      setTimeout(() => setDownloadSuccess(false), 4000);
    }, "image/png");
  };

  // Web Share API handler (if supported by browser/mobile device)
  const handleShare = async () => {
    if (!canvasRef.current) return;

    if (navigator.share && navigator.canShare) {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `komorebi-story-${todayKey()}.png`, {
          type: "image/png",
        });

        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Komorebi Daily Story",
              text: "My daily study and focus summary from Komorebi 🌿",
            });
            onDownloaded?.();
            return;
          } catch {
            // User cancelled share dialog, ignore
          }
        }
        // Fallback to direct download
        handleDownload();
      }, "image/png");
    } else {
      // Fallback
      handleDownload();
    }
  };

  return (
    <div
      className={`rounded-2xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] p-4 sm:p-5 shadow-sm transition-colors duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-sage" />
          <h3 className="font-serif text-lg sm:text-xl font-medium text-ink dark:text-cream tracking-tight">
            Daily Story Card
          </h3>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sage/15 text-sage dark:text-matcha">
          1080 × 1920 HD
        </span>
      </div>

      <p className="text-xs text-ink/70 dark:text-cream/70 font-sans mb-4">
        High-resolution 9:16 Instagram Story image with your study hours, anime wind down, and mood
      </p>

      {/* Visual Preview Container */}
      <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-cream dark:bg-mocha/40 border border-[#EBE7DF] dark:border-[#383530]">
        <div className="relative w-full max-w-[240px] aspect-[9/16] rounded-xl overflow-hidden shadow-lg border border-sage/40">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-cover block"
            aria-label="Instagram Story Preview"
          />
        </div>

        {/* Action Buttons */}
        <div className="w-full mt-4 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            disabled={isRendering}
            onClick={handleDownload}
            className={`w-full sm:flex-1 h-11 min-h-[44px] px-4 rounded-xl font-medium text-xs sm:text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 ${
              downloadSuccess
                ? "bg-matcha text-ink dark:text-mocha"
                : "bg-sage text-cream hover:bg-sage/90"
            }`}
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Story (PNG)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="w-full sm:w-auto h-11 min-h-[44px] px-4 rounded-xl bg-sage/10 dark:bg-sage/20 hover:bg-sage/20 text-sage dark:text-matcha font-medium text-xs sm:text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default StoryCard;
