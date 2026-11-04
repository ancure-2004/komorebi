"use client";

import React, { useState } from "react";
import { Bell, BellRing, Check } from "lucide-react";
import { requestNotificationPermission, playChime } from "@/lib/notifications";
import { haptics } from "@/lib/haptics";

export interface NotificationBellProps {
  variant?: "icon" | "toggle" | "button";
  className?: string;
}

export default function NotificationBell({
  variant = "icon",
  className = "",
}: NotificationBellProps) {
  const [supported] = useState(() => {
    if (typeof window !== "undefined") {
      return "Notification" in window;
    }
    return true;
  });

  const [granted, setGranted] = useState(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission === "granted";
    }
    return false;
  });

  const handleClick = async () => {
    haptics.medium();
    const result = await requestNotificationPermission();
    setGranted(result);
    if (result) {
      haptics.success();
      playChime("drop");
    }
  };

  if (!supported) return null;

  // 1. Icon Only Variant (For Captain Header or Icon-Bar)
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={granted ? "Notifications active" : "Enable browser notifications"}
        title={granted ? "Sanctuary alerts active" : "Tap to enable notifications in browser"}
        className={`relative w-10 h-10 min-h-[40px] min-w-[40px] rounded-xl bg-paper dark:bg-obsidian border border-[#EBE7DF] dark:border-[#383530] flex items-center justify-center text-ink dark:text-cream active:scale-90 transition-all shadow-sm ${className}`}
      >
        {granted ? (
          <>
            <Bell className="w-4 h-4 text-sage" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-sage ring-2 ring-paper dark:ring-obsidian" />
          </>
        ) : (
          <BellRing className="w-4 h-4 text-sakura animate-bounce" />
        )}
      </button>
    );
  }

  // 2. Toggle Switch Variant (For Settings Page)
  if (variant === "toggle") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95 ${
          granted
            ? "bg-sage/10 text-sage dark:text-matcha border-sage/30"
            : "bg-sakura/20 text-mocha dark:text-cream border-sakura animate-pulse hover:bg-sakura/40 shadow-sm"
        } ${className}`}
      >
        {granted ? (
          <>
            <Check className="w-3.5 h-3.5 text-sage" />
            <span>Alerts Active</span>
          </>
        ) : (
          <>
            <BellRing className="w-3.5 h-3.5 text-sakura animate-bounce" />
            <span>Enable Alerts 🔔</span>
          </>
        )}
      </button>
    );
  }

  // 3. Button Variant
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={granted ? "Notifications active" : "Enable browser notifications"}
      title={granted ? "Sanctuary alerts active" : "Tap to allow notifications in Chrome"}
      className={`min-h-[44px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95 ${
        granted
          ? "bg-sage/10 text-sage dark:text-matcha border-sage/30"
          : "bg-sakura/30 text-mocha border-sakura animate-pulse hover:bg-sakura/50 shadow-sm"
      } ${className}`}
    >
      {granted ? (
        <>
          <Check className="w-3.5 h-3.5 text-sage flex-shrink-0" />
          <span className="hidden sm:inline">Alerts Active</span>
        </>
      ) : (
        <>
          <BellRing className="w-3.5 h-3.5 text-mocha flex-shrink-0 animate-bounce" />
          <span>Enable Alerts 🔔</span>
        </>
      )}
    </button>
  );
}
