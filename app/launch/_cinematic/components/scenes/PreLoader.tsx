"use client";

import { motion } from "framer-motion";
import Scene from "@/cinematic/components/fx/Scene";
import StarField from "@/cinematic/components/fx/StarField";
import Emblem from "@/cinematic/components/fx/Emblem";

export default function PreLoader() {
  return (
    <Scene>
      <div className="absolute inset-0 bg-ink-900" />
      <StarField density={0.00012} speed={0.04} />

      {/* Slowly emerging spotlight */}
      <motion.div
        className="absolute inset-0 spotlight"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 3.2 }}
      />

      <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
          className="relative"
        >
          <Emblem size={220} drawDuration={3.4} />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ filter: "blur(40px)", background: "radial-gradient(circle, rgba(58,91,255,0.4), transparent 70%)" }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <motion.h1
          className="font-display text-5xl md:text-7xl mt-10 text-cinematic"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          Education Is Evolving
        </motion.h1>

        <motion.div
          className="mt-10 flex items-center gap-3 text-xs tracking-cinema text-royal-100/70 uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.4, duration: 1.0 }}
        >
          <span className="inline-block h-px w-10 bg-royal-300/50" />
          Preparing Digital Ecosystem
          <span className="inline-flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="inline-block w-1 h-1 rounded-full bg-royal-300"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </span>
          <span className="inline-block h-px w-10 bg-royal-300/50" />
        </motion.div>

        {/* Bottom hairline progress */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[36vw] max-w-[420px] h-px bg-white/10 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-transparent via-gold-400 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 4.6, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </Scene>
  );
}
