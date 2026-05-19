"use client";

import { motion } from "framer-motion";

type Props = {
  /** Bar thickness in vh */
  thickness?: number;
  delay?: number;
  /** If true, bars retract back out instead of staying */
  oneShot?: boolean;
};

/**
 * Animates black cinematic letterbox bars in at the top and bottom of the
 * viewport. Used at the activation and finale beats to declare "this is the
 * cinematic moment" — like a film cutting to widescreen.
 */
export default function Letterbox({
  thickness = 9,
  delay = 0,
  oneShot = false
}: Props) {
  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
        style={{ background: "#000" }}
        initial={{ height: 0 }}
        animate={
          oneShot
            ? { height: [`0vh`, `${thickness}vh`, `${thickness}vh`, `0vh`] }
            : { height: `${thickness}vh` }
        }
        transition={
          oneShot
            ? { duration: 4, delay, times: [0, 0.18, 0.85, 1], ease: "easeInOut" }
            : { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }
        }
      />
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
        style={{ background: "#000" }}
        initial={{ height: 0 }}
        animate={
          oneShot
            ? { height: [`0vh`, `${thickness}vh`, `${thickness}vh`, `0vh`] }
            : { height: `${thickness}vh` }
        }
        transition={
          oneShot
            ? { duration: 4, delay, times: [0, 0.18, 0.85, 1], ease: "easeInOut" }
            : { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }
        }
      />
    </>
  );
}
