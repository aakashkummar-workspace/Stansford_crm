"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip } from "../ui";

// Build the last 8 week-start dates relative to today. Computed lazily on
// the client (see useEffect in the component) so server- and client-rendered
// markup match — otherwise we'd hit a hydration mismatch when the server
// clock crosses a day boundary vs the user's clock.
function buildWeeks() {
  const out = [];
  const today = new Date();
  const day = today.getDay() || 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day - 1));
  for (let i = 0; i < 8; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() - i * 7);
    const iso = d.toISOString().slice(0, 10);
    const short = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    out.push({ iso, label: `Week of ${short}`, short });
  }
  return out;
}

// Stable placeholders rendered on first paint so SSR matches CSR.
const PLACEHOLDER_WEEKS = Array.from({ length: 8 }, (_, i) => ({
  iso: `placeholder-${i}`,
  label: i === 0 ? "Current week" : `Week -${i}`,
  short: i === 0 ? "current" : `-${i}w`,
}));

const EMPTY_LOG = {
  classwork: "",
  homework: "",
  topics: "",
  handwritingNote: "",
  handwritingGrade: "",
  behaviour: "",
  extra: "",
};

export default function ScreenAcademic({ E, refresh }) {
  const classes = E.CLASSES;
  const [cls, setCls] = useState(5);
  const [sec, setSec] = useState("A");
  const [selectedStudent, setSelectedStudent] = useState(0);
  // WEEKS + TODAY_ISO depend on the client clock; populate after mount.
  const [WEEKS, setWeeks] = useState(PLACEHOLDER_WEEKS);
  const [TODAY_ISO, setTodayIso] = useState("");
  const [weekIso, setWeekIso] = useState(PLACEHOLDER_WEEKS[0].iso);
  useEffect(() => {
    const fresh = buildWeeks();
    setWeeks(fresh);
    setTodayIso(new Date().toISOString().slice(0, 10));
    setWeekIso((prev) => (prev.startsWith("placeholder-") ? fresh[0].iso : prev));
  }, []);
  const [weekOpen, setWeekOpen] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const flash = (msg, tone = "ok") => {
    setToast({ msg, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const week = WEEKS.find((w) => w.iso === weekIso) || WEEKS[0];

  // Roster is built from real students in the DB filtered by class and section.
  const roster = useMemo(() => {
    const want = `${cls}-${sec}`;
    return (E.ADDED_STUDENTS || [])
      .filter((s) => s.cls === want)
      .map((s, i) => ({
        id: s.id,
        name: s.name,
        roll: i + 1,
        attendance: s.attendance ?? 0,
        homework: 0,
        classwork: 0,
        handwriting: "—",
        behavior: "—",
      }));
  }, [E.ADDED_STUDENTS, cls, sec]);

  // Reset selection if the previously-selected index is out of range
  useEffect(() => {
    if (selectedStudent >= roster.length) setSelectedStudent(0);
  }, [roster.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const student = roster[selectedStudent] || null;

  const heatmap = student
    ? Array.from({ length: 28 }, (_, i) => {
        const seed = student.id.charCodeAt(student.id.length - 1) * (i + 1);
        const v = ((seed * 9301 + 49297) % 233280) / 233280;
        if (i % 7 === 6) return { v: -1 };
        if (v < 0.08) return { v: 0 };
        return { v: Math.min(4, Math.floor(v * 5)) };
      })
    : [];

  // Saved daily log for this student today, if any.
  const savedLog = student
    ? (E.DAILY_LOGS || []).find((l) => l.studentId === student.id && l.date === TODAY_ISO)
    : null;
  const logToShow = savedLog || { ...EMPTY_LOG, postedBy: "", postedAt: null };
  const isUserSaved = Boolean(savedLog);

  // ---------- Handlers ----------
  const submitLog = async (form) => {
    if (!student) {
      flash("No student selected", "bad");
      return;
    }
    const r = await fetch("/api/academic/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        studentId: student.id,
        studentName: student.name,
        cls: `${cls}-${sec}`,
        date: TODAY_ISO,
        postedBy: "Teacher",
      }),
    });
    const json = await r.json();
    if (json.ok) {
      flash(`Daily log posted for ${student.name}`);
      await refresh?.();
      setShowLog(false);
    } else {
      flash(json.error || "Could not save log", "bad");
    }
  };

  const downloadMonthlyReport = () => {
    const monthName = "April 2026";
    const header = "Class,Roll,Student ID,Name,Attendance %,Homework %,Classwork %,Handwriting,Behaviour,Has Daily Log";
    const lines = [header];
    roster.forEach((s) => {
      const has = (E.DAILY_LOGS || []).some((l) => l.studentId === s.id);
      lines.push(
        `${cls}-${sec},${s.roll},${s.id},"${s.name}",${s.attendance},${s.homework},${s.classwork},${s.handwriting},${s.behavior},${has ? "Yes" : "No"}`
      );
    });
    // Class-level summary at the bottom
    lines.push("");
    lines.push(`Summary,Class ${cls}-${sec},${monthName}`);
    lines.push(`Avg attendance,${Math.round(roster.reduce((a, r) => a + r.attendance, 0) / roster.length)}%`);
    lines.push(`Avg homework,${Math.round(roster.reduce((a, r) => a + r.homework, 0) / roster.length)}%`);
    lines.push(`Avg classwork,${Math.round(roster.reduce((a, r) => a + r.classwork, 0) / roster.length)}%`);
    lines.push(`Logs posted,${(E.DAILY_LOGS || []).filter((l) => l.cls === `${cls}-${sec}`).length}`);

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `academic-class-${cls}-${sec}-${monthName.replace(" ", "-").toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(`Exported monthly report · class ${cls}-${sec}`);
  };

  return (
    <div className="page">
      <Toast toast={toast} />

      <div className="page-head">
        <div>
          <div className="page-eyebrow">People · Academic tracker</div>
          <div className="page-title">Academic <span className="amber">tracker</span></div>
          <div className="page-sub">Class → Student → Daily log. Teachers post daily; monthly summary auto-generates to parents.</div>
        </div>
        <div className="page-actions">
          <div style={{ position: "relative" }}>
            <button className="btn" onClick={() => setWeekOpen((v) => !v)}>
              <Icon name="calendar" size={13} />Week of {week.short}
              <Icon name="chevronDown" size={11} />
            </button>
            {weekOpen && (
              <WeekMenu
                weeks={WEEKS}
                value={weekIso}
                onPick={(iso) => {
                  setWeekIso(iso);
                  setWeekOpen(false);
                  flash(`Showing ${WEEKS.find((w) => w.iso === iso).label}`);
                }}
                onClose={() => setWeekOpen(false)}
              />
            )}
          </div>
          <button className="btn" onClick={downloadMonthlyReport}>
            <Icon name="download" size={13} />Monthly report
          </button>
          <button className="btn accent" onClick={() => setShowLog(true)}>
            <Icon name="plus" size={13} />Log today
          </button>
        </div>
      </div>

      <div className="grid g-12">
        <div className="col-12" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4 }}>Class</span>
          {classes.map((c) => (
            <button
              key={c.n}
              onClick={() => setCls(c.n)}
              className="btn sm"
              style={{
                background: cls === c.n ? "var(--ink)" : "var(--card)",
                color: cls === c.n ? "var(--bg)" : "var(--ink-2)",
                borderColor: cls === c.n ? "var(--ink)" : "var(--rule)",
              }}
            >
              Class {c.n}
            </button>
          ))}
          <span style={{ width: 1, height: 16, background: "var(--rule)", margin: "0 6px" }} />
          {["A", "B"].map((s) => (
            <button
              key={s}
              onClick={() => setSec(s)}
              className="btn sm"
              style={{
                background: sec === s ? "var(--accent-soft)" : "var(--card)",
                color: sec === s ? "var(--accent-2)" : "var(--ink-2)",
                borderColor: sec === s ? "var(--accent)" : "var(--rule)",
              }}
            >
              Section {s}
            </button>
          ))}
        </div>

        <div className="card col-4">
          <div className="card-head">
            <div>
              <div className="card-title">Class {cls}-{sec} · {roster.length} students</div>
              <div className="card-sub">{week.label}</div>
            </div>
          </div>
          <div style={{ maxHeight: 620, overflowY: "auto" }}>
            {roster.length === 0 && (
              <div className="empty">No students in Class {cls}-{sec} yet. Add some on the Students screen.</div>
            )}
            {roster.map((s, i) => {
              const act = i === selectedStudent;
              const hasLog = (E.DAILY_LOGS || []).some((l) => l.studentId === s.id && l.date === TODAY_ISO);
              return (
                <div key={s.id} onClick={() => setSelectedStudent(i)} className="lrow" style={{ cursor: "pointer", background: act ? "var(--accent-soft)" : undefined }}>
                  <div style={{ width: 28, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{String(s.roll).padStart(2, "0")}</div>
                  <AvatarChip initials={s.name.split(" ").map((n) => n[0]).join("")} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: act ? 500 : 400, display: "flex", alignItems: "center", gap: 6 }}>
                      {s.name}
                      {hasLog && <span className="chip ok" style={{ height: 16, fontSize: 9.5, padding: "0 6px" }}><span className="dot" />logged</span>}
                    </div>
                    <div className="s">{s.id}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 12, color: s.attendance < 85 ? "var(--bad)" : "var(--ink-2)" }}>{s.attendance}%</div>
                    <div style={{ fontSize: 10, color: "var(--ink-4)" }}>attendance</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!student && (
          <div className="col-8">
            <div className="card">
              <div className="empty" style={{ padding: 60 }}>
                Pick a class with students to see daily logs and attendance here.
              </div>
            </div>
          </div>
        )}

        {student && (
        <div className="col-8" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "var(--accent-ink)", display: "grid", placeItems: "center", fontWeight: 600, fontSize: 18 }}>
                {student.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>{student.name}</div>
                <div style={{ color: "var(--ink-3)", fontSize: 12.5, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span>{student.id}</span><span className="meta-dot">·</span>
                  <span>Class {cls}-{sec} · Roll {student.roll}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn sm" onClick={() => flash(`TC requested for ${student.name}`)}>
                  <Icon name="book" size={12} />TC
                </button>
                <button className="btn sm accent" onClick={() => setShowLog(true)}>
                  <Icon name="pencil" size={12} />{isUserSaved ? "Edit log" : "Today's log"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid g-4">
            <KPI label="Attendance" value={student.attendance ? `${student.attendance}%` : "—"} sub="this term" puck="mint" puckIcon="check" />
            <KPI label="Homework" value={student.homework ? `${student.homework}%` : "—"} sub="completion" puck="peach" puckIcon="book" />
            <KPI label="Classwork" value={student.classwork ? `${student.classwork}%` : "—"} sub="recent" puck="cream" puckIcon="pencil" />
            <KPI label="Handwriting" value={student.handwriting} sub="avg grade" puck="sky" puckIcon="pencil" />
          </div>

          <div className="grid g-12">
            <div className="card col-7">
              <div className="card-head">
                <div>
                  <div className="card-title">Today · daily log</div>
                  <div className="card-sub">
                    {isUserSaved
                      ? `${TODAY_ISO} · posted by ${logToShow.postedBy} ${new Date(logToShow.postedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                      : "No entry for today yet — click ‘Today's log’ to post one"}
                  </div>
                </div>
                <div className="card-actions">
                  {isUserSaved
                    ? <span className="chip ok"><span className="dot" />Submitted</span>
                    : <span className="chip"><span className="dot" />Empty</span>}
                </div>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {!isUserSaved && (
                  <div className="empty" style={{ padding: 24 }}>Nothing posted for {student.name} today.</div>
                )}
                {isUserSaved && [
                  { l: "Classwork", v: logToShow.classwork, c: logToShow.classwork ? <span className="chip ok"><span className="dot" />Logged</span> : null },
                  { l: "Homework", v: logToShow.homework, c: logToShow.homework ? <span className="chip ok"><span className="dot" />Logged</span> : null },
                  { l: "Topics covered today", v: logToShow.topics, c: null },
                  { l: "Handwriting", v: logToShow.handwritingNote, c: logToShow.handwritingGrade ? <span className="chip accent"><span className="dot" />{logToShow.handwritingGrade}</span> : null },
                  { l: "Behaviour", v: logToShow.behaviour, c: null },
                  { l: "Extra-curricular", v: logToShow.extra, c: null },
                ].map((r, i, arr) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 12, alignItems: "flex-start", paddingBottom: 10, borderBottom: i < arr.length - 1 ? "1px solid var(--rule-2)" : "none" }}>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: 1 }}>{r.l}</div>
                    <div style={{ fontSize: 13 }}>{r.v || <span style={{ color: "var(--ink-4)" }}>—</span>}</div>
                    <div>{r.c}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card col-5">
              <div className="card-head">
                <div><div className="card-title">28-day attendance</div><div className="card-sub">Recent attendance pattern</div></div>
              </div>
              <div className="card-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <div key={i} style={{ fontSize: 10, color: "var(--ink-4)", textAlign: "center" }}>{d}</div>
                  ))}
                  {heatmap.map((c, i) => {
                    const color =
                      c.v === -1 ? "var(--rule-2)" :
                      c.v === 0 ? "var(--bad)" :
                      `color-mix(in oklch, var(--accent) ${40 + c.v * 15}%, var(--rule-2))`;
                    return <div key={i} className="hm-cell" style={{ background: color, opacity: c.v === -1 ? 0.5 : 1 }} />;
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {showLog && (
        <LogModal
          student={student}
          cls={`${cls}-${sec}`}
          existing={savedLog}
          onClose={() => setShowLog(false)}
          onSubmit={submitLog}
        />
      )}
    </div>
  );
}

// ---------- helpers ----------
function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.tone === "bad" ? "var(--bad)" : "var(--ok)";
  return (
    <div style={{
      position: "fixed", top: 76, left: "50%", transform: "translateX(-50%)",
      zIndex: 300, background: bg, color: "#fff", padding: "10px 18px",
      borderRadius: 999, fontSize: 12.5, fontWeight: 500, boxShadow: "var(--shadow-lg)",
    }}>{toast.msg}</div>
  );
}

function WeekMenu({ weeks, value, onPick, onClose }) {
  useEffect(() => {
    const onDoc = (e) => { if (!e.target.closest(".week-menu") && !e.target.closest(".btn")) onClose(); };
    setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => document.removeEventListener("click", onDoc);
  }, [onClose]);
  return (
    <div className="week-menu" style={{
      position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 60,
      background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 10,
      boxShadow: "var(--shadow-lg)", padding: 6, minWidth: 200,
    }}>
      <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 10px 4px" }}>
        Pick a week
      </div>
      {weeks.map((w, i) => (
        <button key={w.iso} onClick={() => onPick(w.iso)} className="btn ghost"
          style={{
            width: "100%", justifyContent: "flex-start", height: 30, padding: "0 10px",
            fontSize: 12.5, background: value === w.iso ? "var(--accent-soft)" : "transparent",
            color: value === w.iso ? "var(--accent-2)" : "var(--ink)",
            fontWeight: value === w.iso ? 500 : 400,
          }}>
          {w.label}
          {i === 0 && <span className="chip ok" style={{ marginLeft: "auto", height: 16, fontSize: 9.5, padding: "0 6px" }}>current</span>}
        </button>
      ))}
    </div>
  );
}

function LogModal({ student, cls, existing, onClose, onSubmit }) {
  const [form, setForm] = useState({
    classwork: existing?.classwork || "",
    homework: existing?.homework || "",
    topics: existing?.topics || "",
    handwritingNote: existing?.handwritingNote || "",
    handwritingGrade: existing?.handwritingGrade || "A",
    behaviour: existing?.behaviour || "",
    extra: existing?.extra || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await onSubmit(form);
    setBusy(false);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
      display: "grid", placeItems: "center", zIndex: 250, padding: 16, overflowY: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 560, maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}>
        <div className="card-head">
          <div>
            <div className="card-title">{existing ? "Edit today's log" : "Log today"}</div>
            <div className="card-sub">{student?.name || "—"} · {student?.id || ""} · Class {cls} · {TODAY_ISO}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Classwork">
            <input className="input" value={form.classwork} onChange={(e) => set("classwork", e.target.value)} placeholder="e.g. Fractions · Ex 3.2 pp. 54–56" />
          </Field>
          <Field label="Homework">
            <input className="input" value={form.homework} onChange={(e) => set("homework", e.target.value)} placeholder="What's due tomorrow" />
          </Field>
          <Field label="Topics covered today">
            <input className="input" value={form.topics} onChange={(e) => set("topics", e.target.value)} placeholder="Brief subject-wise summary" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
            <Field label="Handwriting note">
              <input className="input" value={form.handwritingNote} onChange={(e) => set("handwritingNote", e.target.value)} />
            </Field>
            <Field label="Grade">
              <select className="select" value={form.handwritingGrade} onChange={(e) => set("handwritingGrade", e.target.value)}>
                {["A+", "A", "A-", "B+", "B", "B-", "C", "D"].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Behaviour">
            <input className="input" value={form.behaviour} onChange={(e) => set("behaviour", e.target.value)} placeholder="One sentence on how the day went" />
          </Field>
          <Field label="Extra-curricular">
            <input className="input" value={form.extra} onChange={(e) => set("extra", e.target.value)} placeholder="Clubs, sports, art, etc." />
          </Field>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn accent" disabled={busy}>
              <Icon name="check" size={13} />{busy ? "Posting…" : existing ? "Save changes" : "Post log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}
