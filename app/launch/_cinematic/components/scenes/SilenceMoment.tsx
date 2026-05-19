"use client";

import { motion } from "framer-motion";
import Scene from "@/cinematic/components/fx/Scene";
import StarField from "@/cinematic/components/fx/StarField";

export default function SilenceMoment({ onActivate }: { onActivate: () => void }) {
  // The button sits perfectly centered — no magnetic mouse-follow / 3D tilt.
  // The earlier rotation made the power button look crooked; the cinematic
  // feel now comes purely from the surrounding rings, halos and pulses,
  // not from the button itself moving.

  return (
    <Scene>
      <div className="absolute inset-0 bg-ink-900" />
      <StarField density={0.00007} speed={0.02} />

      {/* Floor reflection grid */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-grid opacity-30"
        style={{ maskImage: "linear-gradient(to top, black, transparent)", WebkitMaskImage: "linear-gradient(to top, black, transparent)" }} />


      <div className="relative w-full h-full flex flex-col items-center justify-center text-center px-6">
        <motion.p
          className="text-[10px] md:text-xs tracking-cinema text-gold-400/80 uppercase mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1.0 }}
        >
          · Inauguration Moment ·
        </motion.p>

        {/* Personalized name — the largest, most prominent element on the page
            so Mr. Srikanth knows this moment belongs to him. */}
        <motion.div
          className="flex items-center gap-4 md:gap-6 mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 1.2 }}
        >
          <motion.div
            className="h-px bg-gradient-to-r from-transparent to-gold-400/70 w-12 md:w-24"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.7, duration: 1.2, ease: "easeOut" }}
            style={{ transformOrigin: "right center" }}
          />
          <motion.h2
            className="font-display text-cinematic whitespace-nowrap"
            style={{
              fontSize: "clamp(2rem, 5vw, 4.25rem)",
              letterSpacing: "0.005em",
              lineHeight: 1.05,
              fontWeight: 500
            }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          >
            Mr. Srikanth Sivaraman
          </motion.h2>
          <motion.div
            className="h-px bg-gradient-to-l from-transparent to-gold-400/70 w-12 md:w-24"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.7, duration: 1.2, ease: "easeOut" }}
            style={{ transformOrigin: "left center" }}
          />
        </motion.div>

        <motion.p
          className="text-xs md:text-sm tracking-[0.32em] uppercase text-royal-100/65 mb-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
        >
          Director · Snam Alloys Pvt
        </motion.p>

        <motion.h3
          className="font-display text-3xl md:text-5xl text-royal-100/85 mt-6 mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 1.2 }}
        >
          The Future Is Waiting
        </motion.h3>
        <motion.p
          className="text-sm md:text-base text-royal-100/75 max-w-xl mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
        >
          Your touch begins the transformation.
        </motion.p>

        {/*
          THE BUTTON — a premium pill with an animated iridescent chrome
          border. Replaces the previous circular orb. The dark gradient body
          + slow-rotating prismatic edge feels like a luxury hardware
          control. The power icon stays on the left as the brand element
          (orange `#e8530e`), and the "Touch to Begin" label on the right
          tells the chief guest exactly what to do.
        */}
        <motion.button
          onClick={onActivate}
          aria-label="Begin the digital inauguration — touch to launch"
          className="relative outline-none focus-visible:ring-2 focus-visible:ring-gold-400/80 rounded-full cursor-pointer group"
          initial={{ scale: 0.85, opacity: 0, y: 14 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          {/* Soft blue halo behind the pill — single, diffuse, ambient. */}
          <motion.div
            className="absolute -inset-10 rounded-full blur-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse, rgba(58,91,255,0.55), transparent 70%)"
            }}
            animate={{ opacity: [0.55, 0.9, 0.55] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          />

          {/*
            Iridescent chrome border layer — a conic gradient that rotates
            slowly behind the pill. The inner pill (below) covers everything
            except a 2px ring at the edge, so what you SEE is just the
            rotating prismatic chrome rim.
          */}
          <div
            className="relative rounded-full p-[2px] overflow-hidden"
            style={{
              // Filter creates the chromatic-aberration prism corners.
              filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.55))"
            }}
          >
            <motion.div
              className="absolute -inset-1/2 pointer-events-none"
              style={{
                background:
                  // Chrome base + prismatic accent stops (cyan / magenta /
                  // gold) — looks holographic at the corners as it spins.
                  "conic-gradient(from 0deg," +
                  " rgba(220,225,235,0.85) 0deg," +
                  " rgba(120,220,255,0.95) 45deg," +
                  " rgba(220,225,235,0.85) 90deg," +
                  " rgba(255,120,200,0.95) 135deg," +
                  " rgba(220,225,235,0.85) 180deg," +
                  " rgba(255,210,120,0.95) 225deg," +
                  " rgba(220,225,235,0.85) 270deg," +
                  " rgba(140,255,200,0.95) 315deg," +
                  " rgba(220,225,235,0.85) 360deg)"
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />

            {/* THE DARK PILL FACE */}
            <div
              className="relative rounded-full flex items-center"
              style={{
                width: "min(420px, 78vw)",
                height: 90,
                paddingLeft: 10,
                paddingRight: 28,
                gap: 18,
                background:
                  "linear-gradient(180deg, #1c1f2a 0%, #11131c 55%, #0a0c14 100%)",
                boxShadow:
                  "inset 0 1px 1px rgba(255,255,255,0.08)," +
                  "inset 0 -1px 1px rgba(0,0,0,0.5)"
              }}
            >
              {/* Top sheen */}
              <div
                className="absolute inset-x-0 top-0 h-1/2 rounded-t-full pointer-events-none"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.06), transparent)"
                }}
              />

              {/* Left circular power-icon badge */}
              <div
                className="relative w-[70px] h-[70px] rounded-full shrink-0 grid place-items-center overflow-hidden"
                style={{
                  background:
                    "radial-gradient(circle at 30% 25%, #2a2d36 0%, #14171e 60%, #0a0c14 100%)",
                  boxShadow:
                    "inset 0 1px 1px rgba(255,255,255,0.10)," +
                    "inset 0 -2px 4px rgba(0,0,0,0.7)," +
                    "0 0 0 1px rgba(220,225,235,0.18)"
                }}
              >
                {/* Soft orange standby glow behind the icon */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 55%, rgba(232,83,14,0.55), transparent 60%)"
                  }}
                  animate={{ opacity: [0.55, 1, 0.55] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.svg
                  viewBox="0 0 100 100"
                  className="relative w-9 h-9"
                  style={{
                    filter:
                      "drop-shadow(0 0 10px rgba(232,83,14,0.85)) drop-shadow(0 0 2px rgba(255,138,77,0.7))"
                  }}
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <path
                    d="M 28 28 A 30 30 0 1 0 72 28"
                    stroke="#e8530e"
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <line
                    x1="50"
                    y1="14"
                    x2="50"
                    y2="50"
                    stroke="#e8530e"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  <line
                    x1="50"
                    y1="16"
                    x2="50"
                    y2="32"
                    stroke="#ff8a4d"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                </motion.svg>
              </div>

              {/* Label — "Touch to Begin" */}
              <span
                className="relative font-display"
                style={{
                  fontSize: "clamp(1.4rem, 2.4vw, 2rem)",
                  color: "rgba(245,247,255,0.92)",
                  letterSpacing: "0.04em",
                  lineHeight: 1
                }}
              >
                Touch to Launch
              </span>

              {/* Sweep highlight that drifts across the pill */}
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background:
                    "linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.12) 50%, transparent 62%)",
                  mixBlendMode: "screen"
                }}
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>
        </motion.button>

      </div>
    </Scene>
  );
}
