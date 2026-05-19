"use client";

import { motion } from "framer-motion";

export default function LightStreaks({ count = 6 }: { count?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const top = (i / count) * 100 + Math.random() * 6;
        const delay = i * 0.6;
        const duration = 7 + Math.random() * 4;
        return (
          <motion.div
            key={i}
            className="absolute h-px w-[42vw] bg-gradient-to-r from-transparent via-royal-300/60 to-transparent"
            style={{ top: `${top}%`, left: "-45vw" }}
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: "150vw", opacity: [0, 1, 0] }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        );
      })}
    </div>
  );
}
