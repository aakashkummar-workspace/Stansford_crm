"use client";

import { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  MessageSquare,
  Bus,
  IndianRupee,
  BookOpen,
  ClipboardList,
  Bell,
  Search,
  Settings
} from "lucide-react";

type Nav = { icon: any; label: string; active?: boolean };

const NAV: Nav[] = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Users, label: "Students" },
  { icon: GraduationCap, label: "Staff" },
  { icon: CalendarCheck, label: "Attendance" },
  { icon: MessageSquare, label: "Communication" },
  { icon: Bus, label: "Transport" },
  { icon: IndianRupee, label: "Fees" },
  { icon: BookOpen, label: "Academic" },
  { icon: ClipboardList, label: "Reports" }
];

type Props = {
  active: string;
  eyebrow: string;
  title: ReactNode;
  sub?: string;
  children: ReactNode;
  /** Optional right-side chips/actions in the top bar */
  rightSlot?: ReactNode;
};

export default function AppShell({
  active,
  eyebrow,
  title,
  sub,
  children,
  rightSlot
}: Props) {
  return (
    <div className="w-full h-full flex" style={{ background: "var(--rp-bg-2)" }}>
      {/* Sidebar */}
      <aside
        className="shrink-0 h-full flex flex-col"
        style={{
          width: 200,
          background: "var(--rp-bg)",
          borderRight: "1px solid var(--rp-rule)"
        }}
      >
        <div className="px-4 py-4 flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-md grid place-items-center overflow-hidden"
            style={{
              background: "#ffffff",
              border: "1px solid var(--rp-rule)"
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Sanvi Educational and Charitable Trust"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <div>
            <div
              className="rp-serif text-[14px] leading-none"
              style={{ color: "var(--rp-ink)" }}
            >
              Sanvi
            </div>
            <div
              className="text-[9px] tracking-[0.18em] uppercase mt-0.5"
              style={{ color: "var(--rp-ink-3)" }}
            >
              Vidyalaya360
            </div>
          </div>
        </div>

        <nav className="px-2 mt-1 flex-1 overflow-hidden">
          {NAV.map((n) => {
            const Icon = n.icon;
            const isActive = n.label === active;
            return (
              <div
                key={n.label}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md mb-0.5 text-[12px]"
                style={
                  isActive
                    ? {
                        background: "var(--rp-accent-soft)",
                        color: "var(--rp-accent-2)",
                        fontWeight: 600
                      }
                    : { color: "var(--rp-ink-2)" }
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{n.label}</span>
              </div>
            );
          })}
        </nav>

        <div
          className="px-4 py-3 text-[10px] flex items-center gap-2"
          style={{ borderTop: "1px solid var(--rp-rule)", color: "var(--rp-ink-3)" }}
        >
          <div
            className="w-6 h-6 rounded-full grid place-items-center text-[9px]"
            style={{ background: "var(--rp-brand-blue-soft)", color: "var(--rp-brand-blue)" }}
          >
            SC
          </div>
          <div>
            <div style={{ color: "var(--rp-ink)", fontWeight: 500, fontSize: 11 }}>
              Sanvi Admin
            </div>
            <div>Principal · Campus</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 h-full flex flex-col">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-5 py-2.5"
          style={{ borderBottom: "1px solid var(--rp-rule)", background: "var(--rp-bg)" }}
        >
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px]"
            style={{
              background: "var(--rp-bg-2)",
              color: "var(--rp-ink-3)",
              width: 260
            }}
          >
            <Search className="w-3 h-3" />
            <span>Search students, staff, classes…</span>
          </div>
          <div className="flex items-center gap-2.5">
            {rightSlot}
            <div
              className="w-7 h-7 rounded-md grid place-items-center"
              style={{ background: "var(--rp-bg-2)" }}
            >
              <Bell className="w-3.5 h-3.5" style={{ color: "var(--rp-ink-2)" }} />
            </div>
            <div
              className="w-7 h-7 rounded-md grid place-items-center"
              style={{ background: "var(--rp-bg-2)" }}
            >
              <Settings className="w-3.5 h-3.5" style={{ color: "var(--rp-ink-2)" }} />
            </div>
          </div>
        </div>

        {/* Page */}
        <div className="flex-1 overflow-hidden p-5">
          <div className="mb-4">
            <div
              className="text-[10px] tracking-[0.14em] uppercase"
              style={{ color: "var(--rp-ink-3)" }}
            >
              {eyebrow}
            </div>
            <div
              className="rp-serif"
              style={{
                fontSize: 26,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                marginTop: 4,
                color: "var(--rp-ink)"
              }}
            >
              {title}
            </div>
            {sub && (
              <div className="mt-1 text-[12px]" style={{ color: "var(--rp-ink-3)" }}>
                {sub}
              </div>
            )}
          </div>
          <div className="h-[calc(100%-80px)] overflow-hidden">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Pastel "puck" icon used in KPI tiles — mirrors the real product's design */
export function Puck({
  tone,
  children
}: {
  tone: "mint" | "peach" | "cream" | "sky";
  children: ReactNode;
}) {
  const bg = `var(--rp-${tone})`;
  const ink = `var(--rp-${tone}-ink)`;
  return (
    <div
      className="w-8 h-8 rounded-lg grid place-items-center"
      style={{ background: bg, color: ink }}
    >
      {children}
    </div>
  );
}

/** Status chip — matches the real product chip style */
export function Chip({
  tone = "ink",
  children
}: {
  tone?: "ink" | "ok" | "warn" | "bad" | "accent" | "blue";
  children: ReactNode;
}) {
  const map: Record<string, { bg: string; ink: string }> = {
    ink: { bg: "var(--rp-bg-2)", ink: "var(--rp-ink-2)" },
    ok: { bg: "var(--rp-ok-soft)", ink: "var(--rp-ok)" },
    warn: { bg: "var(--rp-warn-soft)", ink: "var(--rp-warn)" },
    bad: { bg: "var(--rp-bad-soft)", ink: "var(--rp-bad)" },
    accent: { bg: "var(--rp-accent-soft)", ink: "var(--rp-accent-2)" },
    blue: { bg: "var(--rp-brand-blue-soft)", ink: "var(--rp-brand-blue)" }
  };
  const s = map[tone];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px]"
      style={{ background: s.bg, color: s.ink, fontWeight: 500 }}
    >
      {children}
    </span>
  );
}
