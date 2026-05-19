"use client";

import { motion } from "framer-motion";

type Props = {
  /** Horizontal position (0–100%) */
  x?: number;
  /** Vertical position (0–100%) */
  y?: number;
  /** Diameter in viewport units */
  size?: number;
  /** Tint */
  tone?: "gold" | "white" | "royal";
  /** If true, plays a one-shot pulse animation; otherwise lives ambient */
  burst?: boolean;
  delay?: number;
};

/**
 * Anamorphic lens flare with a horizontal streak — the signature
 * "premium camera" tell that makes a scene feel filmed rather than rendered.
 */
export default function LensFlare({
  x = 50,
  y = 50,
  size = 60,
  tone = "gold",
  burst = false,
  delay = 0
}: Props) {
  const c =
    tone === "gold"
      ? "rgba(230,191,106,0.85)"
      : tone === "royal"
      ? "rgba(122,147,255,0.85)"
      : "rgba(255,255,255,0.85)";
  const c2 =
    tone === "gold"
      ? "rgba(255,235,180,0.7)"
      : tone === "royal"
      ? "rgba(200,215,255,0.7)"
      : "rgba(255,255,255,0.7)";

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        mixBlendMode: "screen"
      }}
      aria-hidden
    >
      {/* Anamorphic horizontal streak */}
      <motion.div
        initial={{ opacity: burst ? 0 : 0.45, scaleX: burst ? 0.2 : 1 }}
        animate={
          burst
            ? { opacity: [0, 1, 0], scaleX: [0.4, 1.8, 1.4] }
            : { opacity: [0.35, 0.6, 0.35] }
        }
        transition={
          burst
            ? { duration: 1.4, delay, ease: [0.16, 1, 0.3, 1] }
            : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
        }
        style={{
          width: `${size * 4}vmin`,
          height: `${size * 0.12}vmin`,
          background: `linear-gradient(90deg, transparent, ${c2}, ${c}, ${c2}, transparent)`,
          filter: `blur(${size * 0.04}vmin)`,
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)"
        }}
      />
      {/* Hot center */}
      <motion.div
        initial={{ opacity: burst ? 0 : 0.45, scale: burst ? 0.4 : 1 }}
        animate={
          burst
            ? { opacity: [0, 1, 0.4, 0], scale: [0.4, 1.4, 1.0, 0.9] }
            : { opacity: [0.4, 0.7, 0.4] }
        }
        transition={
          burst
            ? { duration: 1.6, delay, ease: [0.16, 1, 0.3, 1] }
            : { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }
        style={{
          width: `${size * 0.6}vmin`,
          height: `${size * 0.6}vmin`,
          background: `radial-gradient(circle, ${c} 0%, ${c2} 30%, transparent 70%)`,
          filter: `blur(${size * 0.06}vmin)`,
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)"
        }}
      />
    </div>
  );
}
