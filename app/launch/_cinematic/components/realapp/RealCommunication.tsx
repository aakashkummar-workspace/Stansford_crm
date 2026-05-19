"use client";

import { motion } from "framer-motion";
import { Megaphone, BookOpen, FileText, Send, Users, Check } from "lucide-react";
import AppShell, { Chip } from "./AppShell";

const RECENT = [
  { kind: "Homework", icon: BookOpen, sender: "English Teacher · Class X-A",
    body: "Read Chapter 4 and submit a 200-word reflection by tomorrow.",
    audience: "42 parents", time: "08:14 AM", delivered: "42/42" },
  { kind: "Announcement", icon: Megaphone, sender: "Principal's Office",
    body: "Annual Sports Day announced — March 12. Forms shared with parents.",
    audience: "1,284 parents", time: "Yesterday", delivered: "1,284/1,284" },
  { kind: "Circular", icon: FileText, sender: "Stansford Trust",
    body: "PTM scheduled for Saturday 10:00 AM. Confirm your slot in the app.",
    audience: "3,284 parents", time: "Yesterday", delivered: "3,284/3,284" }
];

export default function RealCommunication() {
  return (
    <AppShell
      active="Communication"
      eyebrow="In-app · delivered to parent app"
      title="Send a message that always reaches"
      sub="Homework · announcements · circulars — instantly, in one channel."
      rightSlot={
        <>
          <Chip tone="ok">● 100% delivery today</Chip>
          <Chip tone="blue">11,452 messages</Chip>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_280px] gap-3 h-full">
        {/* Composer + recent */}
        <div className="flex flex-col gap-3 min-w-0">
          {/* Composer */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="rounded-xl p-3"
            style={{ background: "var(--rp-card)", border: "1px solid var(--rp-rule)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="rp-serif"
                style={{ fontSize: 14, color: "var(--rp-ink)" }}
              >
                New message
              </div>
              <div className="flex gap-1.5">
                <KindPill icon={BookOpen} label="Homework" active />
                <KindPill icon={Megaphone} label="Announcement" />
                <KindPill icon={FileText} label="Circular" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Audience">
                <span style={{ color: "var(--rp-ink)", fontWeight: 500 }}>
                  Class X-A · all parents
                </span>
                <span
                  className="text-[10px] ml-2 px-1.5 py-0.5 rounded-md"
                  style={{
                    background: "var(--rp-brand-blue-soft)",
                    color: "var(--rp-brand-blue)"
                  }}
                >
                  42 recipients
                </span>
              </Field>
              <Field label="Send via">
                <span style={{ color: "var(--rp-ink)", fontWeight: 500 }}>
                  In-app · parent inbox
                </span>
              </Field>
            </div>
            <div className="mt-2">
              <div
                className="text-[10px] uppercase tracking-[0.1em] mb-1"
                style={{ color: "var(--rp-ink-3)" }}
              >
                Message
              </div>
              <div
                className="rounded-md p-2.5 text-[12px] min-h-[64px]"
                style={{
                  background: "var(--rp-bg-2)",
                  border: "1px solid var(--rp-rule)",
                  color: "var(--rp-ink)"
                }}
              >
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55, duration: 0.4 }}
                >
                  Dear parents — today's English homework:{" "}
                </motion.span>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.4 }}
                >
                  Read Chapter 4 and submit a 200-word reflection by tomorrow.
                </motion.span>
                <motion.span
                  className="inline-block w-1.5 h-3 ml-0.5 align-middle"
                  style={{ background: "var(--rp-accent)" }}
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <div
                className="flex items-center gap-1 text-[10.5px]"
                style={{ color: "var(--rp-ink-3)" }}
              >
                <Users className="w-3 h-3" />
                42 parents will be notified instantly
              </div>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, duration: 0.4 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] text-white"
                style={{ background: "var(--rp-accent)", fontWeight: 600 }}
              >
                <Send className="w-3 h-3" /> Send now
              </motion.button>
            </div>
          </motion.div>

          {/* Recent broadcasts */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="rounded-xl p-3 flex-1 overflow-hidden"
            style={{ background: "var(--rp-card)", border: "1px solid var(--rp-rule)" }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="rp-serif" style={{ fontSize: 14, color: "var(--rp-ink)" }}>
                Recent broadcasts
              </div>
              <Chip tone="ok">All delivered</Chip>
            </div>
            <div>
              {RECENT.map((r, i) => {
                const Icon = r.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + i * 0.1, duration: 0.4 }}
                    className="flex items-start gap-2.5 py-2"
                    style={{
                      borderBottom:
                        i < RECENT.length - 1 ? "1px solid var(--rp-rule-2)" : "none"
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-md grid place-items-center shrink-0"
                      style={{ background: "var(--rp-accent-soft)", color: "var(--rp-accent-2)" }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div
                          className="text-[11.5px]"
                          style={{ color: "var(--rp-ink)", fontWeight: 600 }}
                        >
                          {r.kind} · <span style={{ color: "var(--rp-ink-3)", fontWeight: 400 }}>{r.sender}</span>
                        </div>
                        <span className="text-[10px]" style={{ color: "var(--rp-ink-3)" }}>
                          {r.time}
                        </span>
                      </div>
                      <div
                        className="text-[11px] mt-0.5"
                        style={{ color: "var(--rp-ink-2)" }}
                      >
                        {r.body}
                      </div>
                      <div
                        className="text-[10px] mt-1 flex items-center gap-2"
                        style={{ color: "var(--rp-ok)" }}
                      >
                        <Check className="w-3 h-3" />
                        Delivered {r.delivered}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right: parent phone */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.55 }}
          className="self-center justify-self-center"
        >
          <PhoneMock />
        </motion.div>
      </div>
    </AppShell>
  );
}

function KindPill({
  icon: Icon,
  label,
  active = false
}: {
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px]"
      style={{
        background: active ? "var(--rp-accent-soft)" : "var(--rp-bg-2)",
        color: active ? "var(--rp-accent-2)" : "var(--rp-ink-2)",
        border: active ? "1px solid var(--rp-accent)" : "1px solid var(--rp-rule)",
        fontWeight: active ? 600 : 500
      }}
    >
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-md px-2.5 py-1.5"
      style={{ background: "var(--rp-bg-2)", border: "1px solid var(--rp-rule)" }}
    >
      <div
        className="text-[9.5px] uppercase tracking-[0.1em]"
        style={{ color: "var(--rp-ink-3)" }}
      >
        {label}
      </div>
      <div className="text-[11.5px] mt-0.5 flex items-center">{children}</div>
    </div>
  );
}

function PhoneMock() {
  return (
    <div
      className="relative"
      style={{
        width: 220,
        height: 440,
        borderRadius: 32,
        background: "linear-gradient(180deg, #1a1c24 0%, #0b0d14 100%)",
        padding: 8,
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.05) inset, 0 30px 60px -15px rgba(58,91,255,0.4)"
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 80,
          height: 18,
          background: "#000",
          borderRadius: 999
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "var(--rp-bg)",
          borderRadius: 24,
          paddingTop: 28,
          padding: "28px 8px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 6
        }}
      >
        <div
          className="flex items-center gap-2 px-1 pb-1.5"
          style={{ borderBottom: "1px solid var(--rp-rule)" }}
        >
          <div
            className="w-6 h-6 rounded-md grid place-items-center overflow-hidden"
            style={{ background: "#ffffff", border: "1px solid var(--rp-rule)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Sanvi"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <div>
            <div
              className="rp-serif"
              style={{ fontSize: 11, color: "var(--rp-ink)", lineHeight: 1 }}
            >
              Sanvi
            </div>
            <div
              className="text-[8.5px]"
              style={{ color: "var(--rp-ok)" }}
            >
              ● Online
            </div>
          </div>
        </div>

        {RECENT.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.45, duration: 0.45 }}
              className="rounded-lg p-1.5"
              style={{
                background: "var(--rp-accent-soft)",
                border: "1px solid rgba(232,83,14,0.18)"
              }}
            >
              <div
                className="flex items-center gap-1 text-[8.5px] uppercase tracking-[0.08em]"
                style={{ color: "var(--rp-accent-2)", fontWeight: 600 }}
              >
                <Icon className="w-2.5 h-2.5" />
                {m.kind}
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: "var(--rp-ink)" }}
              >
                {m.body}
              </div>
              <div
                className="text-[8px] mt-0.5 text-right"
                style={{ color: "var(--rp-ink-3)" }}
              >
                just now ✓✓
              </div>
            </motion.div>
          );
        })}

        <div
          className="mt-auto rounded-full text-[9px] flex items-center px-3 py-1.5"
          style={{
            background: "var(--rp-bg-2)",
            border: "1px solid var(--rp-rule)",
            color: "var(--rp-ink-3)"
          }}
        >
          Reply…
        </div>
      </div>
    </div>
  );
}
