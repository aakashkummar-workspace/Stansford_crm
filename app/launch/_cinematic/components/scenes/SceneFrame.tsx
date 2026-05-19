"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export type SceneFrameProps = {
  chapter: string;
  number: string;
  headline: string;
  subline?: string;
  children: ReactNode;
};

export default function SceneFrame({
  chapter,
  number,
  headline,
  subline,
  children
}: SceneFrameProps) {
  return (
    <div className="relative w-full h-full">
      {/* Top-left chapter mark */}
      <motion.div
        className="absolute top-8 left-8 z-10 text-[10px] tracking-cinema text-royal-100/55 uppercase"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        Stansford · {chapter}
      </motion.div>
      <motion.div
        className="absolute top-8 right-8 z-10 text-[10px] tracking-cinema text-gold-400/70 uppercase"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        Sequence {number}
      </motion.div>

      {/* Center stage */}
      {children}

      {/* Headline — cinematic emergence: starts blurred and wide-spaced,
          settles into focus. The kinetic typography is what makes a title
          card feel "filmed", not just rendered. */}
      <motion.div
        className="absolute bottom-16 left-0 right-0 text-center px-6 z-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.h2
          className="font-display text-4xl md:text-6xl text-cinematic"
          initial={{ filter: "blur(14px)", letterSpacing: "0.18em", opacity: 0 }}
          animate={{ filter: "blur(0px)", letterSpacing: "-0.01em", opacity: 1 }}
          transition={{ delay: 1.1, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {headline}
        </motion.h2>
        {subline && (
          <motion.p
            className="mt-3 text-xs md:text-sm tracking-cinema uppercase text-royal-100/55"
            initial={{ opacity: 0, filter: "blur(6px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ delay: 1.6, duration: 1 }}
          >
            {subline}
          </motion.p>
        )}
      </motion.div>

      {/* Corner brackets */}
      <CornerBrackets />
    </div>
  );
}

function CornerBrackets() {
  return (
    <>
      {[
        "top-6 left-6 border-t border-l",
        "top-6 right-6 border-t border-r",
        "bottom-6 left-6 border-b border-l",
        "bottom-6 right-6 border-b border-r"
      ].map((cls, i) => (
        <motion.div
          key={i}
          className={`absolute w-6 h-6 border-royal-300/40 ${cls}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 + i * 0.1, duration: 0.8 }}
        />
      ))}
    </>
  );
}
