"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip } from "../ui";

const STUDENT_NAMES = [
  ["Aanya", "Sharma"], ["Advait", "Patel"], ["Arjun", "Khan"], ["Ishaan", "Gupta"],
  ["Kiara", "Reddy"], ["Vivaan", "Iyer"], ["Saanvi", "Desai"], ["Aarav", "Nair"],
  ["Myra", "Joshi"], ["Vihaan", "Malhotra"], ["Diya", "Singh"], ["Krish", "Verma"],
  ["Anaya", "Mehta"], ["Reyansh", "Chauhan"], ["Aadhya", "Rao"], ["Shaurya", "Kapoor"],
  ["Zara", "Pillai"], ["Kabir", "Bose"],
];

// 8 most-recent week-start dates (Mondays) ending around the demo date 2026-04-22.
const WEEKS = [
  { iso: "2026-04-22", label: "Week of 22 Apr", short: "22 Apr" },
  { iso: "2026-04-15", label: "Week of 15 Apr", short: "15 Apr" },
  { iso: "2026-04-08", label: "Week of 8 Apr", short: "8 Apr" },
  { iso: "2026-04-01", label: "Week of 1 Apr", short: "1 Apr" },
  { iso: "2026-03-25", label: "Week of 25 Mar", short: "25 Mar" },
  { iso: "2026-03-18", label: "Week of 18 Mar", short: "18 Mar" },
  { iso: "2026-03-11", label: "Week of 11 Mar", short: "11 Mar" },
  { iso: "2026-03-04", label: "Week of 4 Mar", short: "4 Mar" },
];

const DEMO_TODAY = "2026-04-28";

// ---- sample log used as the "what teachers post by default" fallback ----
const SAMPLE_LOG = {
  classwork: "Fractions · Ex 3.2 pp. 54–56",
  homework: "English comprehension · 'The Banyan Tree'",
  topics: "Science: Food chains · Social: Mughal empire intro",
  handwritingNote: "Clean, letters well-formed. Watch spacing on 'g' and 'y'.",
  handwritingGrade: "A-",
  behaviour: "Engaged in group reading. Helped peer with maths.",
  extra: "Art club · practicing watercolour",
};

export default function ScreenAcademic({ E, refresh }) {
  const classes = E.CLASSES;
  const [cls, setCls] = useState(5);
  const [sec, setSec] = useState("A");
  const [selectedStudent, setSelectedStudent] = useState(0);
  const [weekIso, setWeekIso] = useState(WEEKS[0].iso);
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

  const roster = useMemo(() => {
    return STUDENT_NAMES.slice(0, 18).map((n, i) => {
      const seed = cls * 100 + i;
      const rr = (k) => ((seed * k * 9301 + 49297) % 233280) / 233280;
      return {
        id: `STN-${2000 + cls * 30 + i}`,
        name: `${n[0]} ${n[1]}`,
        roll: i + 1,
        attendance: Math.round(80 + rr(3) * 18),
        homework: Math.round(70 + rr(5) * 28),
        classwork: Math.round(70 + rr(7) * 28),
        handwriting: ["A", "A", "A-", "B+", "B", "B", "A", "B+"][(i + cls) % 8],
        behavior: ["Excellent", "Good", "Good", "Needs focus", "Good", "Excellent", "Good"][(i + cls) % 7],
      };
    });
  }, [cls, sec]);

  const student = roster[selectedStudent];

  const heatmap = Array.from({ length: 28 }, (_, i) => {
    const seed = student.id.charCodeAt(student.id.length - 1) * (i + 1);
    const v = ((seed * 9301 + 49297) % 233280) / 233280;
    if (i % 7 === 6) return { v: -1 };
    if (v < 0.08) return { v: 0 };
    return { v: Math.min(4, Math.floor(v * 5)) };
  });

  // Pull a saved log for (student, today) if it exists; otherwise show the sample.
  const savedLog = (E.DAILY_LOGS || []).find(
    (l) => l.studentId === student.id && l.date === DEMO_TODAY
  );
  const logToShow = savedLog || { ...SAMPLE_LOG, postedBy: "Ms. Deshmukh", postedAt: null };
  const isUserSaved = Boolean(savedLog);

  // ---------- Handlers ----------
  const submitLog = async (form) => {
    const r = await fetch("/api/academic/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        studentId: student.id,
        studentName: student.name,
        cls: `${cls}-${sec}`,
        date: DEMO_TODAY,
        postedBy: "Ms. Deshmukh",
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
          <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)" }}>
            Teacher-in-charge <span style={{ color: "var(--ink)", fontWeight: 500 }}>Ms. Anita Deshmukh</span>
          </div>
        </div>

        <div className="card col-4">
          <div className="card-head">
            <div>
              <div className="card-title">Class {cls}-{sec} · {roster.length} students</div>
              <div className="card-sub">{week.label} · today&apos;s attendance: 16/{roster.length}</div>
            </div>
          </div>
          <div style={{ maxHeight: 620, overflowY: "auto" }}>
            {roster.map((s, i) => {
              const act = i === selectedStudent;
              const hasLog = (E.DAILY_LOGS || []).some((l) => l.studentId === s.id && l.date === DEMO_TODAY);
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
                  <span>Class {cls}-{sec} · Roll {student.roll}</span><span className="meta-dot">·</span>
                  <span>Parent: Mr. Sharma · +91 98xxxx4251</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn sm" onClick={() => { window.open(`https://wa.me/919800004251`, "_blank"); flash("Opened WhatsApp"); }}>
                  <Icon name="whatsapp" size={12} />Parent
                </button>
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
            <KPI label="Attendance" value={`${student.attendance}%`} delta="21/23 days" deltaDir="up" sub="this term" puck="mint" puckIcon="check" />
            <KPI label="Homework" value={`${student.homework}%`} delta={student.homework > 85 ? "on track" : "lagging"} deltaDir={student.homework > 85 ? "up" : "down"} sub="completion" puck="peach" puckIcon="book" />
            <KPI label="Classwork" value={`${student.classwork}%`} delta="+4" deltaDir="up" sub="vs last month" puck="cream" puckIcon="pencil" />
            <KPI label="Handwriting" value={student.handwriting} sub="avg grade · 4 weeks" puck="sky" puckIcon="pencil" />
          </div>

          <div className="grid g-12">
            <div className="card col-7">
              <div className="card-head">
                <div>
                  <div className="card-title">Today · daily log</div>
                  <div className="card-sub">
                    {isUserSaved
                      ? `${DEMO_TODAY} · posted by ${logToShow.postedBy} ${new Date(logToShow.postedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                      : "28 April · sample log (no entry yet — click ‘Log today’)"}
                  </div>
                </div>
                <div className="card-actions">
                  {isUserSaved
                    ? <span className="chip ok"><span className="dot" />Submitted</span>
                    : <span className="chip warn"><span className="dot" />Sample</span>}
                </div>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { l: "Classwork", v: logToShow.classwork || SAMPLE_LOG.classwork, c: <span className="chip ok"><span className="dot" />Complete</span> },
                  { l: "Homework", v: logToShow.homework || SAMPLE_LOG.homework, c: <span className="chip ok"><span className="dot" />Submitted on time</span> },
                  { l: "Topics covered today", v: logToShow.topics || SAMPLE_LOG.topics, c: null },
                  { l: "Handwriting", v: logToShow.handwritingNote || SAMPLE_LOG.handwritingNote, c: <span className="chip accent"><span className="dot" />{logToShow.handwritingGrade || SAMPLE_LOG.handwritingGrade}</span> },
                  { l: "Behaviour", v: logToShow.behaviour || SAMPLE_LOG.behaviour, c: <span className="chip ok"><span className="dot" />Excellent</span> },
                  { l: "Extra-curricular", v: logToShow.extra || SAMPLE_LOG.extra, c: <span className="chip info"><span className="dot" />Active</span> },
                ].map((r, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 12, alignItems: "flex-start", paddingBottom: 10, borderBottom: i < 5 ? "1px solid var(--rule-2)" : "none" }}>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: 1 }}>{r.l}</div>
                    <div style={{ fontSize: 13 }}>{r.v}</div>
                    <div>{r.c}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card col-5">
              <div className="card-head">
                <div><div className="card-title">28-day attendance</div><div className="card-sub">Green = present · red = absent</div></div>
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

                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>This year&apos;s achievements</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { i: "sparkles", t: "Annual Day · Lead speaker", d: "Feb 2026" },
                      { i: "flag", t: "Inter-school quiz · 2nd place", d: "Jan 2026" },
                      { i: "heart", t: "100% attendance award (Term 1)", d: "Dec 2025" },
                      { i: "book", t: "Reading challenge · 24 books", d: "Nov 2025" },
                    ].map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "var(--card-2)", borderRadius: 7 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--accent-soft)", color: "var(--accent-2)", display: "grid", placeItems: "center" }}>
                          <Icon name={a.i} size={12} />
                        </div>
                        <div style={{ flex: 1, fontSize: 12.5 }}>{a.t}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{a.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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

function WeekMenu({ value, onPick, onClose }) {
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
      {WEEKS.map((w) => (
        <button key={w.iso} onClick={() => onPick(w.iso)} className="btn ghost"
          style={{
            width: "100%", justifyContent: "flex-start", height: 30, padding: "0 10px",
            fontSize: 12.5, background: value === w.iso ? "var(--accent-soft)" : "transparent",
            color: value === w.iso ? "var(--accent-2)" : "var(--ink)",
            fontWeight: value === w.iso ? 500 : 400,
          }}>
          {w.label}
          {w.iso === WEEKS[0].iso && <span className="chip ok" style={{ marginLeft: "auto", height: 16, fontSize: 9.5, padding: "0 6px" }}>current</span>}
        </button>
      ))}
    </div>
  );
}

function LogModal({ student, cls, existing, onClose, onSubmit }) {
  const [form, setForm] = useState({
    classwork: existing?.classwork || SAMPLE_LOG.classwork,
    homework: existing?.homework || SAMPLE_LOG.homework,
    topics: existing?.topics || SAMPLE_LOG.topics,
    handwritingNote: existing?.handwritingNote || SAMPLE_LOG.handwritingNote,
    handwritingGrade: existing?.handwritingGrade || SAMPLE_LOG.handwritingGrade,
    behaviour: existing?.behaviour || SAMPLE_LOG.behaviour,
    extra: existing?.extra || SAMPLE_LOG.extra,
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
            <div className="card-sub">{student.name} · {student.id} · Class {cls} · {DEMO_TODAY}</div>
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
