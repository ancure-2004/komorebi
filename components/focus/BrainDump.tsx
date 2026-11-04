"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, Plus, Trash2, Check, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { haptics } from "@/lib/haptics";

export interface BrainDumpProps {
  isOpen?: boolean;
  onToggle?: () => void;
  showFloatingTrigger?: boolean;
  className?: string;
}

export default function BrainDump({
  isOpen: controlledIsOpen,
  onToggle,
  showFloatingTrigger = true,
  className = "",
}: BrainDumpProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isDrawerOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const [inputVal, setInputVal] = useState("");
  const brainDump = useApp((s) => s.brainDump);
  const addBrainDump = useApp((s) => s.addBrainDump);
  const toggleBrainDump = useApp((s) => s.toggleBrainDump);
  const deleteBrainDump = useApp((s) => s.deleteBrainDump);

  const handleToggle = () => {
    haptics.light();
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  const handleClose = useCallback(() => {
    haptics.light();
    if (onToggle && controlledIsOpen) {
      onToggle();
    } else {
      setInternalIsOpen(false);
    }
  }, [controlledIsOpen, onToggle]);

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    haptics.light();
    addBrainDump(trimmed);
    setInputVal("");
  };

  const handleClearCompleted = () => {
    haptics.light();
    const completedItems = brainDump.filter((i) => i.done);
    completedItems.forEach((i) => deleteBrainDump(i.id));
  };

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, handleClose]);

  const activeCount = brainDump.filter((i) => !i.done).length;
  const completedCount = brainDump.filter((i) => i.done).length;

  return (
    <>
      {/* Floating Trigger Button (Bottom-Right, above bottom navigation) */}
      {showFloatingTrigger && (
        <button
          type="button"
          onClick={handleToggle}
          aria-label="Open Brain Dump Scratchpad"
          className="fixed right-4 bottom-20 sm:bottom-24 z-40 w-12 h-12 rounded-2xl bg-paper dark:bg-obsidian border border-sage/40 dark:border-matcha/40 text-sage dark:text-matcha shadow-md hover:bg-sage/10 active:scale-95 transition-all flex items-center justify-center focus:ring-2 focus:ring-sage focus:outline-none"
        >
          <Brain className="w-6 h-6" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-sage text-cream text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      )}

      {/* Slide-out Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-mocha/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
            />

            {/* Aside Drawer */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className={`fixed inset-y-0 right-0 w-full max-w-sm bg-paper dark:bg-obsidian border-l border-[#EBE7DF] dark:border-[#383530] p-5 shadow-2xl flex flex-col justify-between z-50 ${className}`}
            >
              {/* Header */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#EBE7DF] dark:border-[#383530]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sage/15 dark:bg-sage/25 text-[#2D5A43] dark:text-matcha flex items-center justify-center">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-serif text-base font-semibold text-ink dark:text-cream leading-tight">
                        Brain Dump
                      </h2>
                      <p className="text-[11px] text-ink/65 dark:text-cream/65">
                        Capture intrusive thoughts without breaking focus
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Close Brain Dump"
                    className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-ink/60 dark:text-cream/60 hover:text-ink dark:hover:text-cream hover:bg-sage/10 active:scale-95 transition-all flex items-center justify-center focus:ring-2 focus:ring-sage focus:outline-none"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Input Form */}
                <form onSubmit={handleAdd} className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Write a thought down..."
                    className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-[#EBE7DF] dark:border-[#383530] bg-cream dark:bg-mocha text-sm text-ink dark:text-cream placeholder-ink/40 dark:placeholder-cream/40 focus:ring-2 focus:ring-sage focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Add thought"
                    className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-sage text-cream text-sm font-medium flex items-center justify-center shadow-sm active:scale-95 transition-all focus:ring-2 focus:ring-sage focus:outline-none"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-2.5 my-2">
                {brainDump.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center text-center p-4">
                    <Sparkles className="w-7 h-7 text-sage/40 mb-2" />
                    <p className="text-xs font-serif text-ink/70 dark:text-cream/70">
                      Mind is clear and calm.
                    </p>
                    <p className="text-[11px] text-ink/50 dark:text-cream/50 mt-1 max-w-[200px]">
                      Jot down chores, random ideas, or questions here to review after your study block.
                    </p>
                  </div>
                ) : (
                  brainDump.map((item) => (
                    <div
                      key={item.id}
                      className={`min-h-[44px] p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                        item.done
                          ? "bg-sage/5 dark:bg-sage/10 border-transparent opacity-60"
                          : "bg-cream dark:bg-mocha border-[#EBE7DF] dark:border-[#383530]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          haptics.light();
                          toggleBrainDump(item.id);
                        }}
                        aria-label={item.done ? "Mark as pending" : "Mark as done"}
                        className="min-h-[44px] min-w-[44px] flex items-center gap-2.5 text-left flex-1 focus:ring-2 focus:ring-sage focus:outline-none rounded-lg"
                      >
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            item.done
                              ? "bg-sage border-sage text-cream"
                              : "border-sage/50 bg-paper dark:bg-obsidian"
                          }`}
                        >
                          {item.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span
                          className={`text-xs break-words ${
                            item.done
                              ? "line-through text-ink/50 dark:text-cream/50"
                              : "text-ink dark:text-cream font-medium"
                          }`}
                        >
                          {item.text}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          haptics.light();
                          deleteBrainDump(item.id);
                        }}
                        aria-label="Delete thought"
                        className="min-h-[44px] min-w-[44px] p-2 text-ink/40 dark:text-cream/40 hover:text-red-500 dark:hover:text-red-400 active:scale-95 transition-all flex items-center justify-center focus:ring-2 focus:ring-red-400 focus:outline-none rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-[#EBE7DF] dark:border-[#383530] flex items-center justify-between text-xs">
                <span className="text-[11px] text-ink/60 dark:text-cream/60">
                  {activeCount} open {activeCount === 1 ? "thought" : "thoughts"}
                </span>

                {completedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCompleted}
                    className="min-h-[44px] px-3 py-1 text-xs text-sage dark:text-matcha hover:underline font-medium focus:ring-2 focus:ring-sage focus:outline-none rounded-lg flex items-center"
                  >
                    Clear completed ({completedCount})
                  </button>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
