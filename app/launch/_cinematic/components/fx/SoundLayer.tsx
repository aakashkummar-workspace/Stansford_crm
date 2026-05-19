"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDirector, useSoundDirector } from "@/cinematic/lib/sound";
import { Stage } from "@/cinematic/lib/stages";

type Props = {
  stage: Stage;
};

/**
 * Wires the procedural sound director to the current stage and exposes:
 *   - a one-time "Tap to enable cinematic sound" affordance (browsers
 *     require a user gesture before audio can play)
 *   - a small mute toggle in the bottom-left corner
 *   - M-key mute hotkey
 * Renders nothing else visible.
 */
export default function SoundLayer({ stage }: Props) {
  const { director, muted } = useSoundDirector();
  const [unlocked, setUnlocked] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  // Custom music URL. Defaults to `/music/crm_music.mpeg` which is shipped
  // alongside the cinematic. Set NEXT_PUBLIC_MUSIC_URL in `.env.local` to
  // override (e.g. to a CDN URL or a different filename).
  const musicUrl = process.env.NEXT_PUBLIC_MUSIC_URL || "/music/crm_music.mpeg";

  // Preload the music file alongside the page so it's ready the moment the
  // user makes their first gesture. The Director queues it; nothing actually
  // plays until unlock(). Per-stage volumes let the score "breathe" — quieter
  // during silence/anticipation, fuller during reveals + finale.
  useEffect(() => {
    director.loadMusic(musicUrl, {
      volume: 0.85,
      stageVolume: {
        preload: 0.55,
        intro: 0.7,
        silence: 0.6,
        activation: 1.0,
        attendance: 0.85,
        parents: 0.85,
        transport: 0.85,
        trust: 0.85,
        ecosystem: 0.9,
        testimonials: 0.85,
        promise: 0.9,
        finale: 1.0,
        credits: 0.7
      }
    });
  }, [director, musicUrl]);

  // Show the unlock prompt after a brief delay so the eye can settle on the
  // emblem first. Hidden once unlocked or muted.
  useEffect(() => {
    if (unlocked) return;
    const t = setTimeout(() => setShowPrompt(true), 1200);
    return () => clearTimeout(t);
  }, [unlocked]);

  // Unlock on the first user gesture anywhere — click / keydown / touch.
  useEffect(() => {
    if (unlocked) return;
    const handler = () => {
      director.unlock();
      setUnlocked(true);
      setShowPrompt(false);
      director.setStage(stage);
    };
    window.addEventListener("pointerdown", handler, { once: true, passive: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [unlocked, director, stage]);

  // Drive stage-aware ambient layers. The chord progression itself carries
  // the emotional weight of the transitions — we don't fire a whoosh on
  // every stage change (that felt synthetic and busy). The whoosh that
  // remains lives inside `impact()` and only the activation moment plays it.
  useEffect(() => {
    if (!unlocked) return;
    director.setStage(stage);
  }, [stage, unlocked, director]);

  // Activation impact — fired exactly when the orb-tap pushes us into
  // "activation". The user's pointerdown also serves as audio unlock.
  useEffect(() => {
    if (!unlocked) return;
    if (stage === "activation") {
      director.impact();
    }
    if (stage === "finale") {
      director.chime("high");
    }
  }, [stage, unlocked, director]);

  // M-key mute hotkey
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") {
        director.setMuted(!director.isMuted());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [director]);

  return (
    <>
      {/* Bottom-left mute toggle — small, unobtrusive */}
      <button
        onClick={() => {
          if (!unlocked) {
            director.unlock();
            setUnlocked(true);
            setShowPrompt(false);
            director.setStage(stage);
            return;
          }
          director.setMuted(!muted);
        }}
        aria-label={muted ? "Unmute cinematic sound" : "Mute cinematic sound"}
        className="fixed bottom-4 left-4 z-[60] w-9 h-9 rounded-full glass-strong grid place-items-center text-royal-100/70 hover:text-gold-400 transition"
      >
        {muted || !unlocked ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>

      {/* One-time unlock prompt — drifts up over the audio button until
          the first user gesture, then quietly disappears. */}
      <AnimatePresence>
        {showPrompt && !unlocked && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 0.8, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9 }}
            className="fixed bottom-16 left-4 z-[55] flex flex-col gap-1"
          >
            <div className="text-[10px] tracking-cinema uppercase text-gold-400/85 whitespace-nowrap">
              ◆ Tap anywhere · enable cinematic sound
            </div>
            <div className="text-[9px] tracking-cinema uppercase text-royal-100/55 whitespace-nowrap">
              press M to mute
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
