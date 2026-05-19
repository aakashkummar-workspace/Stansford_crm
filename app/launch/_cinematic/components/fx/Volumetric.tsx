"use client";

import { motion } from "framer-motion";

type Props = {
  /** 0–1 — overall opacity multiplier */
  intensity?: number;
  /** Tint of the light shafts */
  tone?: "royal" | "gold" | "warm";
};

/**
 * Slow-drifting volumetric light shafts overlaid on top of any scene.
 * Adds the "shaft of light through dust" feeling that gives scenes depth.
 * Pure CSS gradients with conic mask + slow rotation — no canvas, GPU-cheap.
 */
export default function Volumetric({ intensity = 0.55, tone = "royal" }: Props) {
  const colors = {
    royal: ["rgba(58,91,255,0.55)", "rgba(122,147,255,0.35)"],
    gold: ["rgba(230,191,106,0.55)", "rgba(244,213,141,0.30)"],
    warm: ["rgba(230,191,106,0.45)", "rgba(58,91,255,0.30)"]
  }[tone];

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ mixBlendMode: "screen", opacity: intensity }}
      aria-hidden
    >
      {/* Primary shaft from upper-left */}
      <motion.div
        className="absolute -top-1/4 -left-1/4 w-[140%] h-[140%]"
        style={{
          background: `conic-gradient(from 220deg at 35% 0%,
            transparent 0deg,
            ${colors[0]} 6deg,
            transparent 14deg,
            transparent 26deg,
            ${colors[1]} 32deg,
            transparent 40deg,
            transparent 360deg)`,
          filter: "blur(28px)"
        }}
        initial={{ rotate: -3, opacity: 0 }}
        animate={{ rotate: [-3, 5, -3], opacity: [0, 1, 0.85, 1] }}
        transition={{
          rotate: { duration: 22, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 3.6, times: [0, 0.4, 0.7, 1] }
        }}
      />
      {/* Counter-shaft from upper-right */}
      <motion.div
        className="absolute -top-1/4 -right-1/4 w-[140%] h-[140%]"
        style={{
          background: `conic-gradient(from 140deg at 65% 0%,
            transparent 0deg,
            ${colors[1]} 8deg,
            transparent 18deg,
            transparent 360deg)`,
          filter: "blur(36px)"
        }}
        initial={{ rotate: 2, opacity: 0 }}
        animate={{ rotate: [2, -5, 2], opacity: [0, 0.8] }}
        transition={{
          rotate: { duration: 28, repeat: Infinity, ease: "easeInOut" },
          opacity: { duration: 5 }
        }}
      />
    </div>
  );
}
