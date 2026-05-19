"use client";

import { motion } from "framer-motion";
import Scene from "@/cinematic/components/fx/Scene";
import AuroraBackground from "@/cinematic/components/fx/AuroraBackground";
import StarField from "@/cinematic/components/fx/StarField";
import SceneFrame from "./SceneFrame";
import { GraduationCap, Users, Heart, Briefcase, Building2 } from "lucide-react";

const nodes = [
  { id: "student", label: "Students", icon: GraduationCap, angle: -90 },
  { id: "teacher", label: "Teachers", icon: Users, angle: -18 },
  { id: "parent", label: "Parents", icon: Heart, angle: 54 },
  { id: "admin", label: "Administration", icon: Briefcase, angle: 126 },
  { id: "trust", label: "Trust", icon: Building2, angle: 198 }
];

// Pentagon radius — compact, so the whole graphic reads at a glance.
const R = 170;
// SVG viewport padding so the node circles aren't clipped at the edges.
const VBPAD = 90;
const VB = R * 2 + VBPAD * 2;

export default function EcosystemViz() {
  return (
    <Scene>
      <AuroraBackground intensity={0.6} />
      <StarField density={0.0001} speed={0.025} />

      <SceneFrame
        chapter="Chapter 02"
        number="05 / 05"
        headline="One Unified Educational Ecosystem."
        subline="Students · Teachers · Parents · Administration · Trust"
      >
        <div className="absolute inset-0 grid place-items-center pt-16 pb-44">
          <div className="relative" style={{ width: VB, height: VB }}>
            {/* Connector lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`-${R + VBPAD} -${R + VBPAD} ${VB} ${VB}`}
            >
              <defs>
                <linearGradient id="ln" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#3a5bff" />
                  <stop offset="1" stopColor="#e6bf6a" />
                </linearGradient>
              </defs>
              {nodes.map((a, ai) =>
                nodes.map((b, bi) => {
                  if (ai >= bi) return null;
                  const ax = Math.cos((a.angle * Math.PI) / 180) * R;
                  const ay = Math.sin((a.angle * Math.PI) / 180) * R;
                  const bx = Math.cos((b.angle * Math.PI) / 180) * R;
                  const by = Math.sin((b.angle * Math.PI) / 180) * R;
                  return (
                    <motion.line
                      key={`${a.id}-${b.id}`}
                      x1={ax}
                      y1={ay}
                      x2={bx}
                      y2={by}
                      stroke="url(#ln)"
                      strokeOpacity="0.55"
                      strokeWidth="1.1"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.7 }}
                      transition={{ duration: 1.0, delay: 0.35 + (ai + bi) * 0.04 }}
                    />
                  );
                })
              )}

              {/* Inner radiant ring */}
              <motion.circle
                cx="0"
                cy="0"
                r="46"
                stroke="#e6bf6a"
                strokeOpacity="0.35"
                fill="none"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              />
              <motion.circle
                cx="0"
                cy="0"
                r="78"
                stroke="#7a93ff"
                strokeOpacity="0.2"
                strokeDasharray="3 4"
                fill="none"
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{
                  rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                  scale: { delay: 0.3, duration: 0.8 }
                }}
              />

              {/* Floating data packets along edges */}
              {nodes.map((a, ai) =>
                nodes.map((b, bi) => {
                  if (ai >= bi) return null;
                  const ax = Math.cos((a.angle * Math.PI) / 180) * R;
                  const ay = Math.sin((a.angle * Math.PI) / 180) * R;
                  const bx = Math.cos((b.angle * Math.PI) / 180) * R;
                  const by = Math.sin((b.angle * Math.PI) / 180) * R;
                  return (
                    <motion.circle
                      key={`p-${a.id}-${b.id}`}
                      r="2.5"
                      fill="#fff"
                      style={{ filter: "drop-shadow(0 0 5px #fff)" }}
                      initial={{ cx: ax, cy: ay, opacity: 0 }}
                      animate={{ cx: bx, cy: by, opacity: [0, 1, 0] }}
                      transition={{
                        duration: 2.4,
                        repeat: Infinity,
                        delay: 1.0 + (ai + bi) * 0.25,
                        ease: "easeInOut"
                      }}
                    />
                  );
                })
              )}
            </svg>

            {/* Center hub — stays static-positioned. Motion only animates scale/opacity. */}
            <div
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)"
              }}
            >
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.8 }}
                className="relative w-24 h-24 rounded-full grid place-items-center glass-strong glow-ring overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(230,191,106,0.4), transparent 70%)"
                  }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                {/* Real logo on a small white medallion */}
                <div
                  className="relative w-12 h-12 rounded-full overflow-hidden grid place-items-center"
                  style={{
                    background: "#ffffff",
                    boxShadow: "0 0 0 1px rgba(230,191,106,0.7), 0 0 14px rgba(230,191,106,0.45)"
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo.png"
                    alt="Sanvi"
                    style={{ width: "85%", height: "85%", objectFit: "contain" }}
                  />
                </div>
                <div className="absolute -bottom-1 text-[8px] tracking-cinema uppercase text-gold-400/85 whitespace-nowrap">
                  CRM Core
                </div>
              </motion.div>
            </div>

            {/*
              Nodes — positioning lives on an outer static div, animation on the
              inner motion.div. Animating `scale` on a div whose `style.transform`
              is also being set inline causes framer-motion to overwrite the
              positioning transform — which is why every node previously stacked
              at the center. Splitting them keeps both well-behaved.
            */}
            {nodes.map((n, i) => {
              const x = Math.cos((n.angle * Math.PI) / 180) * R;
              const y = Math.sin((n.angle * Math.PI) / 180) * R;
              const Icon = n.icon;
              return (
                <div
                  key={n.id}
                  className="absolute"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: "translate(-50%, -50%)"
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 0.7 + i * 0.1,
                      duration: 0.6,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative">
                      <motion.div
                        className="absolute inset-0 rounded-full blur-xl"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(58,91,255,0.5), transparent 70%)"
                        }}
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                      />
                      <div className="relative w-14 h-14 rounded-full glass-strong grid place-items-center">
                        <Icon className="w-5 h-5 text-gold-400" />
                      </div>
                    </div>
                    <div className="mt-1.5 text-center text-[10px] tracking-cinema uppercase text-white/85 whitespace-nowrap">
                      {n.label}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      </SceneFrame>
    </Scene>
  );
}
