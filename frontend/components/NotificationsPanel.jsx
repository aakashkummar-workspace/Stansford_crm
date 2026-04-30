"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";

// Top-bar notifications panel.
// Combines two streams:
//   1. Live alerts derived from current data (overdue fees, open complaints,
//      absentees today, low-stock items) — these are actionable.
//   2. Recent audit-log entries — the "recent activity" feed.
//
// Click an alert → jump to the relevant screen.

// Parse a donor "next touchpoint" string. Mirrors parseNextTouchpoint in
// Donors.jsx; kept local to avoid importing a screen component into the shell.
function parseDonorNext(raw) {
  const s = (raw || "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s*[·\-]\s*(.+))?$/);
  if (!m) return null;
  return { iso: `${m[1]}-${m[2]}-${m[3]}`, note: (m[4] || "").trim() };
}

function buildAlerts(E) {
  const alerts = [];
  const overdueFees = (E.PENDING_FEES || []).filter((f) => f.overdue);
  const openComplaints = (E.COMPLAINTS || []).filter((c) => c.status === "Open");
  const lowStock = (E.INVENTORY || []).filter((i) => (i.onHand ?? 0) < (i.min ?? 0));
  const todayIso = new Date().toISOString().slice(0, 10);
  const todaysLogs = (E.DAILY_LOGS || []).filter((l) => l.date === todayIso);
  const absent = todaysLogs.filter((l) => l.attendance === "absent");

  if (overdueFees.length) {
    alerts.push({
      tone: "bad", icon: "fees", screen: "fees",
      title: `${overdueFees.length} overdue fee${overdueFees.length === 1 ? "" : "s"}`,
      sub: overdueFees.slice(0, 3).map((f) => f.name).join(" · "),
      ts: "now",
    });
  }
  if (openComplaints.length) {
    alerts.push({
      tone: "bad", icon: "complaint", screen: "complaints",
      title: `${openComplaints.length} open complaint${openComplaints.length === 1 ? "" : "s"}`,
      sub: openComplaints.slice(0, 3).map((c) => c.student || c.id).join(" · "),
      ts: "now",
    });
  }
  if (absent.length) {
    alerts.push({
      tone: "warn", icon: "users", screen: "academic",
      title: `${absent.length} student${absent.length === 1 ? "" : "s"} absent today`,
      sub: absent.slice(0, 3).map((l) => l.studentName).join(" · "),
      ts: "today",
    });
  }
  if (lowStock.length) {
    alerts.push({
      tone: "warn", icon: "box", screen: "inventory",
      title: `${lowStock.length} low-stock item${lowStock.length === 1 ? "" : "s"}`,
      sub: lowStock.slice(0, 3).map((i) => i.name).join(" · "),
      ts: "now",
    });
  }

  // Donor touchpoint reminders. Fire on the scheduled day, nag for a week
  // after (overdue), and give a heads-up in the preceding 3 days so the
  // principal isn't surprised. Older / farther-out dates stay silent.
  const todayMs = new Date(`${todayIso}T00:00:00`).getTime();
  const DAY = 86_400_000;
  const reminders = [];
  for (const d of (E.DONORS || [])) {
    const parsed = parseDonorNext(d.next);
    if (!parsed) continue;
    const dueMs = new Date(`${parsed.iso}T00:00:00`).getTime();
    if (Number.isNaN(dueMs)) continue;
    const days = Math.round((dueMs - todayMs) / DAY);
    if (days > 3 || days < -7) continue;
    reminders.push({ d, parsed, days });
  }
  reminders.sort((a, b) => a.days - b.days);
  for (const { d, parsed, days } of reminders) {
    const ts = days === 0 ? "today" : days > 0 ? `in ${days}d` : `${Math.abs(days)}d ago`;
    alerts.push({
      tone: days < 0 ? "bad" : days === 0 ? "warn" : "warn",
      icon: "donors", screen: "donors",
      title: `Follow up with ${d.name}`,
      sub: parsed.note
        ? `${parsed.note} · ${new Date(`${parsed.iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
        : `Touchpoint on ${new Date(`${parsed.iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`,
      ts,
    });
  }

  return alerts;
}

export default function NotificationsPanel({ E, role, setCurrent }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const alerts = useMemo(() => buildAlerts(E), [E]);
  const audit  = (E.AUDIT || []).slice(0, 8);
  const total  = alerts.length;

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function jump(screen) {
    if (screen && setCurrent) setCurrent(screen);
    setOpen(false);
  }

  const toneBg = (t) =>
    t === "bad"  ? "var(--bad-soft)"  :
    t === "warn" ? "var(--warn-soft)" :
                   "var(--ok-soft)";
  const toneInk = (t) =>
    t === "bad"  ? "var(--bad)"  :
    t === "warn" ? "var(--warn)" :
                   "var(--ok)";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        className={`icon-btn ${total > 0 ? "has-dot" : ""}`}
        onClick={() => setOpen((s) => !s)}
        title={`Notifications${total ? ` (${total})` : ""}`}
        aria-label="Notifications"
      >
        <Icon name="bell" size={15} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute", right: 0, top: "calc(100% + 6px)",
            width: 380, maxHeight: 520, overflowY: "auto",
            background: "var(--card)", border: "1px solid var(--rule)",
            borderRadius: 12, padding: 0, zIndex: 200,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div style={{
            padding: "12px 14px", borderBottom: "1px solid var(--rule)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Notifications</div>
            {total > 0 && (
              <span style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 5,
                background: "var(--accent-soft)", color: "var(--accent)",
                fontWeight: 600,
              }}>{total} live</span>
            )}
          </div>

          {/* Live alerts */}
          {alerts.length > 0 && (
            <div style={{ padding: "8px 6px" }}>
              <div style={{
                fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase",
                letterSpacing: 0.6, fontWeight: 500, padding: "4px 10px 6px",
              }}>Needs attention</div>
              {alerts.map((a, i) => (
                <div
                  key={i}
                  onClick={() => jump(a.screen)}
                  style={{
                    display: "flex", gap: 10, padding: "9px 10px",
                    borderRadius: 8, cursor: "pointer",
                    transition: "background .12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: toneBg(a.tone), color: toneInk(a.tone),
                    display: "grid", placeItems: "center", flexShrink: 0,
                  }}>
                    <Icon name={a.icon} size={13} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.sub}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{a.ts}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recent activity (audit log) */}
          <div style={{ padding: "8px 6px", borderTop: alerts.length ? "1px solid var(--rule)" : "none" }}>
            <div style={{
              fontSize: 10, color: "var(--ink-4)", textTransform: "uppercase",
              letterSpacing: 0.6, fontWeight: 500, padding: "4px 10px 6px",
            }}>Recent activity</div>
            {audit.length === 0 ? (
              <div style={{ padding: "12px 14px", fontSize: 12, color: "var(--ink-3)" }}>
                No activity yet. Things you do (admit a student, take a fee, send a broadcast) will show up here.
              </div>
            ) : (
              audit.map((a, i) => (
                <div key={a.id || i} style={{
                  display: "flex", gap: 10, padding: "8px 10px",
                  borderRadius: 8,
                }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 7,
                    background: "var(--bg-2)", color: "var(--ink-3)",
                    display: "grid", placeItems: "center", flexShrink: 0,
                  }}>
                    <Icon name="audit" size={12} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <span style={{ fontWeight: 500, color: "var(--ink)" }}>{a.who}</span>{" — "}{a.action}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {a.entity}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--ink-4)", whiteSpace: "nowrap" }}>{a.when}</span>
                </div>
              ))
            )}
          </div>

          <div style={{
            padding: "8px 14px", borderTop: "1px solid var(--rule)",
            fontSize: 11, color: "var(--ink-3)",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>Auto-refreshes with the data</span>
            {role !== "parent" && (
              <button
                onClick={() => jump("audit")}
                style={{ background: "none", border: 0, color: "var(--accent)", cursor: "pointer", fontSize: 11, fontWeight: 500 }}
              >
                Open audit log →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
