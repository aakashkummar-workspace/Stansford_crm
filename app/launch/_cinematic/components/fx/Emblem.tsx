"use client";

import { motion } from "framer-motion";
import Image from "next/image";

type Props = {
  size?: number;
  /** kept for API compatibility with the old SVG draw-in version */
  drawDuration?: number;
  className?: string;
};

/**
 * The real Sanvi Educational and Charitable Trust logo on a glowing white
 * medallion, surrounded by three slow-rotating cinematic rings.
 *
 * Replaces the previous stylized-SVG crest so the audience sees the
 * actual school brand the moment the cinematic opens.
 */
export default function Emblem({
  size = 220,
  drawDuration = 1.6,
  className = ""
}: Props) {
  // Sizing: the white disc is the full `size`. The logo image sits inside it
  // with a small inner pad so the text arc breathes against the disc edge.
  const innerPad = Math.round(size * 0.06);
  const innerSize = size - innerPad * 2;

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outermost slow ring */}
      <motion.div
        className="absolute rounded-full border border-royal-300/25"
        style={{ inset: -Math.round(size * 0.16) }}
        animate={{ rotate: 360 }}
        transition={{ duration: 64, repeat: Infinity, ease: "linear" }}
      />
      {/* Mid ring (gold) */}
      <motion.div
        className="absolute rounded-full border border-gold-400/35"
        style={{ inset: -Math.round(size * 0.10) }}
        animate={{ rotate: -360 }}
        transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
      />
      {/* Innermost ring */}
      <motion.div
        className="absolute rounded-full border border-royal-300/40"
        style={{ inset: -Math.round(size * 0.05) }}
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />

      {/* Pulsing halo behind the medallion */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(232,83,14,0.35), rgba(31,63,139,0.25) 55%, transparent 75%)",
          filter: "blur(18px)"
        }}
        animate={{ opacity: [0.55, 0.95, 0.55], scale: [1, 1.08, 1] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* The medallion: white disc carrying the real logo */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: "#ffffff",
          boxShadow:
            "0 0 0 1px rgba(230,191,106,0.7) inset, 0 0 40px 6px rgba(230,191,106,0.45), 0 0 90px 16px rgba(58,91,255,0.25)"
        }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: drawDuration, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="absolute"
          style={{
            top: innerPad,
            left: innerPad,
            width: innerSize,
            height: innerSize
          }}
        >
          <Image
            src="/logo.png"
            alt="Sanvi Educational and Charitable Trust"
            width={innerSize}
            height={innerSize}
            priority
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        {/* Soft top sheen on the medallion */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.7), transparent 55%)",
            mixBlendMode: "screen",
            opacity: 0.4
          }}
        />
      </motion.div>
    </div>
  );
}
