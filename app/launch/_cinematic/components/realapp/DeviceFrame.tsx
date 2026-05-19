"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Outer chassis width in px */
  width?: number;
  /** Visual screen aspect (height / width) — 0.6 ≈ MacBook 16:10ish */
  aspect?: number;
  delay?: number;
  /** Label rendered in the chrome strip above the device (window title) */
  windowTitle?: string;
  /**
   * Design width of the embedded UI in px. The screen content is rendered
   * at this size and then CSS-scaled down to fit the actual device. This
   * lets the CRM's dense layouts (KPI grids, rosters, sidebars) keep the
   * proportions they were designed for — instead of wrapping/cropping when
   * the device is shrunk to fit a half-column.
   */
  designWidth?: number;
};

/**
 * Cinematic device chassis that wraps and SCALES the embedded CRM to
 * whatever outer width is requested. The trick: render the UI at a fixed
 * design size (default 1100px wide) and apply a uniform CSS transform
 * scale so the proportions stay correct.
 */
export default function DeviceFrame({
  children,
  width = 980,
  aspect = 0.6,
  delay = 0.1,
  windowTitle = "Stansford CRM",
  designWidth = 1100
}: Props) {
  // The device chassis has 14px padding on the left and right (from CSS:
  // .device-frame { padding: 14px 14px 18px; }) — the inner screen is
  // therefore `width - 28` pixels wide. The screen's height is derived
  // from `aspect` via aspectRatio, so we don't need to compute it.
  const screenWidth = width - 28;
  const scale = screenWidth / designWidth;
  const designHeight = designWidth * aspect;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="device-frame"
      style={{ width, maxWidth: "92vw" }}
    >
      <div className="flex items-center justify-between px-2 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="text-[10px] tracking-[0.18em] uppercase text-royal-100/50">
          {windowTitle}
        </div>
        <div className="text-[10px] text-royal-100/30 tabular-nums">●●● ●●●</div>
      </div>
      <div
        className="device-screen relative realapp overflow-hidden"
        style={{ width: "100%", aspectRatio: `1 / ${aspect}` as any }}
      >
        {/* Inner content is rendered at the full design size and scaled
            down. Pointer-events disabled because the cinematic device is
            not interactive — it's the on-screen "screenshot". */}
        <div
          className="pointer-events-none"
          style={{
            width: designWidth,
            height: designHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left"
          }}
        >
          {children}
        </div>
        <div className="cursor-sheen" />
      </div>
    </motion.div>
  );
}
