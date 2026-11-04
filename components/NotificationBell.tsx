"use client";

import React, { useState, useEffect } from "react";
import { Bell, BellRing, Check } from "lucide-react";
import { requestNotificationPermission, hasNotificationPermission, playChime } from "@/lib/notifications";
import { haptics } from "@/lib/haptics";

export interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = "" }: NotificationBellProps) {
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
