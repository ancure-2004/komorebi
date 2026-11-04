"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRoom } from "@/lib/room";
import { haptics } from "@/lib/haptics";

interface DropItem {
  id: string;
  emoji: string;
  x: number; // percentage across screen (10% to 90%)
}

export default function Drops() {
  const room = useRoom();
  const [drops, setDrops] = useState<DropItem[]>([]);

  useEffect(() => {
    const unregister = room.registerHandlers({
      onDrop: ({ emoji }) => {
        haptics.light();
        const id = `${Date.now()}-${Math.random()}`;
        const x = Math.floor(Math.random() * 70) + 15;
        setDrops((prev) => [...prev, { id, emoji, x }]);
      },
    });

    return () => unregister();
  }, [room]);

  const removeDrop = (id: string) => {
    setDrops((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      <AnimatePresence>
        {drops.map((drop) => (
          <motion.div
            key={drop.id}
            initial={{
              y: "105vh",
              x: `${drop.x}vw`,
              opacity: 0,
              scale: 0.6,
            }}
            animate={{
              y: "-15vh",
              x: [
                `${drop.x}vw`,
                `${drop.x + 4}vw`,
                `${drop.x - 4}vw`,
                `${drop.x}vw`,
              ],
              opacity: [0, 1, 1, 0.9, 0],
              scale: [0.6, 1.25, 1.1, 0.9],
            }}
            transition={{
              duration: 5.5,
              ease: "easeOut",
              times: [0, 0.2, 0.6, 0.85, 1],
            }}
            onAnimationComplete={() => removeDrop(drop.id)}
            className="absolute text-5xl select-none filter drop-shadow-md"
          >
            {drop.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
