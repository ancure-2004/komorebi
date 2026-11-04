"use client";

import React, { ReactNode } from "react";
import { useHydrated } from "@/lib/hooks";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-cream dark:bg-mocha flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sage/20 border border-sage/40 animate-pulse flex items-center justify-center">
            <span className="text-sage text-lg font-serif">木</span>
          </div>
          <span className="text-xs font-serif text-ink/60 dark:text-cream/60 tracking-widest">
            KOMOREBI
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
