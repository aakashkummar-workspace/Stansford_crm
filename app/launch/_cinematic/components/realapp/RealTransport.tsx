"use client";

import { motion } from "framer-motion";
import { Bus, Navigation, MapPin, Bell, Phone, ChevronDown } from "lucide-react";
import AppShell, { Chip } from "./AppShell";

const ROUTES = [
  { code: "R-07", name: "North Campus · Whitefield Loop", driver: "Driver · Verified", status: "On route", students: 38, active: true },
  { code: "R-12", name: "South Campus · Indiranagar",     driver: "Driver · Verified", status: "On route", students: 41 },
  { code: "R-03", name: "East · ITPL Corridor",           driver: "Driver · Verified", status: "At depot", students: 32 }
];

const STOPS = [
  { name: "Depot", time: "07:32", status: "done" as const, students: 0 },
  { name: "Stop A · Brookefield", time: "07:58", status: "done" as const, students: 12 },
  { name: "Stop B · ITPL Gate", time: "08:11", status: "current" as const, students: 14 },
  { name: "Stop C · Marathahalli", time: "08:24", status: "upcoming" as const, students: 9 },
  { name: "School Gate", time: "08:40", status: "upcoming" as const, students: 0 }
];

export default function RealTransport() {
  return (
    <AppShell
      active="Transport"
      eyebrow="Live GPS · Monday, 19 May 2026"
      title="Every bus, every stop — accounted for."
      sub="Live route map · pickup confirmations · safety guaranteed."
      rightSlot={
        <>
          <Chip tone="ok">● 12 buses live</Chip>
          <Chip tone="blue">98.7% on-time</Chip>
        </>
      }
    >
      <div className="grid grid-cols-[260px_1fr_280px] gap-3 h-full">
        {/* Route picker */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="rounded-xl p-3 overflow-hidden"
          style={{ background: "var(--rp-card)", border: "1px solid var(--rp-rule)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="rp-serif" style={{ fontSize: 14, color: "var(--rp-ink)" }}>
              Routes
            </div>
            <Chip tone="ink">3 active</Chip>
          </div>
          {ROUTES.map((r, i) => (
            <motion.div
              key={r.code}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.07, duration: 0.4 }}
              className="rounded-md p-2 mb-1.5"
              style={{
                background: r.active ? "var(--rp-accent-soft)" : "transparent",
                border: r.active ? "1px solid var(--rp-accent)" : "1px solid var(--rp-rule)"
              }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="text-[11px]"
                  style={{
                    color: r.active ? "var(--rp-accent-2)" : "var(--rp-ink)",
                    fontWeight: 600
                  }}
                >
                  {r.code}
                </div>
                <span
                  className="text-[9.5px] px-1.5 py-0.5 rounded-md"
                  style={{
                    background: "var(--rp-ok-soft)",
                    color: "var(--rp-ok)",
                    fontWeight: 500
                  }}
                >
                  ● {r.status}
                </span>
              </div>
              <div
                className="text-[10.5px] mt-0.5"
                style={{ color: r.active ? "var(--rp-accent-2)" : "var(--rp-ink-2)" }}
              >
                {r.name}
              </div>
              <div
                className="text-[9.5px] mt-0.5 flex items-center gap-2"
                style={{ color: "var(--rp-ink-3)" }}
              >
                <span>{r.driver}</span> · <span>{r.students} students</span>
              </div>
            </motion.div>
          ))}

          <div
            className="mt-2 rounded-md p-2"
            style={{ background: "var(--rp-bg-2)", border: "1px solid var(--rp-rule)" }}
          >
            <div
              className="text-[9.5px] uppercase tracking-[0.1em]"
              style={{ color: "var(--rp-ink-3)" }}
            >
              Direction
            </div>
            <div className="flex gap-1.5 mt-1">
              <div
                className="text-[10px] px-2 py-0.5 rounded-md"
                style={{
                  background: "var(--rp-brand-blue-soft)",
                  color: "var(--rp-brand-blue)",
                  fontWeight: 600
                }}
              >
                Morning
              </div>
              <div className="text-[10px] px-2 py-0.5 rounded-md" style={{ color: "var(--rp-ink-3)" }}>
                Evening
              </div>
            </div>
          </div>
        </motion.div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="rounded-xl p-2 relative overflow-hidden"
          style={{ background: "var(--rp-card)", border: "1px solid var(--rp-rule)" }}
        >
          <div className="flex items-center justify-between px-1.5 py-1">
            <div
              className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.1em]"
              style={{ color: "var(--rp-ink-3)" }}
            >
              <Navigation className="w-3 h-3" />
              R-07 · Whitefield Loop
            </div>
            <div
              className="flex items-center gap-1 text-[10px]"
              style={{ color: "var(--rp-ok)", fontWeight: 600 }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block animate-pulse"
                style={{ background: "var(--rp-ok)" }}
              />
              LIVE
            </div>
          </div>
          <div
            className="rounded-lg w-full relative"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, #e6ebf5 0%, #f5f5f7 40%, #ececef 100%)",
              height: "calc(100% - 30px)"
            }}
          >
            <MapView />
          </div>
        </motion.div>

        {/* Stops + alerts */}
        <div className="flex flex-col gap-3 min-w-0">
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.45 }}
            className="rounded-xl p-3 flex-1 overflow-hidden"
            style={{ background: "var(--rp-card)", border: "1px solid var(--rp-rule)" }}
          >
            <div className="rp-serif mb-2" style={{ fontSize: 14, color: "var(--rp-ink)" }}>
              Stops · R-07
            </div>
            <div className="relative pl-3">
              <div
                className="absolute top-1 bottom-1 w-px"
                style={{ left: 6, background: "var(--rp-rule)" }}
              />
              {STOPS.map((s, i) => {
                const dotBg =
                  s.status === "done"
                    ? "var(--rp-ok)"
                    : s.status === "current"
                    ? "var(--rp-accent)"
                    : "var(--rp-ink-4)";
                return (
                  <motion.div
                    key={s.name}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                    className="relative py-1.5"
                  >
                    <div
                      className="absolute -left-1 top-2 w-3 h-3 rounded-full"
                      style={{
                        background: dotBg,
                        boxShadow:
                          s.status === "current"
                            ? "0 0 0 4px rgba(232,83,14,0.18)"
                            : "none"
                      }}
                    />
                    <div className="flex items-center justify-between pl-3">
                      <div
                        className="text-[11px]"
                        style={{
                          color: "var(--rp-ink)",
                          fontWeight: s.status === "current" ? 600 : 500
                        }}
                      >
                        {s.name}
                      </div>
                      <div className="tabular-nums text-[10px]" style={{ color: "var(--rp-ink-3)" }}>
                        {s.time}
                      </div>
                    </div>
                    {s.students > 0 && (
                      <div
                        className="text-[10px] pl-3"
                        style={{ color: "var(--rp-ink-3)" }}
                      >
                        {s.students} students ·{" "}
                        {s.status === "done"
                          ? "boarded"
                          : s.status === "current"
                          ? "boarding now"
                          : "waiting"}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.45 }}
            className="rounded-xl p-3"
            style={{
              background: "var(--rp-accent-soft)",
              border: "1px solid rgba(232,83,14,0.2)"
            }}
          >
            <div
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] mb-1"
              style={{ color: "var(--rp-accent-2)", fontWeight: 600 }}
            >
              <Bell className="w-3 h-3" /> Parent push · just sent
            </div>
            <div className="text-[11px]" style={{ color: "var(--rp-ink)" }}>
              ✓ Student · Roll 14 boarded Bus 07 at Stop B · 08:14 AM
            </div>
            <div
              className="flex items-center justify-between mt-2 text-[10px]"
              style={{ color: "var(--rp-ink-3)" }}
            >
              <span>14 parents notified · in-app delivery confirmed</span>
              <div
                className="flex items-center gap-1"
                style={{ color: "var(--rp-brand-blue)", fontWeight: 600 }}
              >
                <Phone className="w-3 h-3" /> Driver
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}

function MapView() {
  return (
    <svg viewBox="0 0 800 460" className="w-full h-full">
      <defs>
        <pattern id="rp-grid" width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#9aa0a8" strokeOpacity="0.18" />
        </pattern>
        <linearGradient id="rp-route" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e8530e" />
          <stop offset="1" stopColor="#1f3f8b" />
        </linearGradient>
      </defs>
      <rect width="800" height="460" fill="url(#rp-grid)" />
      {/* "City" blocks */}
      {[
        [80, 70, 90, 50],
        [220, 130, 110, 60],
        [400, 60, 130, 70],
        [560, 130, 100, 60],
        [680, 70, 90, 50],
        [100, 280, 120, 70],
        [280, 330, 140, 70],
        [480, 290, 120, 60],
        [640, 350, 130, 70]
      ].map((b, i) => (
        <rect
          key={i}
          x={b[0]}
          y={b[1]}
          width={b[2]}
          height={b[3]}
          fill="#1f3f8b"
          fillOpacity="0.08"
          stroke="#1f3f8b"
          strokeOpacity="0.18"
        />
      ))}
      {/* Route */}
      <path
        id="rp-route-path"
        d="M 50 410 C 160 310, 240 360, 320 280 S 520 180, 600 220 S 760 130, 760 80"
        stroke="url(#rp-route)"
        strokeWidth="3"
        fill="none"
        strokeDasharray="6 5"
      />
      {/* Stops */}
      {[
        [50, 410, "Depot", "done"],
        [320, 280, "Stop A", "done"],
        [600, 220, "Stop B", "current"],
        [760, 80, "School", "upcoming"]
      ].map(([x, y, label, st], i) => {
        const color =
          st === "done" ? "#4a7a54" : st === "current" ? "#e8530e" : "#9aa0a8";
        return (
          <g key={i}>
            {st === "current" && (
              <motion.circle
                cx={x as number}
                cy={y as number}
                r="16"
                fill="none"
                stroke={color}
                initial={{ r: 14, opacity: 1 }}
                animate={{ r: [14, 36, 14], opacity: [0.9, 0, 0.9] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
            )}
            <circle cx={x as number} cy={y as number} r="7" fill={color} />
            <circle cx={x as number} cy={y as number} r="14" fill="none" stroke={color} strokeOpacity="0.3" />
            <text
              x={(x as number) + 14}
              y={(y as number) + 4}
              fontSize="11"
              fill="#3a3d44"
              fontFamily="Manrope, system-ui, sans-serif"
            >
              {label}
            </text>
          </g>
        );
      })}
      {/* Bus */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
        <g>
          <rect x="-15" y="-10" width="30" height="20" rx="3" fill="#e8530e" />
          <rect x="-13" y="-8" width="9" height="6" fill="#15161a" />
          <rect x="-2" y="-8" width="9" height="6" fill="#15161a" />
          <circle cx="-9" cy="10" r="2.5" fill="#15161a" />
          <circle cx="9" cy="10" r="2.5" fill="#15161a" />
        </g>
        <animateMotion dur="8s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1">
          <mpath href="#rp-route-path" />
        </animateMotion>
      </motion.g>
      <text x="50" y="448" fontSize="9.5" letterSpacing="3" fill="#6b6f78" fontFamily="Manrope">
        STANSFORD · LIVE GPS · ROUTE R-07
      </text>
    </svg>
  );
}
