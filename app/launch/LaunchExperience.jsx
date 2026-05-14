"use client";

// ---------------------------------------------------------------------------
// Sanfort International School — Digital Inauguration Experience
// ---------------------------------------------------------------------------
// A self-contained cinematic launch sequence designed for the live event.
// The Chief Guest taps ONE activation orb and the entire ecosystem reveal
// auto-plays. Everything here is hand-rolled (no Framer Motion / Three.js)
// so it loads fast and runs reliably on projector hardware.
//
// Scene state machine:
//   0  preloader        — black + "Education Is Evolving"            (6s)
//   1  intro            — 4 emotional headlines                      (16s)
//   2  activation_ready — orb, waits for Chief Guest tap             (∞)
//   3  activating       — light burst + logo reveal                  (6s)
//   4  seq_attendance   — Sequence 1                                 (9s)
//   5  seq_parent       — Sequence 2                                 (9s)
//   6  seq_transport    — Sequence 3                                 (9s)
//   7  seq_finance      — Sequence 4                                 (9s)
//   8  seq_ecosystem    — Sequence 5 (network viz)                   (11s)
//   9  seq_automation   — Sequence 6                                 (9s)
//   10 testimonials     — Step 6                                     (12s)
//   11 promise_wall     — Step 7, interactive                        (∞)
//   12 finale           — Step 8, final state                        (∞)
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSoundManager } from "./audio";

// Scene timings in milliseconds. Tuned for the live event — adjust here if
// the Chief Guest's pacing needs a different cadence. Scenes with `null`
// wait for user input (the orb tap, the promise-wall "continue" tap).
const SCENE_DURATION = {
  0: 6000,    // preloader
  1: 16000,   // intro
  2: null,    // activation_ready — waits for click
  3: 6000,    // activating
  4: 9000,    // attendance
  5: 9000,    // parent
  6: 9000,    // transport
  7: 9000,    // finance
  8: 11000,   // ecosystem
  9: 9000,    // automation
  10: 12000,  // testimonials
  11: null,   // promise_wall — waits for "continue"
  12: null,   // finale — terminal
};

const TOTAL_SCENES = Object.keys(SCENE_DURATION).length;

// Brand palette — pulled straight from the main app's CSS vars so this
// experience reads as the SAME school, not a separate site. Light, warm,
// paper-like — Apple-keynote tone rather than sci-fi-cinema tone.
const C = {
  // Backgrounds — warm cream, with a slightly darker tone for depth
  paper: "#FAF7EF",  // primary background
  paperSoft: "#F1ECE0",  // subtle warm depth for gradients
  paperDeep: "#E6DECB",  // deepest cream for vignette inner
  // Surfaces
  white: "#FFFFFF",  // cards / panels
  rule: "#E5E7EB",  // hairline borders
  ruleSoft: "#EFE9DC",  // even fainter borders on cream
  // Text
  ink: "#15161A",  // primary text
  inkSoft: "#3A3D44",  // secondary text
  inkMuted: "#6B6F78",  // tertiary / meta
  // Brand
  navy: "#15306B",  // deep brand blue
  blue: "#1F3F8B",  // primary brand blue
  blueSky: "#3B66D8",  // brighter brand blue
  blueSoft: "#E6EBF5",  // brand blue wash
  // Accents
  orange: "#E8530E",  // primary accent (italic words, gradients)
  orangeSoft: "#FDE6D6",  // orange wash for chips
  gold: "#C49B3C",  // warm secondary accent
  cream: "#F0E4C8",  // warm cream accent (used sparingly)
};

export default function LaunchExperience() {
  const [scene, setScene] = useState(0);
  const [muted, setMuted] = useState(true);
  const [promises, setPromises] = useState([]); // strings collected from the promise wall
  const [bootProgress, setBootProgress] = useState(0); // 0..100 for preloader

  // Auto-advance scenes whose duration is non-null.
  useEffect(() => {
    const dur = SCENE_DURATION[scene];
    if (dur == null) return;
    const t = setTimeout(() => setScene((s) => Math.min(s + 1, TOTAL_SCENES - 1)), dur);
    return () => clearTimeout(t);
  }, [scene]);

  // Boot progress runs alongside the preloader for the bottom progress bar.
  useEffect(() => {
    if (scene !== 0) return;
    const start = Date.now();
    const id = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / SCENE_DURATION[0]) * 100);
      setBootProgress(pct);
      if (pct >= 100) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [scene]);

  // Fullscreen toggle — projector / live event needs this. The button is
  // tucked in the corner; F11 also works browser-natively.
  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => { });
    } else {
      document.exitFullscreen?.().catch(() => { });
    }
  }, []);

  // Skip — for live-event safety if the Chief Guest is ready before a
  // scene finishes, or if a scene needs to be re-tried. Right-arrow skips
  // forward, left-arrow rewinds.
  const skipForward = useCallback(() => {
    setScene((s) => Math.min(s + 1, TOTAL_SCENES - 1));
  }, []);
  const skipBack = useCallback(() => {
    setScene((s) => Math.max(s - 1, 0));
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") skipForward();
      else if (e.key === "ArrowLeft") skipBack();
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
      else if (e.key === "Escape") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [skipForward, skipBack, toggleFullscreen]);

  // Long-lived sound engine — synthesised pads, drones and one-shot cues.
  // Created once and kept alive across scene changes so the ambient bed
  // can crossfade smoothly. See audio.js for the synth graph details.
  const soundRef = useRef(null);
  if (typeof window !== "undefined" && !soundRef.current) {
    soundRef.current = createSoundManager();
  }
  // Keep the engine's mute flag in sync with the React state.
  useEffect(() => {
    soundRef.current?.setMuted(muted);
  }, [muted]);
  // Tear the audio graph down when the component unmounts (route change /
  // navigation away). Without this the AudioContext leaks.
  useEffect(() => () => { soundRef.current?.dispose(); }, []);

  // Map each scene to (a) the ambient pad mode that should play under it
  // and (b) the cues that fire when the scene becomes active. The cues
  // run on a tiny delay so they sit just after the visual reveal rather
  // than slapping the audience on the entrance.
  useEffect(() => {
    const snd = soundRef.current;
    if (!snd) return;

    // Ambient bed per scene.
    const ambientForScene = (s) => {
      if (s === 0) return "preloader";
      if (s === 1) return "intro";
      if (s === 2) return "orb";
      if (s === 3) return "sequence";   // burst takes over; pad swaps quietly
      if (s >= 4 && s <= 9) return "sequence";
      if (s === 10) return "testimonials";
      if (s === 11) return "promise";
      if (s === 12) return "finale";
      return "silent";
    };
    snd.setAmbient(ambientForScene(scene));

    // Orb sub-bass pulse only during scene 2.
    if (scene === 2) snd.startOrbPulse(); else snd.stopOrbPulse();

    // Per-scene cue timings. Wrapped in setTimeouts so they coincide
    // with the visible animations rather than firing at scene-start.
    const timers = [];
    const fire = (type, delayMs) => {
      timers.push(setTimeout(() => snd.cue(type), delayMs));
    };

    if (scene === 1) {
      // Four headline reveals — one chime each, matching SceneIntro's
      // 3.8-second cadence.
      fire("reveal", 200);
      fire("reveal", 4000);
      fire("reveal", 7800);
      fire("reveal", 11600);
    } else if (scene === 3) {
      // The big activation moment. Burst + a delayed shimmer ping for the
      // emblem reveal.
      fire("burst", 100);
      fire("ping", 1700);
    } else if (scene === 4) {
      // Attendance — student card, then ping when the parent gets notified.
      fire("ping", 400);
      fire("ping", 1400);
      fire("chime", 2400);
    } else if (scene === 5) {
      // Parent communication — one tick per bubble.
      fire("tick", 600);
      fire("tick", 1600);
      fire("tick", 2600);
      fire("tick", 3600);
      fire("ping", 4600);
    } else if (scene === 6) {
      // Transport — soft whoosh as the route draws, then a tick at each stop.
      fire("whoosh", 400);
      [2000, 3000, 4000, 5000].forEach((t) => fire("tick", t));
    } else if (scene === 7) {
      // Finance — KPIs count in, bars rise.
      fire("ping", 400);
      fire("ping", 700);
      fire("ping", 1000);
      fire("whoosh", 1400);
    } else if (scene === 8) {
      // Ecosystem reveal — the visual centrepiece. Ping per node as it
      // pops in, matching the 0.15s stagger inside SeqEcosystem.
      for (let i = 0; i < 8; i++) fire("ping", 2000 + i * 150);
    } else if (scene === 9) {
      // Automation — one tick per flow row.
      [600, 850, 1100, 1350, 1600].forEach((t) => fire("tick", t));
    } else if (scene === 10) {
      // Testimonials — one chime per card.
      [800, 1000, 1200, 1400].forEach((t) => fire("chime", t));
    } else if (scene === 12) {
      // Finale — the big chord.
      fire("finale", 400);
    }
    // Subtle whoosh on every scene transition for continuity.
    if (scene > 0 && scene !== 2) fire("whoosh", 0);

    return () => { timers.forEach(clearTimeout); };
  }, [scene]);

  const handleOrbTap = useCallback(() => {
    if (scene !== 2) return;
    // Force the audio context to wake up on this user gesture — even if
    // the user never unmuted, the burst can still play.
    soundRef.current?.ensureContext();
    setScene(3);
  }, [scene]);

  // Decide which particle preset to use for the current scene. The canvas
  // particle layer is a fixed-position background that runs throughout —
  // we just hand it a mode name and it picks a colour / density / motion.
  const particleMode = useMemo(() => {
    if (scene === 0) return "ambient_dim";
    if (scene === 1) return "ambient_flow";
    if (scene === 2) return "ambient_orb";
    if (scene === 3) return "burst";
    if (scene >= 4 && scene <= 9) return "ambient_holo";
    if (scene === 10) return "ambient_warm";
    if (scene === 11) return "ambient_stars";
    if (scene === 12) return "rising";
    return "ambient_dim";
  }, [scene]);

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        // Warm paper background with a subtle radial highlight at centre,
        // matching the main app's light tone. The radial keeps focus on
        // the headline / orb without ever going harsh-white.
        background: `radial-gradient(ellipse at center, ${C.paper} 0%, ${C.paperSoft} 65%, ${C.paperDeep} 100%)`,
        color: C.ink, overflow: "hidden",
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", "Inter", sans-serif',
      }}
    >
      {/* Persistent particle field — mode changes per scene */}
      <ParticleCanvas mode={particleMode} />

      {/* Soft warm halo so the centre reads first without going dark */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(circle at center, ${C.orangeSoft}33 0%, transparent 55%)`,
          pointerEvents: "none",
        }}
      />

      {/* SCENES — only one is active visually but we render with opacity
          transitions so transitions cross-fade. Each scene knows whether
          it should render or stay hidden based on the current `scene` value. */}
      <ScenePreloader active={scene === 0} progress={bootProgress} />
      <SceneIntro active={scene === 1} />
      <SceneActivation active={scene === 2} onTap={handleOrbTap} />
      <SceneBurst active={scene === 3} />
      <SeqAttendance active={scene === 4} />
      <SeqParent active={scene === 5} />
      <SeqTransport active={scene === 6} />
      <SeqFinance active={scene === 7} />
      <SeqEcosystem active={scene === 8} />
      <SeqAutomation active={scene === 9} />
      <SceneTestimonials active={scene === 10} />
      <ScenePromiseWall
        active={scene === 11}
        promises={promises}
        onAdd={(text) => {
          setPromises((p) => [...p, { id: Date.now() + Math.random(), text }]);
          soundRef.current?.cue("chime");
        }}
        onContinue={skipForward}
      />
      <SceneFinale active={scene === 12} promises={promises} />

      {/* Top-right utility cluster — small, unobtrusive. Visible throughout
          so the live operator can muscle through any pacing hiccups. The
          mute button pulses on the preloader as a visual reminder to
          enable sound before the Chief Guest arrives. */}
      <UtilityCluster
        muted={muted}
        onToggleMute={() => {
          // Unmuting counts as the user gesture that wakes WebAudio.
          soundRef.current?.ensureContext();
          setMuted((m) => !m);
        }}
        onFullscreen={toggleFullscreen}
        scene={scene}
        total={TOTAL_SCENES}
        muteAttention={muted && scene <= 1}
      />

      {/* Bottom-left credit line, only after activation. Keeps the brand
          present without competing with the centrepiece. */}
      {scene >= 3 && (
        <div
          style={{
            position: "absolute", left: 24, bottom: 22,
            fontSize: 11, letterSpacing: "0.18em", color: C.inkMuted,
            textTransform: "uppercase", fontWeight: 500,
            zIndex: 50,
          }}
        >
          Presented by <span style={{ color: C.orange, fontWeight: 700 }}>Sirah Digital</span>
        </div>
      )}

      {/* Global keyframes used across scenes. Kept in one place so timings
          stay coherent and the bundle stays slim. */}
      <style jsx global>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes riseUp  { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes drift   { 0% { transform: translateY(0) } 50% { transform: translateY(-8px) } 100% { transform: translateY(0) } }
        @keyframes pulse   { 0%,100% { transform: scale(1); opacity: 0.85 } 50% { transform: scale(1.08); opacity: 1 } }
        @keyframes orbGlow { 0%,100% { box-shadow: 0 0 60px 10px ${C.blue}44, 0 0 140px 40px ${C.orange}22, inset 0 0 40px ${C.gold}55 } 50% { box-shadow: 0 0 120px 30px ${C.blue}66, 0 0 260px 60px ${C.orange}33, inset 0 0 60px ${C.gold}88 } }
        @keyframes burst   { 0% { transform: scale(0.1); opacity: 1 } 70% { opacity: 0.7 } 100% { transform: scale(40); opacity: 0 } }
        @keyframes ringExpand { 0% { transform: scale(0.5); opacity: 1; border-width: 4px } 100% { transform: scale(10); opacity: 0; border-width: 0.5px } }
        @keyframes shimmer  { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        @keyframes typewriter { from { width: 0 } to { width: 100% } }
        @keyframes spinSlow { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        @keyframes glowPulse { 0%,100% { filter: drop-shadow(0 0 10px ${C.orange}66) } 50% { filter: drop-shadow(0 0 24px ${C.orange}cc) drop-shadow(0 0 50px ${C.gold}66) } }
        @keyframes lineDraw  { from { stroke-dashoffset: 1000 } to { stroke-dashoffset: 0 } }
        @keyframes float     { 0% { transform: translateY(100vh) translateX(0); opacity: 0 } 10% { opacity: 1 } 90% { opacity: 1 } 100% { transform: translateY(-20vh) translateX(20px); opacity: 0 } }
        @keyframes countUp   { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes busMove   { 0% { offset-distance: 0% } 100% { offset-distance: 100% } }
        @keyframes pulseDot  { 0%,100% { transform: scale(1); opacity: 0.6 } 50% { transform: scale(1.6); opacity: 1 } }
        @keyframes scanLine  { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }
        @keyframes letterReveal { 0% { opacity: 0; transform: translateY(20px); filter: blur(8px) } 100% { opacity: 1; transform: translateY(0); filter: blur(0) } }

        html, body { background: ${C.paper}; }
        body { margin: 0; }
        .launch-scene {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          flex-direction: column;
          transition: opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .launch-scene.active   { opacity: 1; pointer-events: auto; z-index: 10 }
        .launch-scene.inactive { opacity: 0; pointer-events: none;  z-index: 5  }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Particle canvas — single fixed-position layer that we re-style per scene.
// ---------------------------------------------------------------------------
// Modes:
//   ambient_dim    — sparse, slow, very dim white (preloader)
//   ambient_flow   — left-to-right gentle drift, navy/sky blue (intro)
//   ambient_orb    — slow inward pull toward centre (activation_ready)
//   burst          — explosion outward from centre, multi-colour (activating)
//   ambient_holo   — grid-like data motes, sky-blue (ecosystem sequences)
//   ambient_warm   — slow drifting embers, gold (testimonials)
//   ambient_stars  — twinkling stars, varied sizes (promise wall)
//   rising         — particles rising upward like an awakening (finale)
function ParticleCanvas({ mode }) {
  const ref = useRef(null);
  // Keep mode in a ref so the rAF loop sees the latest value without
  // re-creating particles on every mode flip.
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Trigger a particle reseed when the mode changes from a "calm" mode
  // into "burst" (we want a hard reset there for the explosion to read).
  const seedKey = mode === "burst" ? "burst" : "ambient";

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    const DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

    function resize() {
      canvas.width = window.innerWidth * DPR;
      canvas.height = window.innerHeight * DPR;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
    }
    resize();
    window.addEventListener("resize", resize);

    // Initial particle seed. Quantity scaled with viewport so phones don't
    // melt and projectors still look lush. Each particle: {x,y,vx,vy,r,c,life}.
    const area = window.innerWidth * window.innerHeight;
    const N = Math.min(220, Math.max(80, Math.floor(area / 14000)));
    const particles = [];
    for (let i = 0; i < N; i++) particles.push(makeParticle());

    function rand(a, b) { return a + Math.random() * (b - a); }
    function makeParticle() {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      if (seedKey === "burst") {
        const a = Math.random() * Math.PI * 2;
        const s = rand(8, 28) * DPR;
        // Burst palette uses warm brand tones — orange, gold, navy —
        // so the explosion reads against the cream background instead
        // of getting lost in it.
        const palette = [C.orange, C.gold, C.blue, C.orange];
        return {
          x: cx, y: cy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          r: rand(1.5, 4) * DPR,
          c: palette[(Math.random() * palette.length) | 0],
          life: 1,
        };
      }
      return {
        x: rand(0, canvas.width),
        y: rand(0, canvas.height),
        vx: rand(-0.3, 0.3) * DPR,
        vy: rand(-0.3, 0.3) * DPR,
        r: rand(0.6, 2.2) * DPR,
        c: C.ink,
        life: rand(0.3, 1),
      };
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const m = modeRef.current;

      // Per-mode physics tweaks.
      const cx = canvas.width / 2, cy = canvas.height / 2;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (m === "burst") {
          p.vx *= 0.985; p.vy *= 0.985;
          p.life *= 0.985;
          if (p.life < 0.05) {
            // Re-spawn fresh particles inside the burst phase so it sustains.
            const a = Math.random() * Math.PI * 2;
            const s = rand(4, 16) * DPR;
            p.x = cx; p.y = cy;
            p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
            p.life = 1;
          }
        } else if (m === "ambient_orb") {
          // Drift slowly toward the centre — like the orb is pulling them in.
          const dx = cx - p.x, dy = cy - p.y;
          const d = Math.hypot(dx, dy) || 1;
          p.vx += (dx / d) * 0.008;
          p.vy += (dy / d) * 0.008;
          p.vx *= 0.96; p.vy *= 0.96;
        } else if (m === "rising") {
          p.vy = -rand(0.4, 1.2) * DPR;
          p.vx = Math.sin(p.y * 0.005) * 0.4 * DPR;
        } else if (m === "ambient_flow") {
          p.vx = 0.4 * DPR;
          p.vy = Math.sin((p.x + Date.now() * 0.001) * 0.005) * 0.2 * DPR;
        } else if (m === "ambient_holo") {
          p.vy = 0.25 * DPR;
          p.vx = Math.sin((p.y + Date.now() * 0.0008) * 0.006) * 0.3 * DPR;
        } else if (m === "ambient_warm") {
          p.vy = -rand(0.1, 0.4) * DPR;
          p.vx = Math.sin(p.y * 0.01) * 0.2 * DPR;
        } else if (m === "ambient_stars") {
          // Stationary twinkle.
          p.vx = 0; p.vy = 0;
          p.life = 0.4 + Math.abs(Math.sin(Date.now() * 0.001 + p.x)) * 0.6;
        }

        p.x += p.vx; p.y += p.vy;

        // Wrap around so we don't drain the field.
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        // Tint based on mode. We're on a warm cream background so the
        // particles are tinted with brand colours at low opacity — they
        // suggest motion without ever competing with the foreground text.
        let color = `rgba(31,63,139,${(p.life * 0.22).toFixed(2)})`;       // default: faint navy specks
        if (m === "ambient_flow") color = `rgba(31,63,139,${(p.life * 0.25).toFixed(2)})`;
        if (m === "ambient_orb") color = `rgba(232,83,14,${(p.life * 0.30).toFixed(2)})`;   // warm orange pull
        if (m === "burst") {
          const hex = p.c.replace("#", "");
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          color = `rgba(${r},${g},${b},${p.life.toFixed(2)})`;
        }
        if (m === "ambient_holo") color = `rgba(31,63,139,${(p.life * 0.28).toFixed(2)})`;
        if (m === "ambient_warm") color = `rgba(196,155,60,${(p.life * 0.55).toFixed(2)})`;
        if (m === "ambient_stars") color = `rgba(196,155,60,${(p.life * 0.45).toFixed(2)})`;
        if (m === "rising") color = `rgba(232,83,14,${(p.life * 0.55).toFixed(2)})`;
        if (m === "ambient_dim") color = `rgba(31,63,139,${(p.life * 0.18).toFixed(2)})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [seedKey]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }}
    />
  );
}

// ---------------------------------------------------------------------------
// Utility cluster (top-right) — mute / fullscreen + a slim scene indicator.
// Always interactive (z-index above scenes) so the live operator can take
// control if pacing slips.
// ---------------------------------------------------------------------------
function UtilityCluster({ muted, onToggleMute, onFullscreen, scene, total, muteAttention }) {
  const btn = {
    background: "rgba(255,255,255,0.8)",
    border: `1px solid ${C.rule}`,
    color: C.inkSoft,
    width: 36, height: 36, borderRadius: 999,
    cursor: "pointer", display: "grid", placeItems: "center",
    transition: "background .15s, transform .15s",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05), 0 4px 12px -6px rgba(0,0,0,0.08)",
    backdropFilter: "blur(4px)",
  };
  // When sound is muted at the very start of the event, draw the operator's
  // eye to the mute toggle with an orange ring + slow pulse — the live
  // event is much better with audio on.
  const muteBtn = muteAttention
    ? {
      ...btn,
      background: C.orangeSoft,
      border: `1px solid ${C.orange}`,
      color: C.orange,
      boxShadow: `0 0 0 0 ${C.orange}55, 0 4px 12px -4px ${C.orange}44`,
      animation: "pulse 2s ease-in-out infinite",
    }
    : btn;
  return (
    <div
      style={{
        position: "absolute", top: 22, right: 22, zIndex: 100,
        display: "flex", alignItems: "center", gap: 8,
      }}
    >
      <div
        title="Scene progress"
        style={{
          fontSize: 10, color: C.inkMuted,
          letterSpacing: "0.15em", marginRight: 6,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {String(scene + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>
      {muteAttention && (
        <span
          aria-hidden="true"
          style={{
            fontSize: 9.5, letterSpacing: "0.25em", color: C.orange,
            textTransform: "uppercase", fontWeight: 700,
            animation: "fadeIn 0.8s ease-out",
          }}
        >
          Enable sound →
        </span>
      )}
      <button onClick={onToggleMute} style={muteBtn} title={muted ? "Unmute (Esc)" : "Mute (Esc)"} aria-label="Toggle sound">
        {muted ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M22 9l-6 6M16 9l6 6" /></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a9 9 0 0 1 0 14" /></svg>
        )}
      </button>
      <button onClick={onFullscreen} style={btn} title="Fullscreen (F)" aria-label="Fullscreen">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
      </button>
    </div>
  );
}

// ===========================================================================
// SCENE 0 — Preloader
// ===========================================================================
function ScenePreloader({ active, progress }) {
  return (
    <div className={`launch-scene ${active ? "active" : "inactive"}`}>
      {/* Emblem outline, dimly visible — slightly stronger now that it
          sits on a cream background instead of pure black. */}
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: 0.22 }}>
        <EmblemOutline size={280} />
      </div>

      <div style={{ textAlign: "center", maxWidth: 720, padding: 24, zIndex: 2 }}>
        {/* Two-stage reveal: "Education Is Evolving" first, then the prep line */}
        <div
          style={{
            fontSize: "clamp(32px, 5.5vw, 72px)",
            fontWeight: 300,
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            color: C.ink,
            animation: "letterReveal 1.6s ease-out both",
          }}
        >
          Education <span style={{ fontStyle: "italic", color: C.orange, fontWeight: 400 }}>Is Evolving</span>
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: "clamp(11px, 1vw, 13px)",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: C.inkMuted,
            opacity: 0,
            animation: "fadeIn 1.2s ease-out 2.6s both",
          }}
        >
          Preparing Sanfort Digital Ecosystem
        </div>
      </div>

      {/* Hairline progress bar at the bottom */}
      <div
        style={{
          position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)",
          width: "min(420px, 70vw)", height: 2, background: C.ruleSoft,
          borderRadius: 999, overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${C.orange}, ${C.gold})`,
            transition: "width 0.1s linear",
            boxShadow: `0 0 12px ${C.orange}66`,
          }}
        />
      </div>
    </div>
  );
}

// Stylised circular crest used as a watermark / brand mark throughout.
// Decorative SVG ring + rays used as a frame around the real school logo.
// Kept on its own so SchoolMark can pull just the ring without re-importing
// any logic.
function EmblemRing({ size = 160, opacity = 1 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ display: "block", opacity }}>
      <defs>
        <linearGradient id="emb-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={C.blue} />
          <stop offset="100%" stopColor={C.orange} />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="none" stroke="url(#emb-stroke)" strokeWidth="1.4" />
      <circle cx="100" cy="100" r="84" fill="none" stroke={C.inkMuted} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />
      {/* Outer rays */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const x1 = 100 + Math.cos(a) * 92;
        const y1 = 100 + Math.sin(a) * 92;
        const x2 = 100 + Math.cos(a) * 99;
        const y2 = 100 + Math.sin(a) * 99;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 2 === 0 ? C.orange : C.blue} strokeWidth="0.8" opacity="0.75" />;
      })}
    </svg>
  );
}

// The school's actual logo, framed by the decorative ring. Used as the
// brand mark in every "reveal" moment of the experience — preloader
// watermark, activation reveal, ecosystem centrepiece, finale.
//
// `size` is the outer container size; the logo image takes ~62% of that
// so the ring has comfortable breathing room. `glow` adds the warm
// drop-shadow used during the burst + finale.
function SchoolMark({ size = 200, glow = false, ring = true }) {
  const inner = Math.round(size * 0.62);
  return (
    <div
      style={{
        position: "relative",
        width: size, height: size,
        display: "grid", placeItems: "center",
        filter: glow ? `drop-shadow(0 0 18px ${C.orange}88) drop-shadow(0 0 40px ${C.gold}55)` : "none",
      }}
    >
      {ring && (
        <div style={{ position: "absolute", inset: 0 }}>
          <EmblemRing size={size} />
        </div>
      )}
      <img
        src="/logo.png"
        alt="Sanfort International School"
        width={inner}
        height={inner}
        style={{
          width: inner, height: inner,
          objectFit: "contain",
          // Soft white halo behind the logo so it always reads against the
          // ring rays / particle field, regardless of the source PNG's
          // background transparency or trim.
          filter: `drop-shadow(0 4px 12px ${C.navy}22)`,
          position: "relative",
          zIndex: 2,
        }}
      />
    </div>
  );
}

// Back-compat alias — earlier scene components referenced EmblemOutline.
// Keeping the name working so we don't have to touch every call site.
const EmblemOutline = SchoolMark;

// ===========================================================================
// SCENE 1 — Cinematic intro headlines
// ===========================================================================
function SceneIntro({ active }) {
  // Each headline gets the navy + italic-orange treatment used throughout
  // the main app: a near-black word, then the punchy word in italic orange.
  const lines = [
    { plain: "", accent: "Connected." },
    { plain: "", accent: "Transparent." },
    { plain: "", accent: "Future Ready." },
    { plain: "One Unified", accent: "Ecosystem." },
  ];
  return (
    <div className={`launch-scene ${active ? "active" : "inactive"}`}>
      {/* Background hint: very subtle navy grid lines that fade out at the
          edges — suggests "structure" without dominating. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, opacity: 0.18,
          backgroundImage:
            `linear-gradient(${C.blue}22 1px, transparent 1px), linear-gradient(90deg, ${C.blue}22 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(circle at center, black 0%, transparent 65%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 0%, transparent 65%)",
        }}
      />

      {active && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          {lines.map((l, i) => (
            <div
              key={i}
              style={{
                fontSize: "clamp(40px, 7.5vw, 100px)",
                fontWeight: 300,
                letterSpacing: "-0.03em",
                color: C.ink,
                opacity: 0,
                animation: `letterReveal 1.4s cubic-bezier(0.2, 0.7, 0.2, 1) ${i * 3.8}s both, fadeOut 1.2s ease-out ${i * 3.8 + 2.6}s both`,
                position: i > 0 ? "absolute" : "static",
                textAlign: "center",
              }}
            >
              {l.plain && <span style={{ marginRight: "0.35em" }}>{l.plain}</span>}
              <span style={{ color: C.orange, fontStyle: "italic", fontWeight: 400 }}>{l.accent}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// SCENE 2 — Activation orb (the centrepiece)
// ===========================================================================
function SceneActivation({ active, onTap }) {
  return (
    <div className={`launch-scene ${active ? "active" : "inactive"}`}>
      {/* Warm halo behind the orb — gives the centre weight without the
          heavy dark vignette of a cinema theme. */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(circle at center, ${C.orangeSoft}88 0%, transparent 45%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <div
          style={{
            fontSize: "clamp(32px, 5.5vw, 64px)",
            fontWeight: 300,
            letterSpacing: "-0.025em",
            color: C.ink,
            opacity: 0,
            animation: active ? "letterReveal 1.4s ease-out 0.4s both" : "none",
          }}
        >
          The Future Is <span style={{ color: C.orange, fontStyle: "italic", fontWeight: 400 }}>Waiting</span>
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: "clamp(11px, 1vw, 13px)",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: C.inkMuted,
            opacity: 0,
            animation: active ? "fadeIn 1.2s ease-out 1.6s both" : "none",
          }}
        >
          One touch begins the transformation
        </div>
      </div>

      {/* The Orb — confident navy disc with a warm gold rim. The cream
          background lets the brand blue read as solid and intentional. */}
      <button
        onClick={onTap}
        aria-label="Activate the Sanfort digital ecosystem"
        style={{
          position: "relative",
          width: "min(280px, 36vmin)",
          height: "min(280px, 36vmin)",
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: `radial-gradient(circle at 30% 30%, ${C.blueSky} 0%, ${C.blue} 35%, ${C.navy} 80%, ${C.navy} 100%)`,
          animation: "orbGlow 3s ease-in-out infinite, drift 5s ease-in-out infinite",
          padding: 0,
          outline: "none",
        }}
      >
        {/* Inner shimmer rings */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute", inset: 6,
            borderRadius: "50%",
            border: `1px solid ${C.gold}88`,
            animation: "spinSlow 14s linear infinite",
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: "absolute", inset: 20,
            borderRadius: "50%",
            border: `1px dashed ${C.gold}55`,
            animation: "spinSlow 22s linear infinite reverse",
          }}
        />
        {/* Inner emblem */}
        <span
          style={{
            position: "absolute", inset: 0,
            display: "grid", placeItems: "center",
            color: C.white,
            fontSize: "clamp(11px, 1vw, 13px)",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            fontWeight: 700,
            textShadow: `0 0 14px ${C.gold}aa`,
          }}
        >
          ACTIVATE
        </span>
      </button>

      <div
        style={{
          marginTop: 48,
          fontSize: 11,
          letterSpacing: "0.3em",
          color: C.inkMuted,
          textTransform: "uppercase",
          fontWeight: 600,
          opacity: 0,
          animation: active ? "fadeIn 1.5s ease-out 2.4s both, pulse 2s ease-in-out 4s infinite" : "none",
        }}
      >
        Tap the orb to begin
      </div>
    </div>
  );
}

// ===========================================================================
// SCENE 3 — Activation burst + school identity reveal
// ===========================================================================
function SceneBurst({ active }) {
  return (
    <div className={`launch-scene ${active ? "active" : "inactive"}`}>
      {/* Expanding orange-gold sun that briefly washes the centre warm */}
      {active && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute", left: "50%", top: "50%",
            width: 40, height: 40, marginLeft: -20, marginTop: -20,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${C.gold} 0%, ${C.orange} 40%, transparent 70%)`,
            animation: "burst 2.4s cubic-bezier(0.2, 0.8, 0.3, 1) forwards",
            mixBlendMode: "multiply",
          }}
        />
      )}
      {/* Expanding rings — alternating brand orange + brand navy */}
      {active && [0, 0.4, 0.8].map((delay, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            position: "absolute", left: "50%", top: "50%",
            width: 200, height: 200, marginLeft: -100, marginTop: -100,
            borderRadius: "50%",
            border: `2px solid ${i === 1 ? C.blue : C.orange}`,
            animation: `ringExpand 2.8s cubic-bezier(0.2, 0.8, 0.3, 1) ${delay}s forwards`,
            opacity: 0.65,
          }}
        />
      ))}

      {/* Identity reveal — fades in mid-burst */}
      <div
        style={{
          textAlign: "center", zIndex: 5,
          opacity: 0,
          animation: active ? "fadeIn 1.4s ease-out 1.6s both" : "none",
        }}
      >
        <div style={{ display: "grid", placeItems: "center", marginBottom: 22, animation: "glowPulse 3s ease-in-out infinite" }}>
          <SchoolMark size={200} glow />
        </div>
        <div
          style={{
            fontSize: "clamp(32px, 5.5vw, 68px)",
            fontWeight: 300,
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            color: C.ink,
          }}
        >
          Sanfort <span style={{ color: C.orange, fontStyle: "italic", fontWeight: 400 }}>International</span> School
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: "clamp(11px, 1vw, 13px)",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: C.inkMuted,
            fontWeight: 600,
          }}
        >
          Digital Ecosystem · Activated
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable "sequence" frame for the six showcase sequences. Each sequence
// gets a number badge, a headline, a body description, and a visual slot
// that the caller renders.
// ---------------------------------------------------------------------------
function SequenceFrame({ active, num, headline, body, children }) {
  return (
    <div className={`launch-scene ${active ? "active" : "inactive"}`}>
      <div
        style={{
          position: "relative",
          width: "min(1180px, 92vw)",
          height: "min(640px, 72vh)",
          display: "grid",
          gridTemplateColumns: "minmax(280px, 1fr) 1.4fr",
          gap: 48,
          alignItems: "center",
        }}
      >
        {/* Left column — copy */}
        <div style={{ opacity: 0, animation: active ? "riseUp 1.2s ease-out 0.2s both" : "none" }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.4em",
              color: C.orange,
              textTransform: "uppercase",
              marginBottom: 14,
              fontWeight: 700,
            }}
          >
            Sequence {String(num).padStart(2, "0")}
          </div>
          <div
            style={{
              fontSize: "clamp(30px, 4.2vw, 56px)",
              fontWeight: 300,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: C.ink,
              marginBottom: 20,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize: "clamp(13px, 1.1vw, 16px)",
              color: C.inkSoft,
              lineHeight: 1.6,
              maxWidth: 460,
            }}
          >
            {body}
          </div>
        </div>

        {/* Right column — visual */}
        <div
          style={{
            position: "relative",
            height: "100%",
            opacity: 0,
            animation: active ? "fadeIn 1.4s ease-out 0.6s both" : "none",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// Pretty floating panel used inside several sequences. White surface with
// soft navy shadow — same visual language as the KPI cards in the main app.
function GlassPanel({ children, style }) {
  return (
    <div
      style={{
        background: C.white,
        border: `1px solid ${C.rule}`,
        borderRadius: 14,
        boxShadow: `0 30px 60px -30px ${C.navy}33, 0 4px 12px -6px ${C.navy}1a`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ===========================================================================
// SEQUENCE 1 — Smart Student Attendance
// ===========================================================================
function SeqAttendance({ active }) {
  return (
    <SequenceFrame
      active={active}
      num={1}
      headline={<>Attendance. <span style={{ color: C.gold, fontStyle: "italic" }}>Instantly Connected.</span></>}
      body="Teachers mark attendance once. The admin dashboard reflects it in real time and parents receive a confirmation on their phone — no follow-up calls, no missed notifications."
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {/* Student profile card */}
        <GlassPanel
          style={{
            position: "absolute", top: "12%", left: 0,
            padding: 16, width: 240,
            animation: "drift 5s ease-in-out infinite",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.blueSky}, ${C.blue})`,
                display: "grid", placeItems: "center",
                fontWeight: 700, fontSize: 14, color: C.white,
              }}
            >
              AB
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Aisha Banu</div>
              <div style={{ fontSize: 11, color: C.inkMuted }}>Class 5-A · Roll 14</div>
            </div>
          </div>
          <div
            style={{
              marginTop: 12, padding: "6px 10px",
              background: "#E6F4EA",
              border: "1px solid #95D5A8",
              borderRadius: 6, fontSize: 11, fontWeight: 700,
              color: "#1F7A3F",
              display: "inline-block",
            }}
          >
            ● Present · 08:42 AM
          </div>
        </GlassPanel>

        {/* Connecting flow line — left card to right card */}
        <svg
          aria-hidden="true"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          preserveAspectRatio="none"
          viewBox="0 0 400 400"
        >
          <defs>
            <linearGradient id="flow-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={C.blueSky} stopOpacity="0" />
              <stop offset="50%" stopColor={C.blueSky} stopOpacity="0.8" />
              <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 60 100 Q 200 200, 340 240"
            stroke="url(#flow-line)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="6 6"
            style={{ animation: active ? "lineDraw 2.4s ease-out 0.8s both" : "none", strokeDashoffset: 1000 }}
          />
        </svg>

        {/* Admin dashboard panel */}
        <GlassPanel
          style={{
            position: "absolute", bottom: "12%", right: 0,
            padding: 18, width: 280,
            animation: "drift 6s ease-in-out infinite 0.5s",
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: "0.25em", color: C.inkMuted, textTransform: "uppercase", marginBottom: 10, fontWeight: 600 }}>
            Class 5-A · Today
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.ink }}>32<span style={{ fontSize: 16, color: C.inkMuted }}>/34</span></div>
            <div style={{ fontSize: 11, color: "#1F7A3F", fontWeight: 600 }}>94% present</div>
          </div>
          <div style={{ height: 6, background: C.paperSoft, borderRadius: 3, overflow: "hidden" }}>
            <div
              style={{
                width: "94%", height: "100%",
                background: `linear-gradient(90deg, ${C.blue}, ${C.orange})`,
                animation: active ? "lineDraw 1.4s ease-out 1.4s both" : "none",
              }}
            />
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: C.inkMuted, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.orange, animation: "pulseDot 1.4s ease-in-out infinite" }} />
            Live sync · just updated
          </div>
        </GlassPanel>

        {/* Notification ping (top right) */}
        <div
          style={{
            position: "absolute", top: 0, right: 8,
            padding: "10px 14px",
            background: `linear-gradient(135deg, ${C.orange}, ${C.gold})`,
            color: "#fff", borderRadius: 10,
            fontSize: 12, fontWeight: 600,
            boxShadow: `0 10px 30px ${C.orange}55`,
            opacity: 0,
            animation: active ? "riseUp 0.8s ease-out 2.2s both, pulse 2s ease-in-out 3s infinite" : "none",
          }}
        >
          ✓ Parent notified
        </div>
      </div>
    </SequenceFrame>
  );
}

// ===========================================================================
// SEQUENCE 2 — Parent Communication
// ===========================================================================
function SeqParent({ active }) {
  return (
    <SequenceFrame
      active={active}
      num={2}
      headline={<>Every Parent. <span style={{ color: C.gold, fontStyle: "italic" }}>Always Connected.</span></>}
      body="Homework, circulars, announcements and student updates reach every parent's phone in seconds — through the channels they already use every day."
    >
      <div style={{ position: "relative", width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
        {/* Phone frame — dark bezel keeps the device feeling like a real
            phone even on a light page (real phones have dark bezels). */}
        <div
          style={{
            position: "relative",
            width: 280, height: 540,
            background: `linear-gradient(180deg, ${C.paper}, ${C.paperSoft})`,
            borderRadius: 36,
            border: `8px solid ${C.navy}`,
            boxShadow: `0 40px 80px -20px ${C.navy}55, 0 0 0 1px ${C.rule} inset`,
            overflow: "hidden",
            animation: "drift 5s ease-in-out infinite",
          }}
        >
          {/* Notch */}
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 100, height: 22, background: C.navy, borderRadius: "0 0 14px 14px" }} />
          {/* Status bar */}
          <div style={{ padding: "32px 18px 8px", color: C.inkMuted, fontSize: 11, display: "flex", justifyContent: "space-between", fontWeight: 500 }}>
            <span>08:43</span>
            <span>WhatsApp · School</span>
          </div>
          {/* Messages */}
          <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            <Bubble side="left" delay={active ? 0.4 : 0}>
              <b style={{ color: C.orange }}>Sanfort International</b>
              <div>Aisha has been marked present today (08:42 AM).</div>
            </Bubble>
            <Bubble side="left" delay={active ? 1.4 : 0}>
              📚 <b>Today's homework:</b><br />Maths · Ex. 4.2, Q1-8
            </Bubble>
            <Bubble side="left" delay={active ? 2.4 : 0}>
              📢 <b>Circular:</b> Annual Day on 22 May — kindly confirm attendance.
            </Bubble>
            <Bubble side="right" delay={active ? 3.4 : 0}>
              ✓ Confirmed. Thank you!
            </Bubble>
          </div>
          {/* Typing indicator */}
          <div
            style={{
              position: "absolute", bottom: 20, left: 16,
              fontSize: 10, color: C.inkMuted,
              display: "flex", alignItems: "center", gap: 6,
              opacity: 0, animation: active ? "fadeIn 0.6s ease-out 4.4s both" : "none",
            }}
          >
            <span style={{ display: "inline-flex", gap: 3 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.orange, animation: "pulseDot 1s ease-in-out infinite" }} />
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.orange, animation: "pulseDot 1s ease-in-out 0.15s infinite" }} />
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.orange, animation: "pulseDot 1s ease-in-out 0.3s infinite" }} />
            </span>
            Teacher typing…
          </div>
        </div>

        {/* Floating notification card next to phone */}
        <div
          style={{
            position: "absolute", top: "8%", right: "5%",
            padding: "10px 14px",
            background: C.white,
            border: `1px solid ${C.rule}`,
            borderRadius: 10, fontSize: 11,
            color: C.ink,
            opacity: 0, animation: active ? "riseUp 0.8s ease-out 2.8s both" : "none",
            boxShadow: `0 10px 24px -10px ${C.navy}33`,
          }}
        >
          <div style={{ color: C.orange, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 3, fontWeight: 700 }}>Now</div>
          <div>📲 4 parents notified</div>
        </div>
      </div>
    </SequenceFrame>
  );
}

function Bubble({ children, side, delay = 0 }) {
  const isRight = side === "right";
  return (
    <div
      style={{
        alignSelf: isRight ? "flex-end" : "flex-start",
        maxWidth: "78%",
        padding: "8px 12px",
        // Right-side bubbles use WhatsApp's outgoing green tint; left
        // (school side) use pure white — both read well on the cream
        // phone screen.
        background: isRight ? "#DCF8C6" : "#FFFFFF",
        border: `1px solid ${isRight ? "#B6E3A3" : C.rule}`,
        borderRadius: 12,
        fontSize: 11.5, lineHeight: 1.4,
        color: C.ink,
        opacity: 0,
        animation: `riseUp 0.6s ease-out ${delay}s both`,
        boxShadow: `0 1px 2px ${C.navy}10`,
      }}
    >
      {children}
    </div>
  );
}

// ===========================================================================
// SEQUENCE 3 — Transport Monitoring
// ===========================================================================
function SeqTransport({ active }) {
  // Six stops along an SVG path. A bus icon moves along it via offset-path.
  return (
    <SequenceFrame
      active={active}
      num={3}
      headline={<>Visibility <span style={{ color: C.gold, fontStyle: "italic" }}>Beyond Campus.</span></>}
      body="Every school bus, every stop, every boarding event — visible to the school office and to parents in real time. Safety becomes a system, not a hope."
    >
      <GlassPanel style={{ position: "relative", width: "100%", height: "100%", padding: 20, overflow: "hidden" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.25em", color: C.inkMuted, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
          Route 1 · Chrompet
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>TN11BS2365</div>
          <div style={{ fontSize: 11, color: "#1F7A3F", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#37B358", animation: "pulseDot 1.2s ease-in-out infinite" }} />
            En route · 4 of 6 stops complete
          </div>
        </div>

        {/* Map area — cool blue-tinted background, like a real map app */}
        <div style={{ position: "relative", marginTop: 16, height: "calc(100% - 80px)", borderRadius: 10, background: C.blueSoft, overflow: "hidden", border: `1px solid ${C.rule}` }}>
          {/* Soft grid */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute", inset: 0, opacity: 0.4,
              backgroundImage:
                `linear-gradient(${C.blue}22 1px, transparent 1px), linear-gradient(90deg, ${C.blue}22 1px, transparent 1px)`,
              backgroundSize: "30px 30px",
            }}
          />
          <svg viewBox="0 0 600 360" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <defs>
              <linearGradient id="route-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={C.gold} />
                <stop offset="100%" stopColor={C.orange} />
              </linearGradient>
            </defs>
            <path
              id="bus-path"
              d="M 40 320 Q 120 220, 200 240 T 360 180 T 540 80"
              fill="none"
              stroke="url(#route-grad)"
              strokeWidth="3"
              strokeDasharray="800"
              strokeDashoffset="800"
              style={{ animation: active ? "lineDraw 2.4s ease-out 0.6s both" : "none" }}
            />
            {/* Stops */}
            {[{ x: 40, y: 320, label: "Start" }, { x: 145, y: 220, label: "Stop 1" }, { x: 240, y: 232, label: "Stop 2" }, { x: 340, y: 192, label: "Stop 3" }, { x: 440, y: 130, label: "Stop 4" }, { x: 540, y: 80, label: "School" }]
              .map((s, i) => (
                <g key={i}>
                  <circle cx={s.x} cy={s.y} r="8" fill={i < 4 ? C.orange : C.white} stroke={C.navy} strokeWidth="1.5" style={{ animation: i < 4 ? "pulseDot 2s ease-in-out infinite" : "none" }} />
                  <text x={s.x + 12} y={s.y + 4} fontSize="9" fill={C.inkSoft} fontWeight="600">{s.label}</text>
                </g>
              ))}
          </svg>

          {/* Bus moving along path */}
          <div
            style={{
              position: "absolute", left: 0, top: 0, width: 32, height: 24,
              offsetPath: 'path("M 40 320 Q 120 220, 200 240 T 360 180 T 540 80")',
              animation: active ? "busMove 9s linear 1.2s both" : "none",
              display: "grid", placeItems: "center",
              filter: `drop-shadow(0 0 10px ${C.orange})`,
            }}
          >
            <div style={{ fontSize: 22 }}>🚌</div>
          </div>

          {/* Live HUD */}
          <div
            style={{
              position: "absolute", bottom: 10, right: 10,
              padding: "8px 12px",
              background: C.white,
              border: `1px solid ${C.rule}`,
              borderRadius: 8,
              fontSize: 11, color: C.ink,
              boxShadow: `0 4px 12px -4px ${C.navy}33`,
            }}
          >
            <div style={{ fontSize: 9, color: C.orange, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 2, fontWeight: 700 }}>ETA</div>
            <div style={{ fontWeight: 600 }}>School · 8 min</div>
          </div>
        </div>
      </GlassPanel>
    </SequenceFrame>
  );
}

// ===========================================================================
// SEQUENCE 4 — Smart Finance & Trust Management
// ===========================================================================
function SeqFinance({ active }) {
  const bars = [42, 78, 64, 91, 55, 88];
  return (
    <SequenceFrame
      active={active}
      num={4}
      headline={<>Leadership Through <span style={{ color: C.gold, fontStyle: "italic" }}>Transparency.</span></>}
      body="Fees, donations, expenses and operations — every rupee accounted for, every trend visible. Decision-makers see the full picture in one breath."
    >
      <GlassPanel style={{ width: "100%", height: "100%", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.25em", color: C.inkMuted, textTransform: "uppercase", fontWeight: 600 }}>
          Financial Pulse · April–May
        </div>
        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <KpiCard label="Collected" value="₹ 10L" delta="+18%" delay={0.4} active={active} />
          <KpiCard label="Pending" value="₹ 10L" delta="-6%" tone="warn" delay={0.7} active={active} />
          <KpiCard label="Donations" value="₹ 10L" delta="+42%" tone="ok" delay={1.0} active={active} />
        </div>
        {/* Bar chart */}
        <div style={{ marginTop: 6, flex: 1, display: "flex", alignItems: "flex-end", gap: 10, padding: "10px 4px", borderTop: `1px solid ${C.ruleSoft}` }}>
          {bars.map((h, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: "100%",
                  height: active ? `${h}%` : "0%",
                  background: `linear-gradient(180deg, ${C.orange}, ${C.gold})`,
                  borderRadius: "4px 4px 0 0",
                  transition: `height 0.9s cubic-bezier(0.2, 0.8, 0.3, 1) ${0.8 + i * 0.12}s`,
                  boxShadow: `0 0 12px ${C.orange}55`,
                }}
              />
              <div style={{ fontSize: 9, color: C.inkMuted, fontWeight: 600 }}>{["W1", "W2", "W3", "W4", "W5", "W6"][i]}</div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </SequenceFrame>
  );
}

function KpiCard({ label, value, delta, tone = "ok", active, delay = 0 }) {
  const deltaColor = tone === "warn" ? "#C77800" : "#1F7A3F";
  return (
    <div
      style={{
        background: C.paper,
        border: `1px solid ${C.rule}`,
        borderRadius: 10,
        padding: "14px 16px",
        opacity: 0,
        animation: active ? `countUp 0.8s ease-out ${delay}s both` : "none",
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: "0.2em", color: C.inkMuted, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: C.ink }}>{value}</div>
      <div style={{ fontSize: 10.5, color: deltaColor, fontWeight: 700 }}>{delta}</div>
    </div>
  );
}

// ===========================================================================
// SEQUENCE 5 — The Ecosystem (network visualization)
// ===========================================================================
function SeqEcosystem({ active }) {
  // 8 nodes in a circle around a central node.
  const nodes = [
    "Students", "Teachers", "Parents", "Administration",
    "Trust", "Transport", "Finance", "Communication",
  ];
  const R = 220; // ring radius (CSS px units in our viewBox)
  return (
    <div className={`launch-scene ${active ? "active" : "inactive"}`}>
      <div style={{ textAlign: "center", marginBottom: 18, opacity: 0, animation: active ? "riseUp 1.2s ease-out 0.2s both" : "none" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.4em", color: C.orange, textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>
          Sequence 05
        </div>
        <div style={{ fontSize: "clamp(30px, 4.5vw, 60px)", fontWeight: 300, letterSpacing: "-0.025em", color: C.ink }}>
          One <span style={{ color: C.orange, fontStyle: "italic", fontWeight: 400 }}>Unified</span> Educational Ecosystem
        </div>
      </div>

      <div style={{ position: "relative", width: "min(640px, 80vmin)", height: "min(640px, 80vmin)", opacity: 0, animation: active ? "fadeIn 1.4s ease-out 0.8s both" : "none" }}>
        <svg viewBox="-320 -320 640 640" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {/* Connecting lines from centre to each node, drawn with stroke-dasharray */}
          {nodes.map((_, i) => {
            const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(a) * R;
            const y = Math.sin(a) * R;
            return (
              <line
                key={`l${i}`}
                x1="0" y1="0" x2={x} y2={y}
                stroke={i % 2 === 0 ? C.blue : C.orange}
                strokeOpacity="0.6"
                strokeWidth="1.4"
                strokeDasharray="3 5"
                style={{ animation: `lineDraw 1.6s ease-out ${1 + i * 0.15}s both`, strokeDashoffset: 1000 }}
              />
            );
          })}
          {/* Travelling pulses along each line */}
          {nodes.map((_, i) => {
            const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(a) * R;
            const y = Math.sin(a) * R;
            return (
              <circle
                key={`p${i}`}
                r="3.5" fill={C.orange}
                style={{
                  filter: `drop-shadow(0 0 6px ${C.orange})`,
                  animation: `pulseDot 2s ease-in-out ${2 + i * 0.2}s infinite`,
                }}
              >
                <animate attributeName="cx" from="0" to={x} dur="2.5s" begin={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
                <animate attributeName="cy" from="0" to={y} dur="2.5s" begin={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            );
          })}
        </svg>

        {/* Central node — white disc with gold rim and the actual school
            logo at its heart. The disc is white (not navy) so the logo
            reads correctly regardless of its own colours, and the gold
            rim plus the box-shadow halo keep it feeling like the
            ecosystem's beating centre. */}
        <div
          style={{
            position: "absolute", left: "50%", top: "50%",
            width: 150, height: 150,
            marginLeft: -75, marginTop: -75,
            borderRadius: "50%",
            background: C.white,
            border: `2px solid ${C.gold}`,
            display: "grid", placeItems: "center",
            boxShadow: `0 0 60px ${C.blue}55, 0 0 120px ${C.orange}33, 0 6px 20px -6px ${C.navy}44`,
            animation: "pulse 3s ease-in-out infinite",
            padding: 16,
          }}
        >
          <img
            src="/logo.png"
            alt="Sanfort International School"
            style={{
              width: "100%", height: "100%",
              objectFit: "contain",
              filter: `drop-shadow(0 2px 6px ${C.navy}22)`,
            }}
          />
        </div>

        {/* Outer nodes — white pill cards with brand-coloured borders */}
        {nodes.map((n, i) => {
          const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(a) * R;
          const y = Math.sin(a) * R;
          const accentColor = i % 2 === 0 ? C.blue : C.orange;
          return (
            <div
              key={n}
              style={{
                position: "absolute", left: "50%", top: "50%",
                transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`,
                padding: "10px 18px",
                background: C.white,
                border: `1.5px solid ${accentColor}`,
                borderRadius: 999,
                fontSize: 12.5, fontWeight: 600,
                color: C.ink,
                whiteSpace: "nowrap",
                opacity: 0,
                animation: `riseUp 0.6s ease-out ${2 + i * 0.15}s both`,
                boxShadow: `0 4px 14px -4px ${accentColor}55, 0 0 0 1px ${C.white}`,
              }}
            >
              {n}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================================================
// SEQUENCE 6 — Automation Showcase
// ===========================================================================
function SeqAutomation({ active }) {
  const flows = [
    { from: "Fee paid", to: "Receipt sent", icon: "💰" },
    { from: "Attendance marked", to: "Parent notified", icon: "✓" },
    { from: "Low inventory", to: "Admin alerted", icon: "📦" },
    { from: "Leave requested", to: "Approval routed", icon: "📅" },
    { from: "Transport update", to: "Parent SMS sent", icon: "🚌" },
  ];
  return (
    <SequenceFrame
      active={active}
      num={6}
      headline={<>Automation That <span style={{ color: C.gold, fontStyle: "italic" }}>Works Silently.</span></>}
      body="Hundreds of small actions every day — receipts, reminders, approvals, alerts — handled by the system before anyone has to ask. Staff finally focus on people, not paperwork."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
        {flows.map((f, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center", gap: 18,
              padding: "14px 20px",
              background: C.white,
              border: `1px solid ${C.rule}`,
              borderRadius: 12,
              opacity: 0,
              animation: active ? `riseUp 0.6s ease-out ${0.6 + i * 0.25}s both` : "none",
              boxShadow: `0 8px 20px -10px ${C.navy}1a`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: C.ink }}>
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: C.paper,
                border: `1px solid ${C.rule}`,
                display: "grid", placeItems: "center", fontSize: 16,
              }}>{f.icon}</span>
              <span style={{ fontWeight: 500 }}>{f.from}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[0, 0.2, 0.4].map((d, k) => (
                <span
                  key={k}
                  style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: C.orange,
                    animation: active ? `pulseDot 1.2s ease-in-out ${1.2 + i * 0.25 + d}s infinite` : "none",
                  }}
                />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: C.orange, fontWeight: 700, justifySelf: "end" }}>
              {f.to}
              <span style={{ width: 32, height: 32, borderRadius: 8, background: C.orangeSoft, border: `1px solid ${C.orange}66`, display: "grid", placeItems: "center", fontSize: 14, color: C.orange, fontWeight: 700 }}>✓</span>
            </div>
          </div>
        ))}
      </div>
    </SequenceFrame>
  );
}

// ===========================================================================
// SCENE 10 — Testimonials
// ===========================================================================
function SceneTestimonials({ active }) {
  const cards = [
    { role: "Parent", name: "Mrs. Lakshmi R.", initials: "LR", quote: "We finally feel connected to our daughter's day." },
    { role: "Teacher", name: "Mr. Anand K.", initials: "AK", quote: "Communication became effortless — I teach more, chase less." },
    { role: "Student", name: "Aisha · Class 8-B", initials: "AI", quote: "Everything we need is in one place. School feels modern." },
    { role: "Leadership", name: "Dr. R. Iyer · Principal", initials: "RI", quote: "This transformed our institution. We see the school clearly now." },
  ];
  return (
    <div className={`launch-scene ${active ? "active" : "inactive"}`}>
      <div style={{ textAlign: "center", marginBottom: 36, opacity: 0, animation: active ? "riseUp 1.2s ease-out 0.2s both" : "none" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.4em", color: C.orange, textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>
          The Human Side
        </div>
        <div style={{ fontSize: "clamp(30px, 4.5vw, 56px)", fontWeight: 300, letterSpacing: "-0.025em", color: C.ink }}>
          Voices Of <span style={{ color: C.orange, fontStyle: "italic", fontWeight: 400 }}>Transformation</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18, width: "min(1100px, 92vw)" }}>
        {cards.map((t, i) => (
          <GlassPanel
            key={i}
            style={{
              padding: "24px 22px",
              opacity: 0,
              animation: active ? `riseUp 0.8s ease-out ${0.8 + i * 0.2}s both, drift 6s ease-in-out ${i * 0.5}s infinite` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.orange}, ${C.gold})`,
                  color: C.white, fontWeight: 700, fontSize: 16,
                  display: "grid", placeItems: "center",
                  boxShadow: `0 4px 14px -2px ${C.orange}55`,
                }}
              >
                {t.initials}
              </div>
              <div>
                <div style={{ fontSize: 9.5, letterSpacing: "0.25em", color: C.orange, textTransform: "uppercase", fontWeight: 700 }}>{t.role}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, color: C.ink }}>{t.name}</div>
              </div>
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.55, color: C.inkSoft, fontStyle: "italic" }}>
              "{t.quote}"
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

// ===========================================================================
// SCENE 11 — Promise Wall (interactive)
// ===========================================================================
function ScenePromiseWall({ active, promises, onAdd, onContinue }) {
  const [draft, setDraft] = useState("");

  function submit(e) {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    onAdd(t.slice(0, 140));
    setDraft("");
  }

  return (
    <div className={`launch-scene ${active ? "active" : "inactive"}`}>
      <div style={{ textAlign: "center", marginBottom: 24, opacity: 0, animation: active ? "riseUp 1.2s ease-out 0.2s both" : "none", zIndex: 5 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.4em", color: C.orange, textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>
          A Promise To The Future
        </div>
        <div style={{ fontSize: "clamp(28px, 4.2vw, 48px)", fontWeight: 300, letterSpacing: "-0.025em", maxWidth: 760, padding: "0 16px", color: C.ink }}>
          What future do you want for <span style={{ color: C.orange, fontStyle: "italic", fontWeight: 400 }}>our students?</span>
        </div>
      </div>

      {/* Rising promise balloons — white pills with brand-coloured borders */}
      <div aria-hidden={!active} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 2 }}>
        {promises.map((p, i) => {
          const accentColor = i % 2 === 0 ? C.orange : C.blue;
          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: `${10 + ((i * 37) % 80)}%`,
                padding: "10px 18px",
                background: C.white,
                border: `1.5px solid ${accentColor}`,
                borderRadius: 999,
                fontSize: 13, color: C.ink,
                maxWidth: 280,
                textAlign: "center",
                animation: `float ${10 + (i % 5) * 2}s linear forwards`,
                boxShadow: `0 6px 20px -6px ${accentColor}55, 0 0 0 1px ${C.white}`,
                fontWeight: 500,
              }}
            >
              "{p.text}"
            </div>
          );
        })}
      </div>

      {/* Input + actions */}
      <form
        onSubmit={submit}
        style={{
          position: "relative", zIndex: 10,
          width: "min(640px, 92vw)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          opacity: 0, animation: active ? "fadeIn 1.2s ease-out 1s both" : "none",
        }}
      >
        <div style={{ display: "flex", width: "100%", gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={140}
            placeholder="A safer world. Confident children. Joyful learning…"
            style={{
              flex: 1,
              padding: "14px 18px",
              background: C.white,
              border: `1px solid ${C.rule}`,
              borderRadius: 999,
              color: C.ink, fontSize: 14,
              outline: "none",
              boxShadow: `0 4px 12px -4px ${C.navy}1a`,
            }}
            autoFocus={active}
          />
          <button
            type="submit"
            style={{
              padding: "0 22px",
              background: `linear-gradient(135deg, ${C.orange}, ${C.gold})`,
              color: C.white, fontWeight: 700, fontSize: 13,
              border: "none", borderRadius: 999, cursor: "pointer",
              letterSpacing: "0.1em", textTransform: "uppercase",
              boxShadow: `0 10px 24px -6px ${C.orange}55`,
            }}
          >
            Add
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: C.inkMuted }}>
          {promises.length === 0 ? "Be the first to share a wish for the next generation" : `${promises.length} promise${promises.length === 1 ? "" : "s"} shared`}
        </div>
        <button
          type="button"
          onClick={onContinue}
          style={{
            marginTop: 12,
            padding: "10px 24px",
            background: C.white,
            color: C.inkSoft,
            border: `1px solid ${C.rule}`,
            borderRadius: 999,
            cursor: "pointer",
            fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase",
            fontWeight: 700,
            boxShadow: `0 4px 12px -4px ${C.navy}1a`,
          }}
        >
          Continue →
        </button>
      </form>
    </div>
  );
}

// ===========================================================================
// SCENE 12 — Finale
// ===========================================================================
function SceneFinale({ active }) {
  return (
    <div className={`launch-scene ${active ? "active" : "inactive"}`}>
      {/* Glowing emblem at the heart */}
      <div
        style={{
          position: "relative", marginBottom: 36,
          opacity: 0, animation: active ? "fadeIn 1.8s ease-out 0.4s both, glowPulse 4s ease-in-out infinite" : "none",
        }}
      >
        <EmblemOutline size={220} glow />
      </div>

      <div style={{ textAlign: "center", maxWidth: 860, padding: "0 24px", opacity: 0, animation: active ? "riseUp 1.6s ease-out 1.2s both" : "none", zIndex: 5 }}>
        <div
          style={{
            fontSize: "clamp(36px, 6vw, 80px)",
            fontWeight: 300,
            letterSpacing: "-0.03em",
            lineHeight: 1.02,
            marginBottom: 16,
            color: C.ink,
          }}
        >
          The Next Generation Of <span style={{ color: C.orange, fontStyle: "italic", fontWeight: 400 }}>Education</span> Starts Here.
        </div>
        <div
          style={{
            fontSize: "clamp(12px, 1.1vw, 14px)",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: C.inkMuted,
            fontWeight: 600,
          }}
        >
          Sanfort International School · Powered By <span style={{ color: C.orange, fontWeight: 700 }}>Sirah Digital</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 48, display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center",
          opacity: 0, animation: active ? "fadeIn 1.4s ease-out 2.4s both" : "none", zIndex: 5,
        }}
      >
        <FinaleButton href="/" primary>Explore Platform</FinaleButton>
        <FinaleButton href="/launch">Experience The Ecosystem</FinaleButton>
        <FinaleButton href="/">Begin Transformation</FinaleButton>
      </div>
    </div>
  );
}

function FinaleButton({ href, primary, children }) {
  return (
    <a
      href={href}
      style={{
        padding: "14px 28px",
        fontSize: 12.5,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        fontWeight: 700,
        textDecoration: "none",
        borderRadius: 999,
        background: primary
          ? `linear-gradient(135deg, ${C.orange}, ${C.gold})`
          : C.white,
        color: primary ? C.white : C.ink,
        border: primary ? "none" : `1px solid ${C.rule}`,
        boxShadow: primary
          ? `0 12px 30px -6px ${C.orange}55`
          : `0 4px 12px -4px ${C.navy}22`,
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        display: "inline-flex", alignItems: "center", gap: 8,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {children}
    </a>
  );
}
