"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Stage, STAGE_ORDER } from "@/cinematic/lib/stages";
import { ChevronRight, RotateCcw, EyeOff, Eye } from "lucide-react";

const labels: Record<Stage, string> = {
  preload: "Preload",
  intro: "Intro",
  silence: "Silence",
  activation: "Activation",
  attendance: "Attendance",
  parents: "Parents",
  transport: "Transport",
  trust: "Trust",
  ecosystem: "Ecosystem",
  testimonials: "Voices",
  promise: "Promise",
  finale: "Finale",
  credits: "Credits"
};

export default function StageHUD({
  stage,
  activated,
  onJump,
  onRestart
}: {
  stage: Stage;
  activated: boolean;
  onJump: (s: Stage) => void;
  onRestart: () => void;
}) {
  const [visible, setVisible] = useState(true);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "h" || e.key === "H") setVisible((v) => !v);
      if (e.key === "ArrowRight") {
        const i = STAGE_ORDER.indexOf(stage);
        if (i >= 0 && i < STAGE_ORDER.length - 1) onJump(STAGE_ORDER[i + 1]);
      }
      if (e.key === "r" || e.key === "R") onRestart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, onJump, onRestart]);

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* Live-ops corner toggle */}
      <motion.button
        onClick={() => setVisible((v) => !v)}
        className="fixed bottom-4 right-4 z-[60] w-9 h-9 rounded-full glass-strong grid place-items-center text-royal-100/70 hover:text-gold-400 transition"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        aria-label="Toggle stage controls"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </motion.button>

      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.7, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-16 right-4 z-[55] text-[9.5px] tracking-cinema uppercase text-royal-100/55"
          >
            press H to hide · R to restart
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD pill — anchored to the bottom-right, sitting just left of the
          eye icon, compact enough not to hide center-stage cinematic content. */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.35 }}
            className="fixed bottom-4 right-16 z-[55] glass-strong rounded-full pl-3 pr-1.5 py-1.5 flex items-center gap-2"
            style={{ maxWidth: "min(520px, calc(100vw - 80px))" }}
          >
            <span className="text-[9px] tracking-cinema uppercase text-gold-400/80 whitespace-nowrap">
              ● {labels[stage]}
            </span>

            <div className="hidden md:flex items-center gap-[3px]">
              {STAGE_ORDER.map((s) => {
                const i = STAGE_ORDER.indexOf(s);
                const cur = STAGE_ORDER.indexOf(stage);
                const passed = i < cur;
                const isCur = i === cur;
                return (
                  <button
                    key={s}
                    onClick={() => onJump(s)}
                    title={labels[s]}
                    className={`w-1.5 h-1.5 rounded-full transition ${
                      isCur
                        ? "bg-gold-400 scale-150"
                        : passed
                        ? "bg-royal-300/80"
                        : "bg-royal-300/25 hover:bg-royal-300/60"
                    }`}
                  />
                );
              })}
            </div>

            <button
              onClick={() => {
                const i = STAGE_ORDER.indexOf(stage);
                if (i >= 0 && i < STAGE_ORDER.length - 1) onJump(STAGE_ORDER[i + 1]);
              }}
              className="ml-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] tracking-cinema uppercase border border-royal-300/30 text-white/80 hover:text-gold-400 hover:border-gold-400/60 transition"
              aria-label="Next stage"
            >
              Next <ChevronRight className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={onRestart}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] tracking-cinema uppercase border border-royal-300/30 text-white/80 hover:text-gold-400 hover:border-gold-400/60 transition"
              aria-label="Restart"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle "ecosystem online" status pip.
          Hidden during the pre-tap stages (preload/intro/silence/activation)
          so it doesn't compete with the "Inauguration Moment" eyebrow. Pinned
          to the top-right corner so it never collides with center content. */}
      {activated && !["preload", "intro", "silence", "activation"].includes(stage) && (
        <div className="fixed top-4 right-4 z-[55] text-[9px] tracking-cinema uppercase text-emerald-400/80 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Ecosystem Online
        </div>
      )}
    </>
  );
}
