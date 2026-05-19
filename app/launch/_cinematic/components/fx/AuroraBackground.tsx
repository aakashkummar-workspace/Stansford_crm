"use client";

import { motion } from "framer-motion";

export default function AuroraBackground({ intensity = 1 }: { intensity?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-[30%] -left-[20%] w-[80vw] h-[80vw] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(58,91,255,0.35) 0%, transparent 60%)",
          opacity: 0.55 * intensity
        }}
        animate={{ x: [0, 80, -40, 0], y: [0, 40, -20, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-[30%] -right-[20%] w-[80vw] h-[80vw] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(122,147,255,0.28) 0%, transparent 60%)",
          opacity: 0.55 * intensity
        }}
        animate={{ x: [0, -60, 40, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[10%] right-[10%] w-[40vw] h-[40vw] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(230,191,106,0.18) 0%, transparent 60%)",
          opacity: 0.4 * intensity
        }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
