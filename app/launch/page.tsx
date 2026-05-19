"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { STAGE_DURATIONS, Stage, nextStage } from "@/cinematic/lib/stages";

import PreLoader from "@/cinematic/components/scenes/PreLoader";
import IntroSequence from "@/cinematic/components/scenes/IntroSequence";
import SilenceMoment from "@/cinematic/components/scenes/SilenceMoment";
import Activation from "@/cinematic/components/scenes/Activation";
import SmartAttendance from "@/cinematic/components/scenes/SmartAttendance";
import ParentComm from "@/cinematic/components/scenes/ParentComm";
import Transport from "@/cinematic/components/scenes/Transport";
import TrustDashboard from "@/cinematic/components/scenes/TrustDashboard";
import EcosystemViz from "@/cinematic/components/scenes/EcosystemViz";
import Testimonials from "@/cinematic/components/scenes/Testimonials";
import PromiseWall from "@/cinematic/components/scenes/PromiseWall";
import Finale from "@/cinematic/components/scenes/Finale";
import Credits from "@/cinematic/components/scenes/Credits";
import StageHUD from "@/cinematic/components/StageHUD";

import SoundLayer from "@/cinematic/components/fx/SoundLayer";
import Volumetric from "@/cinematic/components/fx/Volumetric";
import Embers from "@/cinematic/components/fx/Embers";

/**
 * /launch — the cinematic digital inauguration.
 *
 * Lives inside the main CRM Next.js app at /launch. The main app pages
 * (/, /login, /donorform, etc.) do not link to this route — it's reached
 * only by typing the URL directly. After the cinematic finishes, the
 * "Explore Platform" button at the finale points to /login on the same
 * domain, so the hand-off into the live CRM is a same-origin navigation.
 */
export default function LaunchPage() {
  const [stage, setStage] = useState<Stage>("preload");
  const [activated, setActivated] = useState(false);
  const advanceTimer = useRef<NodeJS.Timeout | null>(null);

  const goTo = useCallback((s: Stage) => {
    setStage(s);
  }, []);

  // Auto-advance once activated (after orb tap), and for preload/intro by their own internal timers.
  useEffect(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const dur = STAGE_DURATIONS[stage];
    // The silence stage waits for the user to tap the orb — no auto-advance.
    if (stage === "silence") return;
    if (!dur) return;
    advanceTimer.current = setTimeout(() => {
      setStage((s) => nextStage(s));
    }, dur);
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [stage]);

  const handleActivate = useCallback(() => {
    setActivated(true);
    setStage("activation");
  }, []);

  const handleRestart = useCallback(() => {
    setActivated(false);
    setStage("preload");
  }, []);

  // Subtle cinematic atmosphere "tells" tuned per stage so the room
  // continuously feels alive.
  const atmosphere = stageAtmosphere(stage);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-ink-900 scene-locked">
      {/* Global atmospheric layers — sit BEHIND scenes (z-0). They never
          break the existing scene contents because each scene paints its
          own background on top with `absolute inset-0`. */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Volumetric intensity={atmosphere.volumetric} tone={atmosphere.tone} />
        <Embers count={atmosphere.embers} tone={atmosphere.emberTone} />
      </div>

      <AnimatePresence mode="wait">
        {stage === "preload" && <PreLoader key="preload" />}
        {stage === "intro" && <IntroSequence key="intro" />}
        {stage === "silence" && (
          <SilenceMoment key="silence" onActivate={handleActivate} />
        )}
        {stage === "activation" && <Activation key="activation" />}
        {stage === "attendance" && <SmartAttendance key="attendance" />}
        {stage === "parents" && <ParentComm key="parents" />}
        {stage === "transport" && <Transport key="transport" />}
        {stage === "trust" && <TrustDashboard key="trust" />}
        {stage === "ecosystem" && <EcosystemViz key="ecosystem" />}
        {stage === "testimonials" && <Testimonials key="testimonials" />}
        {stage === "promise" && <PromiseWall key="promise" />}
        {stage === "finale" && <Finale key="finale" onRestart={handleRestart} />}
        {stage === "credits" && <Credits key="credits" onRestart={handleRestart} />}
      </AnimatePresence>

      <SoundLayer stage={stage} />

      <StageHUD
        stage={stage}
        activated={activated}
        onJump={goTo}
        onRestart={handleRestart}
      />
    </main>
  );
}

function stageAtmosphere(stage: Stage): {
  volumetric: number;
  tone: "royal" | "gold" | "warm";
  embers: number;
  emberTone: "gold" | "royal" | "white";
} {
  switch (stage) {
    case "preload":
      return { volumetric: 0.35, tone: "royal", embers: 14, emberTone: "royal" };
    case "intro":
      return { volumetric: 0.45, tone: "royal", embers: 18, emberTone: "royal" };
    case "silence":
      return { volumetric: 0.55, tone: "royal", embers: 18, emberTone: "gold" };
    case "activation":
      return { volumetric: 0.9, tone: "gold", embers: 36, emberTone: "gold" };
    case "attendance":
    case "parents":
    case "transport":
    case "trust":
      return { volumetric: 0.45, tone: "warm", embers: 16, emberTone: "gold" };
    case "ecosystem":
      return { volumetric: 0.55, tone: "warm", embers: 22, emberTone: "gold" };
    case "testimonials":
      return { volumetric: 0.55, tone: "gold", embers: 20, emberTone: "gold" };
    case "promise":
      return { volumetric: 0.6, tone: "gold", embers: 26, emberTone: "gold" };
    case "finale":
      return { volumetric: 0.8, tone: "gold", embers: 40, emberTone: "gold" };
    case "credits":
      return { volumetric: 0.45, tone: "royal", embers: 16, emberTone: "gold" };
    default:
      return { volumetric: 0.4, tone: "royal", embers: 16, emberTone: "gold" };
  }
}
