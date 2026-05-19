"use client";

import { motion } from "framer-motion";
import { Users, IndianRupee, CalendarCheck, Bus, TrendingUp, AlertCircle, Bell } from "lucide-react";
import AppShell, { Chip, Puck } from "./AppShell";

const KPIS = [
  { label: "Students", value: "3,284", sub: "on roll", tone: "mint" as const, icon: Users, trend: "+ 4.2%" },
  { label: "Fees collected", value: "₹84.6L", sub: "this term", tone: "peach" as const, icon: IndianRupee, trend: "+ 18%" },
  { label: "Attendance", value: "96.3%", sub: "today · all classes", tone: "cream" as const, icon: CalendarCheck, trend: "+ 1.8%" },
  { label: "Buses", value: "12", sub: "all on route", tone: "sky" as const, icon: Bus, trend: "98.7% on time" }
];

const ALERTS = [
  { tone: "bad" as const, title: "3 pending complaints", sub: "Class IX-A · X-B · XI-C" },
  { tone: "warn" as const, title: "14 students absent today", sub: "Across Classes VII-A, IX-B, X-C" },
  { tone: "warn" as const, title: "7 overdue fees", sub: "Auto-reminders sent at 09:00 AM" }
];

const ACTIVITY = [
  { t: "Class IX-B attendance synced", at: "08:42" },
  { t: "Fee receipt issued · #STN-29411", at: "08:43" },
  { t: "Bus 12 reached Stop D", at: "08:46" },
  { t: "Circular delivered to 1,284 parents", at: "08:48" },
  { t: "Library scan · 14 returns", at: "08:51" },
  { t: "Teacher login · East campus", at: "08:54" }
];

export default function RealDashboard() {
  return (
    <AppShell
      active="Dashboard"
      eyebrow="Monday · 19 May 2026"
      title={
        <>
          <span style={{ color: "var(--rp-accent)" }}>Sanvi Campus</span> — today at a glance.
        </>
      }
      sub="Your operating snapshot — fees, attendance, transport."
      rightSlot={
        <>
          <Chip tone="ok">● All systems healthy</Chip>
          <Chip tone="blue">Spring 2026</Chip>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-3 mb-3">
        {KPIS.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.07, duration: 0.45 }}
              className="rounded-xl p-3"
              style={{
                background: "var(--rp-card)",
                border: "1px solid var(--rp-rule)"
              }}
            >
              <div className="flex items-start justify-between">
                <Puck tone={k.tone}>
                  <Icon className="w-4 h-4" />
                </Puck>
                <span className="text-[10px]" style={{ color: "var(--rp-ok)" }}>
                  {k.trend}
                </span>
              </div>
              <div
                className="rp-serif mt-2.5"
                style={{
                  fontSize: 26,
                  letterSpacing: "-0.02em",
                  color: "var(--rp-ink)"
                }}
              >
                {k.value}
              </div>
              <div
                className="text-[11px] mt-0.5"
                style={{ color: "var(--rp-ink-2)", fontWeight: 500 }}
              >
                {k.label}
              </div>
              <div className="text-[10px]" style={{ color: "var(--rp-ink-3)" }}>
                {k.sub}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3" style={{ height: "calc(100% - 110px)" }}>
        {/* Chart card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="col-span-2 rounded-xl p-3 flex flex-col"
          style={{ background: "var(--rp-card)", border: "1px solid var(--rp-rule)" }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div
                className="text-[10px] tracking-[0.12em] uppercase"
                style={{ color: "var(--rp-ink-3)" }}
              >
                Money coming in, money going out
              </div>
              <div
                className="rp-serif"
                style={{ fontSize: 16, marginTop: 2, color: "var(--rp-ink)" }}
              >
                Weekly · lakhs · April YTD
              </div>
            </div>
            <div className="flex gap-1.5">
              <Chip tone="accent">● Income</Chip>
              <Chip tone="ink">● Expense</Chip>
            </div>
          </div>
          <div className="flex-1 mt-2">
            <IncomeChart />
          </div>
          <div
            className="flex items-center gap-6 pt-2 mt-1"
            style={{ borderTop: "1px solid var(--rp-rule-2)" }}
          >
            {[
              { l: "Income YTD", v: "₹84.6L", s: "29 fee receipts", tone: "ink" },
              { l: "Expense YTD", v: "₹46.2L", s: "salaries · ops", tone: "ink" },
              { l: "Net surplus", v: "₹38.4L", s: "45% margin", tone: "ok" }
            ].map((m) => (
              <div key={m.l}>
                <div
                  className="text-[9.5px] tracking-[0.1em] uppercase"
                  style={{ color: "var(--rp-ink-3)", fontWeight: 500 }}
                >
                  {m.l}
                </div>
                <div
                  className="rp-serif"
                  style={{
                    fontSize: 20,
                    letterSpacing: "-0.02em",
                    marginTop: 2,
                    color: m.tone === "ok" ? "var(--rp-ok)" : "var(--rp-ink)"
                  }}
                >
                  {m.v}
                </div>
                <div className="text-[10px]" style={{ color: "var(--rp-ink-3)" }}>
                  {m.s}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Live alerts */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="rounded-xl p-3 flex flex-col"
          style={{ background: "var(--rp-card)", border: "1px solid var(--rp-rule)" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div>
              <div
                className="rp-serif"
                style={{ fontSize: 14, color: "var(--rp-ink)" }}
              >
                Live alerts
              </div>
              <div
                className="text-[10px]"
                style={{ color: "var(--rp-ink-3)" }}
              >
                {ALERTS.length} items need attention
              </div>
            </div>
            <Bell className="w-3.5 h-3.5" style={{ color: "var(--rp-ink-3)" }} />
          </div>
          {ALERTS.map((a, i) => {
            const dotBg = a.tone === "bad" ? "var(--rp-bad)" : "var(--rp-warn)";
            const bg = a.tone === "bad" ? "var(--rp-bad-soft)" : "var(--rp-warn-soft)";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 + i * 0.1, duration: 0.4 }}
                className="flex items-start gap-2 py-2"
                style={{
                  borderBottom:
                    i < ALERTS.length - 1 ? "1px solid var(--rp-rule-2)" : "none"
                }}
              >
                <div
                  className="w-6 h-6 rounded-md grid place-items-center shrink-0"
                  style={{ background: bg, color: dotBg }}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div
                    className="text-[11.5px]"
                    style={{ color: "var(--rp-ink)", fontWeight: 500 }}
                  >
                    {a.title}
                  </div>
                  <div
                    className="text-[10px] truncate"
                    style={{ color: "var(--rp-ink-3)" }}
                  >
                    {a.sub}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div
            className="mt-auto pt-1.5 text-[10px] flex items-center gap-1"
            style={{ color: "var(--rp-accent-2)", fontWeight: 500 }}
          >
            <TrendingUp className="w-3 h-3" />
            View all
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}

function IncomeChart() {
  const inc = [22, 28, 35, 30, 42, 48, 55, 50, 62, 70];
  const exp = [12, 16, 18, 22, 20, 25, 30, 28, 35, 32];
  const w = 540, h = 130, pad = 6;
  const max = Math.max(...inc, ...exp) * 1.2;
  const sx = (i: number) => pad + (i * (w - 2 * pad)) / (inc.length - 1);
  const sy = (v: number) => h - pad - (v / max) * (h - 2 * pad);
  const linePath = inc.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i)} ${sy(v)}`).join(" ");
  const fillPath = `${linePath} L ${sx(inc.length - 1)} ${h - pad} L ${sx(0)} ${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <defs>
        <linearGradient id="incfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8530e" stopOpacity="0.18" />
          <stop offset="1" stopColor="#e8530e" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={pad}
          x2={w - pad}
          y1={pad + p * (h - 2 * pad)}
          y2={pad + p * (h - 2 * pad)}
          stroke="#ececef"
        />
      ))}
      {/* expense bars */}
      {exp.map((v, i) => {
        const x = sx(i) - 8;
        const bh = (v / max) * (h - 2 * pad);
        return (
          <motion.rect
            key={i}
            x={x}
            y={h - pad - bh}
            width="16"
            height={bh}
            rx="2"
            fill="#9aa0a8"
            opacity="0.35"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 0.35, scaleY: 1 }}
            transition={{ delay: 0.7 + i * 0.03, duration: 0.4 }}
            style={{ transformOrigin: `center ${h - pad}px` }}
          />
        );
      })}
      <motion.path
        d={fillPath}
        fill="url(#incfill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.7 }}
      />
      <motion.path
        d={linePath}
        stroke="#e8530e"
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.8, duration: 1.0 }}
      />
      {inc.map((v, i) => (
        <motion.circle
          key={i}
          cx={sx(i)}
          cy={sy(v)}
          r="2.5"
          fill="#fff"
          stroke="#e8530e"
          strokeWidth="1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 + i * 0.04, duration: 0.25 }}
        />
      ))}
    </svg>
  );
}
