"use client";

import { motion } from "framer-motion";
import Scene from "@/cinematic/components/fx/Scene";
import Emblem from "@/cinematic/components/fx/Emblem";
import LensFlare from "@/cinematic/components/fx/LensFlare";
import Letterbox from "@/cinematic/components/fx/Letterbox";

/**
 * The activation moment — the audience's biggest sensory beat.
 *
 * Layered for maximum impact:
 *   1. Hard white flash (0–0.25s)
 *   2. Chromatic / desaturate aberration distortion (0.1–0.6s)
 *   3. Camera shake on the inner shell (0–0.7s)
 *   4. Cinematic letterbox bars slide in (declares "this is a moment")
 *   5. Three anamorphic lens-flare bursts at the impact center
 *   6. Expanding shockwave rings (5 layers, staggered)
 *   7. 120 spark-particle eruption
 *   8. Emblem materialises with bloom + scan sweep
 *   9. "System Activated" boot lines tick out
 *
 * The flow ID and timings are unchanged — this is purely the visual mass
 * of the moment being increased. The procedural sound director's `impact()`
 * is triggered by SoundLayer when stage flips to "activation".
 */
export default function Activation() {
  return (
    <Scene transition={{ duration: 0.6 }}>
      <div className="absolute inset-0 bg-ink-900" />

      {/* Letterbox bars slam in for the cinematic widescreen moment */}
      <Letterbox thickness={7} delay={0.05} />

      {/* Screen-shake wrapper — gives the whole shot a brief
          handheld-feeling impact tremor */}
      <motion.div
        className="absolute inset-0"
        animate={{
          x: [0, -8, 6, -4, 3, 0],
          y: [0, 4, -6, 3, -2, 0]
        }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        {/* Hard white flash */}
        <motion.div
          className="absolute inset-0 bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.7, times: [0, 0.12, 1] }}
        />

        {/* Chromatic distortion overlay — a brief blur+desaturate punch */}
        <motion.div
          className="absolute inset-0 backdrop-blur-md"
          style={{ background: "rgba(58,91,255,0.18)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0] }}
          transition={{ duration: 0.9, times: [0, 0.15, 1] }}
        />

        {/* Expanding shockwave rings — bumped to 5 for richer cascade */}
        {[0, 0.12, 0.24, 0.36, 0.5].map((delay, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full border"
            style={{
              borderColor:
                i % 2 === 0 ? "rgba(122,147,255,0.65)" : "rgba(230,191,106,0.65)",
              borderWidth: i === 0 ? 3 : 2,
              translateX: "-50%",
              translateY: "-50%",
              boxShadow:
                i % 2 === 0
                  ? "0 0 40px rgba(58,91,255,0.4)"
                  : "0 0 40px rgba(230,191,106,0.5)"
            }}
            initial={{ width: 0, height: 0, opacity: 0.95 }}
            animate={{ width: "260vmax", height: "260vmax", opacity: 0 }}
            transition={{ duration: 2.6, delay, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}

        {/* Sustained center bloom — the "core ignited" glow */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            width: "60vmin",
            height: "60vmin",
            background:
              "radial-gradient(circle, rgba(230,191,106,0.85), rgba(58,91,255,0.5) 40%, transparent 70%)"
          }}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.3, 1], opacity: [0, 1, 0.7] }}
          transition={{ duration: 1.6, times: [0, 0.4, 1] }}
        />

        {/* Particle burst — 120 sparks erupting radially */}
        <div className="absolute left-1/2 top-1/2 w-0 h-0">
          {Array.from({ length: 120 }).map((_, i) => {
            const angle = (i / 120) * Math.PI * 2 + Math.random() * 0.06;
            const dist = 35 + Math.random() * 75;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            const dur = 1.8 + Math.random() * 1.2;
            const size = 0.5 + Math.random() * 1.5;
            return (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${size * 4}px`,
                  height: `${size * 4}px`,
                  background:
                    i % 3 === 0
                      ? "rgba(230,191,106,1)"
                      : i % 3 === 1
                      ? "rgba(255,255,255,1)"
                      : "rgba(170,200,255,1)",
                  boxShadow:
                    i % 3 === 0
                      ? "0 0 12px rgba(230,191,106,0.9)"
                      : "0 0 10px rgba(255,255,255,0.9)"
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: `${x}vmax`,
                  y: `${y}vmax`,
                  opacity: [1, 1, 0],
                  scale: [1, 1, 0.2]
                }}
                transition={{
                  duration: dur,
                  delay: 0.1 + Math.random() * 0.15,
                  ease: "easeOut",
                  times: [0, 0.6, 1]
                }}
              />
            );
          })}
        </div>

        {/* Anamorphic lens-flare bursts */}
        <LensFlare x={50} y={50} size={120} tone="gold" burst delay={0.1} />
        <LensFlare x={50} y={50} size={80} tone="white" burst delay={0.45} />

        {/* Center emblem reveal */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.4, opacity: 0, filter: "blur(20px)" }}
            animate={{
              scale: [0.4, 1.15, 1],
              opacity: [0, 1, 1],
              filter: ["blur(20px)", "blur(0px)", "blur(0px)"]
            }}
            transition={{
              duration: 1.8,
              times: [0, 0.55, 1],
              delay: 0.35,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="relative"
          >
            <Emblem size={260} drawDuration={1.4} />
            <motion.div
              className="absolute inset-0 rounded-full blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(230,191,106,0.6), transparent 60%)"
              }}
              animate={{ opacity: [0, 1, 0.7] }}
              transition={{ duration: 2 }}
            />
            {/* Scan-line sweep over the emblem as it materialises */}
            <motion.div
              className="absolute inset-0 overflow-hidden rounded-full pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.6, delay: 0.6, times: [0, 0.4, 1] }}
            >
              <motion.div
                className="absolute left-0 right-0 h-1"
                style={{
                  background:
                    "linear-gradient(180deg, transparent, rgba(230,191,106,0.95), transparent)",
                  boxShadow: "0 0 16px rgba(230,191,106,0.9)"
                }}
                initial={{ top: "-10%" }}
                animate={{ top: "110%" }}
                transition={{ duration: 1.4, delay: 0.6, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>

          <motion.div
            className="mt-10 text-center"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 1 }}
          >
            <div className="text-[10px] tracking-cinema uppercase text-gold-400/90 mb-2">
              · System Activated ·
            </div>
            <motion.div
              className="font-display text-3xl md:text-5xl text-cinematic"
              initial={{ letterSpacing: "0.4em", opacity: 0 }}
              animate={{ letterSpacing: "-0.01em", opacity: 1 }}
              transition={{ delay: 1.5, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            >
              The Future Has Awakened
            </motion.div>
            <BootLines />
          </motion.div>
        </div>
      </motion.div>
    </Scene>
  );
}

function BootLines() {
  const lines = [
    "› Linking student records",
    "› Connecting parent network",
    "› Calibrating transport mesh",
    "› Synchronising leadership view",
    "› Ecosystem online"
  ];
  return (
    <div className="mt-8 inline-flex flex-col items-start text-left text-[11px] tracking-[0.18em] text-royal-100/70 font-mono">
      {lines.map((l, i) => (
        <motion.div
          key={l}
          initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          transition={{ delay: 1.8 + i * 0.2, duration: 0.4 }}
        >
          {l}{" "}
          <span className="text-gold-400">OK</span>
        </motion.div>
      ))}
    </div>
  );
}
