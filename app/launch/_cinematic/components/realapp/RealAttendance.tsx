"use client";

import { motion } from "framer-motion";
import { Check, X, ScanFace, ChevronDown, BellRing, CalendarCheck } from "lucide-react";
import AppShell, { Chip, Puck } from "./AppShell";

const ROSTER = [
  { roll: 1,  name: "Student · X-A · 01",  parent: "Parent · 01",  state: "present", time: "08:42" },
  { roll: 2,  name: "Student · X-A · 02",  parent: "Parent · 02",  state: "present", time: "08:38" },
  { roll: 3,  name: "Student · X-A · 03",  parent: "Parent · 03",  state: "present", time: "08:41" },
  { roll: 4,  name: "Student · X-A · 04",  parent: "Parent · 04",  state: "late",    time: "09:05" },
  { roll: 5,  name: "Student · X-A · 05",  parent: "Parent · 05",  state: "present", time: "08:36" },
  { roll: 6,  name: "Student · X-A · 06",  parent: "Parent · 06",  state: "present", time: "08:40" },
  { roll: 7,  name: "Student · X-A · 07",  parent: "Parent · 07",  state: "absent",  time: "—" },
  { roll: 8,  name: "Student · X-A · 08",  parent: "Parent · 08",  state: "present", time: "08:43" },
  { roll: 9,  name: "Student · X-A · 09",  parent: "Parent · 09",  state: "present", time: "08:39" },
  { roll: 10, name: "Student · X-A · 10",  parent: "Parent · 10",  state: "present", time: "08:42" }
];

export default function RealAttendance() {
  return (
    <AppShell
      active="Attendance"
      eyebrow="Class X-A · Monday, 19 May 2026"
      title="Mark today's attendance"
      sub="Face-scan auto-syncs · parents notified the instant a child arrives."
      rightSlot={
        <>
          <Chip tone="ok">● Live · auto-sync</Chip>
          <Chip tone="blue">10 students</Chip>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-3 h-full">
        {/* Left: roster (col-span-3) */}
        <div className="col-span-3 flex flex-col gap-3 h-full">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: "Present", v: "8", tone: "mint" as const, ink: "var(--rp-ok)" },
              { l: "Late", v: "1", tone: "cream" as const, ink: "var(--rp-warn)" },
              { l: "Absent", v: "1", tone: "peach" as const, ink: "var(--rp-bad)" },
              { l: "Synced", v: "100%", tone: "sky" as const, ink: "var(--rp-brand-blue)" }
            ].map((k, i) => (
              <motion.div
                key={k.l}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.06, duration: 0.4 }}
                className="rounded-lg px-3 py-2 flex items-center gap-2.5"
                style={{ background: "var(--rp-card)", border: "1px solid var(--rp-rule)" }}
              >
                <Puck tone={k.tone}>
                  <CalendarCheck className="w-4 h-4" />
                </Puck>
                <div>
                  <div
                    className="rp-serif"
                    style={{ fontSize: 18, lineHeight: 1, color: k.ink }}
                  >
                    {k.v}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--rp-ink-3)" }}>
                    {k.l}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Class picker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex items-center gap-2"
          >
            <Selector label="Class" value="X" />
            <Selector label="Section" value="A" />
            <div className="ml-auto flex items-center gap-2">
              <button
                className="text-[10.5px] px-2.5 py-1 rounded-md"
                style={{
                  background: "var(--rp-bg-2)",
                  color: "var(--rp-ink-2)",
                  border: "1px solid var(--rp-rule)"
                }}
              >
                Mark all present
              </button>
              <button
                className="text-[10.5px] px-2.5 py-1 rounded-md text-white"
                style={{ background: "var(--rp-accent)" }}
              >
                Save attendance
              </button>
            </div>
          </motion.div>

          {/* Roster */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.45 }}
            className="rounded-xl flex-1 overflow-hidden"
            style={{ background: "var(--rp-card)", border: "1px solid var(--rp-rule)" }}
          >
            <div
              className="grid grid-cols-[40px_1fr_140px_70px_160px] gap-3 px-3 py-2 text-[9.5px] uppercase tracking-[0.1em]"
              style={{
                background: "var(--rp-bg-2)",
                color: "var(--rp-ink-3)",
                borderBottom: "1px solid var(--rp-rule)"
              }}
            >
              <span>Roll</span>
              <span>Student</span>
              <span>Parent</span>
              <span>Time</span>
              <span>Status</span>
            </div>
            <div>
              {ROSTER.map((s, i) => {
                const isAbsent = s.state === "absent";
                const isLate = s.state === "late";
                return (
                  <motion.div
                    key={s.roll}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.04, duration: 0.3 }}
                    className="grid grid-cols-[40px_1fr_140px_70px_160px] gap-3 px-3 py-1.5 items-center text-[11px]"
                    style={{
                      borderBottom:
                        i < ROSTER.length - 1 ? "1px solid var(--rp-rule-2)" : "none",
                      color: "var(--rp-ink-2)"
                    }}
                  >
                    <span style={{ color: "var(--rp-ink-3)" }}>{s.roll}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full grid place-items-center text-[9px]"
                        style={{
                          background: "var(--rp-brand-blue-soft)",
                          color: "var(--rp-brand-blue)",
                          fontWeight: 600
                        }}
                      >
                        {String(s.roll).padStart(2, "0")}
                      </div>
                      <span style={{ color: "var(--rp-ink)" }}>{s.name}</span>
                    </div>
                    <span style={{ color: "var(--rp-ink-3)" }}>{s.parent}</span>
                    <span className="tabular-nums" style={{ color: "var(--rp-ink-3)" }}>
                      {s.time}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StateBtn label="Present" active={s.state === "present"} tone="ok" icon={Check} />
                      <StateBtn label="Late" active={isLate} tone="warn" icon={ChevronDown} />
                      <StateBtn label="Absent" active={isAbsent} tone="bad" icon={X} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right: face scan + parent notify */}
        <div className="flex flex-col gap-3 min-w-0 h-full">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="rounded-xl p-3"
            style={{ background: "var(--rp-card)", border: "1px solid var(--rp-rule)" }}
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] mb-2"
              style={{ color: "var(--rp-ink-3)" }}>
              <ScanFace className="w-3 h-3" />
              Face scan · gate camera
            </div>
            <div
              className="relative rounded-lg overflow-hidden aspect-[4/3]"
              style={{
                background:
                  "radial-gradient(circle at 50% 45%, #1f3f8b 0%, #0d1f5a 60%, #060d33 100%)"
              }}
            >
              <FaceSilhouette />
              <motion.div
                className="absolute left-0 right-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #e6bf6a, transparent)",
                  boxShadow: "0 0 12px rgba(230,191,106,0.7)"
                }}
                initial={{ top: 10 }}
                animate={{ top: ["10%", "85%", "10%"] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute inset-x-4 inset-y-3 rounded-md"
                style={{ border: "1px dashed rgba(230,191,106,0.9)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1] }}
                transition={{ duration: 1.2, delay: 0.6 }}
              />
              <div
                className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px]"
                style={{ color: "#e6bf6a" }}
              >
                <span>● MATCH · 99.4%</span>
                <span>STUDENT ID · STN-0421</span>
              </div>
            </div>
            <div className="mt-2.5">
              <div
                className="rp-serif"
                style={{ fontSize: 15, color: "var(--rp-ink)" }}
              >
                Student · X-A · Roll 01
              </div>
              <div className="text-[10.5px]" style={{ color: "var(--rp-ink-3)" }}>
                Class X-A · Detected at 08:42 AM
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5, duration: 0.4 }}
                className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px]"
                style={{
                  background: "var(--rp-ok-soft)",
                  color: "var(--rp-ok)",
                  fontWeight: 600
                }}
              >
                <Check className="w-3 h-3" /> Marked Present · synced
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.5 }}
            className="rounded-xl p-3 flex-1"
            style={{ background: "var(--rp-card)", border: "1px solid var(--rp-rule)" }}
          >
            <div
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] mb-2"
              style={{ color: "var(--rp-accent-2)", fontWeight: 600 }}
            >
              <BellRing className="w-3 h-3" /> Parent notified
            </div>
            <div
              className="rounded-md p-2.5"
              style={{
                background: "var(--rp-accent-soft)",
                border: "1px solid rgba(232,83,14,0.18)"
              }}
            >
              <div className="text-[10px]" style={{ color: "var(--rp-ink-3)" }}>
                To: Parent · Roll 01 · 08:42 AM
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.7, duration: 0.45 }}
                className="text-[11.5px] mt-1"
                style={{ color: "var(--rp-ink)" }}
              >
                ✓ Your child has arrived safely at school. Attendance marked at 08:42 AM.
              </motion.div>
              <div className="text-[9.5px] mt-1.5" style={{ color: "var(--rp-ink-3)" }}>
                Delivered in-app · read receipts on
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}

function Selector({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px]"
      style={{
        background: "var(--rp-card)",
        border: "1px solid var(--rp-rule)",
        color: "var(--rp-ink-2)"
      }}
    >
      <span style={{ color: "var(--rp-ink-3)" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
      <ChevronDown className="w-3 h-3" style={{ color: "var(--rp-ink-3)" }} />
    </div>
  );
}

function StateBtn({
  label,
  active,
  tone,
  icon: Icon
}: {
  label: string;
  active: boolean;
  tone: "ok" | "warn" | "bad";
  icon: any;
}) {
  const bg = active ? `var(--rp-${tone}-soft)` : "transparent";
  const ink = active ? `var(--rp-${tone})` : "var(--rp-ink-4)";
  const border = active ? `1px solid var(--rp-${tone})` : "1px solid var(--rp-rule)";
  return (
    <div
      className="px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 text-[10px]"
      style={{ background: bg, color: ink, border, fontWeight: active ? 600 : 400 }}
    >
      <Icon className="w-2.5 h-2.5" />
      {label}
    </div>
  );
}

function FaceSilhouette() {
  return (
    <svg viewBox="0 0 200 150" className="w-full h-full">
      <ellipse cx="100" cy="72" rx="38" ry="46" fill="#1f3f8b" opacity="0.55" />
      <ellipse cx="100" cy="72" rx="34" ry="42" stroke="#aec3ff" strokeOpacity="0.55" fill="none" />
      <circle cx="86" cy="68" r="2.5" fill="#e6bf6a" />
      <circle cx="114" cy="68" r="2.5" fill="#e6bf6a" />
      <path d="M 88 92 Q 100 100 112 92" stroke="#aec3ff" strokeOpacity="0.7" fill="none" />
      <path d="M 60 140 Q 100 122 140 140 L 140 150 L 60 150 Z" fill="#1f3f8b" opacity="0.5" />
    </svg>
  );
}
