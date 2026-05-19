"use client";

import { motion } from "framer-motion";
import Scene from "@/cinematic/components/fx/Scene";
import StarField from "@/cinematic/components/fx/StarField";
import AuroraBackground from "@/cinematic/components/fx/AuroraBackground";
import LightStreaks from "@/cinematic/components/fx/LightStreaks";
import Emblem from "@/cinematic/components/fx/Emblem";
import { ArrowUpRight, RefreshCw } from "lucide-react";

export default function Finale({ onRestart }: { onRestart: () => void }) {
  return (
    <Scene>
      <AuroraBackground intensity={0.9} />
      <StarField density={0.00018} speed={0.04} />
      <LightStreaks count={9} />

      {/* Rising particles (embers) */}
      <RisingParticles />

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <SchoolGlow />
        </motion.div>

        <motion.div
          className="mt-10 text-[10px] tracking-cinema text-gold-400/90 uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
        >
          · The Future Is Live ·
        </motion.div>

        <motion.h1
          className="font-display text-4xl md:text-7xl text-cinematic mt-3 max-w-5xl leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          The Next Generation
          <br />
          Of Education Starts Here.
        </motion.h1>

        <motion.p
          className="mt-5 text-sm md:text-base text-royal-100/65 max-w-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
        >
          Stansford CRM is now live across the institution — connecting every student,
          every teacher, every parent, every leader.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap gap-4 items-center justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0, duration: 1 }}
        >
          {/*
            "Explore Platform" hands the audience off to the live CRM at
            the end of the cinematic. The destination is configurable via
            NEXT_PUBLIC_PLATFORM_URL — set it in `Stansford CRM/.env.local`
            (or via the build command) before the launch. Default points to
            `/login` on the same origin so a reverse-proxy deployment that
            serves the main CRM at the root will Just Work.
          */}
          <a
            href={process.env.NEXT_PUBLIC_PLATFORM_URL || "/login"}
            className="btn-cinema inline-flex items-center gap-2"
          >
            Explore Platform <ArrowUpRight className="w-3 h-3" />
          </a>
        </motion.div>

        <motion.button
          onClick={onRestart}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          whileHover={{ opacity: 1 }}
          transition={{ delay: 3, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 text-[10px] tracking-cinema uppercase text-royal-100/55 hover:text-gold-400"
        >
          <RefreshCw className="w-3 h-3" /> Replay The Inauguration
        </motion.button>
      </div>
    </Scene>
  );
}

function SchoolGlow() {
  return (
    <div className="relative">
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(230,191,106,0.55), transparent 70%)" }}
        animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative">
        <Emblem size={210} drawDuration={2.4} />
      </div>
    </div>
  );
}

function RisingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 40 }).map((_, i) => {
        const left = Math.random() * 100;
        const duration = 8 + Math.random() * 8;
        const delay = Math.random() * 8;
        const size = 1 + Math.random() * 2.4;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full bg-gold-400"
            style={{
              left: `${left}%`,
              bottom: -10,
              width: size,
              height: size,
              boxShadow: "0 0 8px rgba(230,191,106,0.85)"
            }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -800, opacity: [0, 1, 1, 0] }}
            transition={{ duration, delay, repeat: Infinity, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
