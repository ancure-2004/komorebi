"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function PwaRegister() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Service Worker registration
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      }
    }

    // Network status listener
    const updateOnline = () => setIsOffline(!navigator.onLine);
    updateOnline();

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-2 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="rounded-full bg-paper/95 dark:bg-obsidian/95 border border-sage/40 px-3 py-1 shadow-sm flex items-center gap-2 text-xs font-medium text-ink dark:text-cream backdrop-blur-sm">
        <WifiOff className="w-3.5 h-3.5 text-sage" />
        <span>Offline sanctuary active</span>
      </div>
    </div>
  );
}
