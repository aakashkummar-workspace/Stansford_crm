"use client";

import { motion } from "framer-motion";
import { BookOpen, Megaphone, FileText, Users, GraduationCap, IndianRupee, MessageSquare, ShieldCheck, ScanFace } from "lucide-react";

/**
 * Per-scene cinematic side-visuals. These live on the OPPOSITE half of the
 * split layout from the device-frame screenshot — they "say emotionally"
 * what the screen "says factually".
 *
 * All four are sized to fill a ~440x440 square area, with their own internal
 * timing so they breathe independently of the device screen's content reveal.
 */

// ---------- Smart Attendance — holographic face scan ----------

export function FaceScanViz() {
  return (
    <div className="relative w-[420px] h-[420px] max-w-[42vw] max-h-[58vh]">
      {/* Outer orbiting ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: "1px solid rgba(122,147,255,0.30)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-6 rounded-full"
        style={{ border: "1px dashed rgba(230,191,106,0.35)" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      />

      {/* Concentric scan pulses */}
      {[0, 0.6, 1.2].map((d, i) => (
        <motion.div
          key={i}
          className="absolute inset-12 rounded-full"
          style={{ border: "1.5px solid rgba(230,191,106,0.7)" }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 1.4], opacity: [0.9, 0] }}
          transition={{ duration: 2.4, delay: d, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Center face silhouette in a glowing frame */}
      <motion.div
        className="absolute inset-0 grid place-items-center"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
      >
        <div
          className="relative w-44 h-44 rounded-full overflow-hidden grid place-items-center"
          style={{
            background:
              "radial-gradient(circle at 50% 40%, #1f3f8b 0%, #0d1f5a 60%, #060d33 100%)",
            boxShadow:
              "0 0 0 1px rgba(230,191,106,0.6), 0 0 60px rgba(58,91,255,0.5)"
          }}
        >
          <svg viewBox="0 0 200 200" className="w-32 h-32">
            <ellipse cx="100" cy="92" rx="40" ry="50" fill="#1f3f8b" opacity="0.5" />
            <ellipse cx="100" cy="92" rx="36" ry="46" stroke="#aec3ff" strokeOpacity="0.6" fill="none" />
            <circle cx="86" cy="88" r="2.5" fill="#e6bf6a" />
            <circle cx="114" cy="88" r="2.5" fill="#e6bf6a" />
            <path d="M 86 116 Q 100 124 114 116" stroke="#aec3ff" strokeOpacity="0.7" fill="none" />
          </svg>
          {/* Horizontal scan line */}
          <motion.div
            className="absolute left-3 right-3 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, #e6bf6a, transparent)",
              boxShadow: "0 0 16px rgba(230,191,106,1)"
            }}
            initial={{ top: "10%" }}
            animate={{ top: ["10%", "85%", "10%"] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Corner brackets */}
          {[
            "top-2 left-2 border-t-2 border-l-2",
            "top-2 right-2 border-t-2 border-r-2",
            "bottom-2 left-2 border-b-2 border-l-2",
            "bottom-2 right-2 border-b-2 border-r-2"
          ].map((cls, i) => (
            <div
              key={i}
              className={`absolute w-3 h-3 ${cls}`}
              style={{ borderColor: "rgba(230,191,106,0.9)" }}
            />
          ))}
        </div>
      </motion.div>

      {/* Identity match readout below */}
      <motion.div
        className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.8 }}
      >
        <div className="flex items-center gap-2 text-[10px] tracking-cinema uppercase text-gold-400/90">
          <ScanFace className="w-3 h-3" />
          Identity Match · 99.4%
        </div>
        <div className="text-[9px] tracking-cinema uppercase text-royal-100/55">
          Parent · notified · in-app
        </div>
      </motion.div>
    </div>
  );
}

// ---------- Parent Communication — broadcast pulse ----------

export function BroadcastViz() {
  const channels = [
    { icon: BookOpen, label: "Homework", angle: -90, delay: 0.5 },
    { icon: Megaphone, label: "Announce", angle: 30, delay: 0.9 },
    { icon: FileText, label: "Circular", angle: 150, delay: 1.3 }
  ];
  const R = 145;
  return (
    <div className="relative w-[420px] h-[420px] max-w-[42vw] max-h-[58vh]">
      {/* Outward pulse rings — broadcasts radiating from the center */}
      {[0, 0.8, 1.6].map((d, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            border: "1.5px solid rgba(230,191,106,0.7)",
            transform: "translate(-50%, -50%)"
          }}
          initial={{ width: 60, height: 60, opacity: 0.9 }}
          animate={{ width: 380, height: 380, opacity: 0 }}
          transition={{ duration: 2.4, delay: d, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Slow orbit ring */}
      <motion.div
        className="absolute inset-12 rounded-full"
        style={{ border: "1px dashed rgba(122,147,255,0.3)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
      />

      {/* Center node */}
      <motion.div
        className="absolute left-1/2 top-1/2 grid place-items-center"
        style={{ transform: "translate(-50%, -50%)" }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="relative w-20 h-20 rounded-full grid place-items-center"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #c4d1ff, #3a5bff 50%, #0d1f7a)",
            boxShadow:
              "0 0 0 1px rgba(230,191,106,0.6), 0 0 50px rgba(58,91,255,0.6)"
          }}
        >
          <Megaphone className="w-7 h-7 text-white" />
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid rgba(230,191,106,0.85)" }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.9, 0, 0.9] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Orbiting channel icons */}
      {channels.map((c) => {
        const Icon = c.icon;
        const x = Math.cos((c.angle * Math.PI) / 180) * R;
        const y = Math.sin((c.angle * Math.PI) / 180) * R;
        return (
          <div
            key={c.label}
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
              transition={{ delay: c.delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <div
                className="w-12 h-12 rounded-full grid place-items-center"
                style={{
                  background: "linear-gradient(145deg, rgba(13,31,122,0.5), rgba(7,15,61,0.7))",
                  border: "1px solid rgba(230,191,106,0.5)",
                  boxShadow: "0 0 20px rgba(58,91,255,0.35)"
                }}
              >
                <Icon className="w-5 h-5 text-gold-400" />
              </div>
              <div className="mt-1.5 text-[9.5px] tracking-cinema uppercase text-white/80 whitespace-nowrap">
                {c.label}
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Transport — route ribbon with traveling light ----------

export function RouteViz() {
  return (
    <div className="relative w-[420px] h-[420px] max-w-[42vw] max-h-[58vh]">
      {/* Background radar grid */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(58,91,255,0.16) 0%, transparent 65%)"
        }}
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <svg viewBox="0 0 420 420" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="route-cin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3a5bff" />
            <stop offset="1" stopColor="#e6bf6a" />
          </linearGradient>
          <pattern id="gridP" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#7a93ff" strokeOpacity="0.08" />
          </pattern>
        </defs>
        <rect width="420" height="420" fill="url(#gridP)" />

        {/* Radar sweep */}
        <motion.g
          style={{ transformOrigin: "210px 210px" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <path
            d="M 210 210 L 210 30 A 180 180 0 0 1 380 165 Z"
            fill="url(#route-cin)"
            opacity="0.18"
          />
        </motion.g>

        {/* Route curve */}
        <motion.path
          id="cin-route-path"
          d="M 40 360 C 130 280, 180 320, 240 240 S 350 140, 380 60"
          stroke="url(#route-cin)"
          strokeWidth="2.5"
          fill="none"
          strokeDasharray="6 5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.6, delay: 0.3 }}
        />

        {/* Stop markers */}
        {[
          [40, 360, "Depot"],
          [240, 240, "Pickup"],
          [380, 60, "School"]
        ].map(([x, y], i) => (
          <g key={i}>
            <motion.circle
              cx={x as number}
              cy={y as number}
              r="7"
              fill={i === 1 ? "#e6bf6a" : "#3a5bff"}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + i * 0.15, duration: 0.6 }}
            />
            {i === 1 && (
              <motion.circle
                cx={x as number}
                cy={y as number}
                r="14"
                fill="none"
                stroke="#e6bf6a"
                animate={{ r: [14, 36, 14], opacity: [0.9, 0, 0.9] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
            )}
          </g>
        ))}

        {/* Moving bus light */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
          <circle r="6" fill="#fff" style={{ filter: "drop-shadow(0 0 10px #e6bf6a)" }} />
          <circle r="3" fill="#e6bf6a" />
          <animateMotion dur="9s" repeatCount="indefinite" path="M 40 360 C 130 280, 180 320, 240 240 S 350 140, 380 60" />
        </motion.g>
      </svg>

      {/* Bottom readout */}
      <motion.div
        className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.8 }}
      >
        <div className="text-[10px] tracking-cinema uppercase text-gold-400/90">
          ● Live GPS · Route 07
        </div>
        <div className="text-[9px] tracking-cinema uppercase text-royal-100/55">
          Boarded · 08:14 · Safe
        </div>
      </motion.div>
    </div>
  );
}

// ---------- Dashboard — KPI constellation ----------

export function ConstellationViz() {
  const nodes = [
    { icon: Users, label: "3.2K", sub: "Students", angle: -90, dist: 140 },
    { icon: IndianRupee, label: "84.6L", sub: "Fees", angle: -18, dist: 140 },
    { icon: MessageSquare, label: "11.4K", sub: "Messages", angle: 54, dist: 140 },
    { icon: GraduationCap, label: "96.3%", sub: "Attendance", angle: 126, dist: 140 },
    { icon: ShieldCheck, label: "100%", sub: "Healthy", angle: 198, dist: 140 }
  ];
  return (
    <div className="relative w-[440px] h-[440px] max-w-[42vw] max-h-[58vh]">
      {/* Slow orbiting rings */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ border: "1px dashed rgba(122,147,255,0.22)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-12 rounded-full"
        style={{ border: "1px solid rgba(230,191,106,0.18)" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
      />

      {/* Center pulse */}
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ transform: "translate(-50%, -50%)" }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="relative w-20 h-20 rounded-full grid place-items-center"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #ffffff, #c4d1ff 30%, #3a5bff 60%, #0d1f7a)",
            boxShadow:
              "0 0 0 1px rgba(230,191,106,0.6), 0 0 50px rgba(58,91,255,0.6)"
          }}
        >
          <div className="text-[9px] tracking-cinema uppercase text-white/90 text-center font-display">
            CRM<br />Core
          </div>
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "2px solid rgba(230,191,106,0.7)" }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* SVG connector lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="-220 -220 440 440">
        {nodes.map((n, i) => {
          const x = Math.cos((n.angle * Math.PI) / 180) * n.dist;
          const y = Math.sin((n.angle * Math.PI) / 180) * n.dist;
          return (
            <motion.line
              key={i}
              x1="0"
              y1="0"
              x2={x}
              y2={y}
              stroke="rgba(122,147,255,0.45)"
              strokeWidth="1"
              strokeDasharray="3 4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.9 }}
            />
          );
        })}
        {/* Traveling data dots along lines */}
        {nodes.map((n, i) => {
          const x = Math.cos((n.angle * Math.PI) / 180) * n.dist;
          const y = Math.sin((n.angle * Math.PI) / 180) * n.dist;
          return (
            <motion.circle
              key={`d-${i}`}
              r="2.5"
              fill="#fff"
              style={{ filter: "drop-shadow(0 0 6px #fff)" }}
              initial={{ cx: 0, cy: 0, opacity: 0 }}
              animate={{ cx: x, cy: y, opacity: [0, 1, 0] }}
              transition={{
                duration: 2.6,
                delay: 1.5 + i * 0.4,
                repeat: Infinity,
                repeatDelay: 1.4,
                ease: "easeInOut"
              }}
            />
          );
        })}
      </svg>

      {/* KPI nodes */}
      {nodes.map((n, i) => {
        const x = Math.cos((n.angle * Math.PI) / 180) * n.dist;
        const y = Math.sin((n.angle * Math.PI) / 180) * n.dist;
        const Icon = n.icon;
        return (
          <div
            key={n.sub}
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
              transition={{ delay: 0.9 + i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <div
                className="w-14 h-14 rounded-full grid place-items-center relative"
                style={{
                  background: "linear-gradient(145deg, rgba(13,31,122,0.55), rgba(7,15,61,0.8))",
                  border: "1px solid rgba(230,191,106,0.4)",
                  boxShadow: "0 0 18px rgba(58,91,255,0.35)"
                }}
              >
                <Icon className="w-5 h-5 text-gold-400" />
              </div>
              <div className="mt-1 font-display text-sm text-white/95 leading-none">
                {n.label}
              </div>
              <div className="text-[9px] tracking-cinema uppercase text-royal-100/60">
                {n.sub}
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
