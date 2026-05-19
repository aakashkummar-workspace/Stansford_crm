"use client";

import { motion } from "framer-motion";
import Scene from "@/cinematic/components/fx/Scene";
import StarField from "@/cinematic/components/fx/StarField";
import AuroraBackground from "@/cinematic/components/fx/AuroraBackground";
import LightStreaks from "@/cinematic/components/fx/LightStreaks";

const lines = [
  { t: "Connected.", at: 0.6 },
  { t: "Transparent.", at: 2.6 },
  { t: "Future Ready.", at: 4.6 },
  { t: "Unified.", at: 6.6 }
];

// Inline SVG vignettes — schematic, never corporate-stock.
function ClassroomVignette() {
  return (
    <svg viewBox="0 0 600 360" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="cv1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0d1f7a" />
          <stop offset="1" stopColor="#000208" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#cv1)" />
      {/* Chalkboard */}
      <rect x="80" y="60" width="440" height="160" rx="6" fill="#040c33" stroke="#7a93ff" strokeOpacity="0.35" />
      <line x1="100" y1="100" x2="380" y2="100" stroke="#aec3ff" strokeOpacity="0.4" />
      <line x1="100" y1="130" x2="280" y2="130" stroke="#aec3ff" strokeOpacity="0.3" />
      <line x1="100" y1="160" x2="320" y2="160" stroke="#aec3ff" strokeOpacity="0.35" />
      {/* Students (silhouettes) */}
      {[120, 200, 280, 360, 440].map((x, i) => (
        <g key={i} opacity={0.85}>
          <circle cx={x} cy={270} r="14" fill="#1f3df0" opacity="0.55" />
          <path d={`M ${x - 22} 320 Q ${x} 290 ${x + 22} 320 Z`} fill="#1f3df0" opacity="0.5" />
        </g>
      ))}
    </svg>
  );
}

function CampusVignette() {
  return (
    <svg viewBox="0 0 600 360" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a164e" />
          <stop offset="1" stopColor="#000208" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#sky)" />
      {/* Building */}
      <rect x="120" y="120" width="360" height="200" fill="#0b1746" stroke="#7a93ff" strokeOpacity="0.4" />
      <polygon points="120,120 300,40 480,120" fill="#0d1f7a" stroke="#e6bf6a" strokeOpacity="0.5" />
      {/* Columns */}
      {[160, 220, 280, 340, 400, 460].map((x, i) => (
        <rect key={i} x={x - 6} y="160" width="12" height="160" fill="#142a8a" />
      ))}
      {/* Door */}
      <rect x="280" y="240" width="40" height="80" fill="#e6bf6a" opacity="0.7" />
      {/* Walking figures */}
      {[80, 520].map((x, i) => (
        <g key={i} opacity={0.8}>
          <circle cx={x} cy={290} r="8" fill="#aec3ff" />
          <rect x={x - 6} y={300} width="12" height="20" fill="#aec3ff" />
        </g>
      ))}
    </svg>
  );
}

function ParentsVignette() {
  return (
    <svg viewBox="0 0 600 360" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="pg" cx="0.5" cy="0.5" r="0.8">
          <stop offset="0" stopColor="#0d1f7a" />
          <stop offset="1" stopColor="#000208" />
        </radialGradient>
      </defs>
      <rect width="600" height="360" fill="url(#pg)" />
      {/* Phone */}
      <rect x="240" y="60" width="120" height="240" rx="20" fill="#04081a" stroke="#7a93ff" strokeOpacity="0.5" />
      <rect x="252" y="80" width="96" height="190" rx="6" fill="#0d1f7a" opacity="0.5" />
      {/* Notification bubbles */}
      {[100, 140, 180].map((y, i) => (
        <rect key={i} x="260" y={y} width="80" height="20" rx="4" fill="#3a5bff" opacity={0.4 + i * 0.15} />
      ))}
      {/* Signal lines */}
      <path d="M 360 100 Q 440 100 480 60" stroke="#e6bf6a" strokeOpacity="0.5" strokeDasharray="3 3" fill="none" />
      <path d="M 360 160 Q 440 160 480 180" stroke="#e6bf6a" strokeOpacity="0.5" strokeDasharray="3 3" fill="none" />
      <path d="M 240 100 Q 160 100 120 60" stroke="#e6bf6a" strokeOpacity="0.5" strokeDasharray="3 3" fill="none" />
    </svg>
  );
}

function TrustVignette() {
  return (
    <svg viewBox="0 0 600 360" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#04081a" />
          <stop offset="1" stopColor="#0d1f7a" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#tg)" />
      {/* Dashboard grid */}
      <rect x="60" y="60" width="240" height="120" rx="6" fill="#070f3d" stroke="#7a93ff" strokeOpacity="0.4" />
      <rect x="320" y="60" width="220" height="120" rx="6" fill="#070f3d" stroke="#7a93ff" strokeOpacity="0.4" />
      <rect x="60" y="200" width="480" height="100" rx="6" fill="#070f3d" stroke="#7a93ff" strokeOpacity="0.4" />
      {/* Bars */}
      {[100, 130, 80, 150, 110].map((h, i) => (
        <rect key={i} x={80 + i * 40} y={170 - h} width="24" height={h} fill="#3a5bff" opacity="0.7" />
      ))}
      {/* Line chart */}
      <polyline
        fill="none"
        stroke="#e6bf6a"
        strokeWidth="1.5"
        points="340,150 380,120 420,140 460,90 500,100 540,70"
      />
    </svg>
  );
}

const panels = [ClassroomVignette, CampusVignette, ParentsVignette, TrustVignette];

export default function IntroSequence() {
  return (
    <Scene>
      <AuroraBackground intensity={0.7} />
      <StarField density={0.00009} speed={0.03} />
      <LightStreaks count={4} />

      {/* Top frame */}
      <div className="absolute top-8 left-8 text-[10px] tracking-cinema text-royal-100/40">
        STANSFORD · DIGITAL INAUGURATION
      </div>
      <div className="absolute top-8 right-8 text-[10px] tracking-cinema text-royal-100/40">
        CHAPTER 01 / ORIGIN
      </div>

      {/* Vignette panels in cinematic grid */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-4 p-12 md:p-20">
        {panels.map((P, i) => (
          <motion.div
            key={i}
            className="relative overflow-hidden rounded-lg glass"
            initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
            animate={{ opacity: [0, 1, 1, 0.35], scale: [0.96, 1, 1, 1.04], filter: ["blur(8px)", "blur(0px)", "blur(0px)", "blur(2px)"] }}
            transition={{
              duration: 8.5,
              times: [0, 0.18, 0.78, 1],
              delay: i * 0.4,
              ease: "easeInOut"
            }}
          >
            <P />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-transparent to-ink-900/40" />
          </motion.div>
        ))}
      </div>

      {/* Voiceover words */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {lines.map((l, i) => (
          <motion.h2
            key={l.t}
            className="absolute font-display text-6xl md:text-8xl text-cinematic"
            initial={{ opacity: 0, y: 30, letterSpacing: "0.4em" }}
            animate={{ opacity: [0, 1, 1, 0], y: [30, 0, 0, -20], letterSpacing: ["0.4em", "0.15em", "0.15em", "0.05em"] }}
            transition={{
              duration: 2.0,
              times: [0, 0.25, 0.75, 1],
              delay: l.at,
              ease: [0.16, 1, 0.3, 1]
            }}
          >
            {l.t}
          </motion.h2>
        ))}
      </div>

      {/* Bottom subtitle */}
      <motion.div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0] }}
        transition={{ duration: 9, times: [0, 0.5, 1] }}
      >
        <p className="text-xs tracking-cinema uppercase text-royal-100/50">
          A new era for our learning community
        </p>
      </motion.div>
    </Scene>
  );
}
