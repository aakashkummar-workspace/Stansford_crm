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
  attendance: "present",
  leaveReason: "",
  classwork: "",
  classworkStatus: null,
  homework: "",
  homeworkStatus: null,
  topics: "",
  handwritingNote: "",
  handwritingGrade: "",
  behaviour: "",
  extra: "",
};

export default function ScreenAcademic({ E, refresh, role, session }) {
  const classes = E.CLASSES;

  // For teachers, build the list of assigned class-sections (e.g. ["2-A","5-B"]).
  // The Academic screen lets them switch between their own classes; they
  // can't see classes they aren't assigned to.
  const teacherClassList = role === "teacher"
    ? (Array.isArray(session?.linkedClasses) && session.linkedClasses.length
        ? session.linkedClasses
        : (session?.linkedId ? [session.linkedId] : []))
    : [];
  const firstTeacherKey = teacherClassList[0] || null;
  const firstTeacherSplit = firstTeacherKey
    ? (() => { const [c, s] = String(firstTeacherKey).split("-"); return { c: Number(c), s }; })()
    : null;

  const [cls, setCls] = useState(firstTeacherSplit?.c || 5);
  const [sec, setSec] = useState(firstTeacherSplit?.s || "A");
  const [selectedStudent, setSelectedStudent] = useState(0);

  // Parent view: pin to the child's class. Teacher: snap to the first
  // assigned class on mount/role-change (they can switch via the picker).
  useEffect(() => {
    if (role === "parent" && E.ADDED_STUDENTS && E.ADDED_STUDENTS[0]) {
      const child = E.ADDED_STUDENTS[0];
      const [c, s] = String(child.cls).split("-");
      const n = Number(c);
      if (!Number.isNaN(n)) setCls(n);
      if (s) setSec(s);
    }
    if (role === "teacher" && firstTeacherSplit) {
      setCls(firstTeacherSplit.c);
      setSec(firstTeacherSplit.s);
    }
  }, [role, E.ADDED_STUDENTS, session?.linkedId, session?.linkedClasses?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const [showAnnounce, setShowAnnounce] = useState(false);
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

  // All daily logs for this student (used for the KPI roll-ups + heatmap).
  const studentLogs = student
    ? (E.DAILY_LOGS || []).filter((l) => l.studentId === student.id)
    : [];

  // 28-day attendance heatmap built from the student's real daily_logs.
  // Cell states:
  //   present | absent | weekend (Sunday) | empty (no log posted that day)
  // Grid runs Mon → Sun, ending on the most recent Sunday so the last column
  // is always Sunday and Today sits inside the bottom row.
  const heatmap = (() => {
    if (!student || !TODAY_ISO) return [];
    const today = new Date(`${TODAY_ISO}T00:00:00`);
    // Find the upcoming Sunday so the trailing column lines up cleanly.
    const dow = today.getDay(); // 0=Sun..6=Sat
    const daysToSun = dow === 0 ? 0 : 7 - dow;
    const lastSun = new Date(today);
    lastSun.setDate(today.getDate() + daysToSun);
    const isoOf = (d) => d.toISOString().slice(0, 10);
    const logsByDate = new Map(studentLogs.map((l) => [l.date, l]));
    const cells = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(lastSun);
      d.setDate(lastSun.getDate() - i);
      const iso = isoOf(d);
      const isFuture = d > today;
      const isSunday = d.getDay() === 0;
      const log = logsByDate.get(iso);
      let state = "empty";
      if (isFuture) state = "future";
      else if (isSunday) state = "weekend";
      else if (log) state = log.attendance === "absent" ? "absent" : "present";
      cells.push({ iso, state, log });
    }
    return cells;
  })();

  const heatColors = {
    present: "var(--ok, #4a7a54)",
    absent:  "var(--err, #b13c1c)",
    weekend: "var(--rule-2, #d6cdb8)",
    empty:   "var(--bg-2, #ebe4d6)",
    future:  "transparent",
  };
  const heatBorders = {
    future: "1px dashed var(--rule, #cbc1aa)",
  };

  // Saved daily log for this student today, if any.
  const savedLog = student
    ? (E.DAILY_LOGS || []).find((l) => l.studentId === student.id && l.date === TODAY_ISO)
    : null;
  const logToShow = savedLog || { ...EMPTY_LOG, postedBy: "", postedAt: null };
  const isUserSaved = Boolean(savedLog);

  // KPI roll-ups computed from the student's daily logs (defined above).
  const presentCount = studentLogs.filter((l) => l.attendance !== "absent").length;
  const cwDone = studentLogs.filter((l) => l.classworkStatus === "completed").length;
  const hwDone = studentLogs.filter((l) => l.homeworkStatus === "completed").length;
  const totalLogs = studentLogs.length;
  const attendancePct = totalLogs ? Math.round((presentCount / totalLogs) * 100) : (student?.attendance ?? 0);
  const homeworkPct   = totalLogs ? Math.round((hwDone / totalLogs) * 100) : 0;
  const classworkPct  = totalLogs ? Math.round((cwDone / totalLogs) * 100) : 0;
  const lastGrade     = studentLogs.find((l) => l.handwritingGrade)?.handwritingGrade || "—";

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
          {role !== "parent" && (
            <>
              {role === "teacher" && (
                <button className="btn" onClick={() => setShowAnnounce(true)}>
                  <Icon name="megaphone" size={13} />Announce to class
                </button>
              )}
              <button className="btn" onClick={downloadMonthlyReport}>
                <Icon name="download" size={13} />Monthly report
              </button>
              <button className="btn accent" onClick={() => setShowLog(true)}>
                <Icon name="plus" size={13} />Log today
              </button>
            </>
          )}
        </div>
      </div>

      {/* Teacher class picker — chips for each assigned class. If only one
          class is assigned this acts like a locked banner. */}
      {role === "teacher" && teacherClassList.length > 0 && (
        <div className="card" style={{ marginBottom: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Icon name="academic" size={16} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            Your {teacherClassList.length === 1 ? "class" : "classes"} ·
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {teacherClassList.map((key) => {
              const [c, s] = String(key).split("-");
              const active = `${cls}-${sec}` === key;
              return (
                <button
                  key={key}
                  onClick={() => { setCls(Number(c)); setSec(s); setSelectedStudent(0); }}
                  className="btn sm"
                  style={{
                    background: active ? "var(--accent-soft)" : "var(--card)",
                    color: active ? "var(--accent-2)" : "var(--ink-2)",
                    borderColor: active ? "var(--accent)" : "var(--rule)",
                  }}
                >
                  Class {key}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: "auto" }}>
            {teacherClassList.length === 1
              ? `Daily logs and announcements you post go to ${cls}-${sec} parents.`
              : `Pick a class to work on. You can post for each class separately.`}
          </span>
        </div>
      )}

      <div className="grid g-12">
        {role !== "parent" && role !== "teacher" && (
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
        )}

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
            <KPI label="Attendance" value={totalLogs ? `${attendancePct}%` : "—"} sub={totalLogs ? `${presentCount}/${totalLogs} days present` : "no logs yet"} puck="mint" puckIcon="check" />
            <KPI label="Homework" value={totalLogs ? `${homeworkPct}%` : "—"} sub={totalLogs ? `${hwDone}/${totalLogs} completed` : "no logs yet"} puck="peach" puckIcon="book" />
            <KPI label="Classwork" value={totalLogs ? `${classworkPct}%` : "—"} sub={totalLogs ? `${cwDone}/${totalLogs} completed` : "no logs yet"} puck="cream" puckIcon="pencil" />
            <KPI label="Handwriting" value={lastGrade} sub="last graded" puck="sky" puckIcon="pencil" />
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
                {isUserSaved && (() => {
                  const absent = logToShow.attendance === "absent";
                  const cwStatus = logToShow.classworkStatus;
                  const hwStatus = logToShow.homeworkStatus;
                  const rows = [
                    { l: "Attendance", v: absent ? "Absent" : "Present",
                      c: absent
                        ? <span className="chip bad"><Icon name="x" size={10} stroke={2.5} />Absent</span>
                        : <span className="chip ok"><Icon name="check" size={10} stroke={2.5} />Present</span> },
                  ];
                  if (absent) {
                    rows.push({ l: "Leave reason", v: logToShow.leaveReason || "—", c: null });
                  } else {
                    rows.push(
                      { l: "Classwork", v: logToShow.classwork,
                        c: cwStatus === "completed" ? <span className="chip ok"><span className="dot" />Completed</span>
                          : cwStatus === "not_completed" ? <span className="chip bad"><span className="dot" />Not completed</span>
                          : null },
                      { l: "Homework", v: logToShow.homework,
                        c: hwStatus === "completed" ? <span className="chip ok"><span className="dot" />Completed</span>
                          : hwStatus === "pending" ? <span className="chip warn"><span className="dot" />Pending</span>
                          : null },
                      { l: "Topics covered today", v: logToShow.topics, c: null },
                      { l: "Handwriting", v: logToShow.handwritingNote, c: logToShow.handwritingGrade ? <span className="chip accent"><span className="dot" />{logToShow.handwritingGrade}</span> : null },
                      { l: "Behaviour", v: logToShow.behaviour, c: null },
                      { l: "Extra-curricular", v: logToShow.extra, c: null },
                    );
                  }
                  return rows;
                })().map((r, i, arr) => (
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
                    const isToday = c.iso === TODAY_ISO;
                    const titleParts = [
                      new Date(`${c.iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }),
                      c.state === "present" ? "Present" :
                      c.state === "absent"  ? `Absent${c.log?.leaveReason ? " — " + c.log.leaveReason : ""}` :
                      c.state === "weekend" ? "Weekend (Sunday)" :
                      c.state === "future"  ? "Upcoming" :
                                              "No log posted",
                    ];
                    return (
                      <div
                        key={i}
                        className="hm-cell"
                        title={titleParts.join(" — ")}
                        style={{
                          background: heatColors[c.state],
                          border: heatBorders[c.state] || (isToday ? "1.5px solid var(--ink)" : undefined),
                          opacity: c.state === "weekend" ? 0.55 : 1,
                          cursor: c.state === "future" ? "default" : "help",
                        }}
                      />
                    );
                  })}
                </div>
                {/* Legend */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, paddingTop: 10, borderTop: "1px dashed var(--rule, #e5dfd1)", fontSize: 10.5, color: "var(--ink-3)" }}>
                  <Legend swatch={heatColors.present} label="Present" />
                  <Legend swatch={heatColors.absent}  label="Absent" />
                  <Legend swatch={heatColors.empty}   label="No log" />
                  <Legend swatch={heatColors.weekend} label="Sun" />
                  <span style={{ marginLeft: "auto", color: "var(--ink-4)" }}>Hover a cell for the date</span>
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
          today={TODAY_ISO}
          onClose={() => setShowLog(false)}
          onSubmit={submitLog}
        />
      )}

      {showAnnounce && role === "teacher" && (
        <AnnounceClassModal
          cls={`${cls}-${sec}`}
          recipientCount={roster.length}
          teacherName={session?.name || "Teacher"}
          onClose={() => setShowAnnounce(false)}
          onSent={(msg) => { setShowAnnounce(false); flash(msg); refresh?.(); }}
        />
      )}
    </div>
  );
}

// ---------- announce-to-class modal (teacher) ----------
// Posts a broadcast tagged to the teacher's class so parents of that class
// see it in their Communication / Messages screen.
function AnnounceClassModal({ cls, recipientCount, teacherName, onClose, onSent }) {
  const [channel, setChannel] = useState("whatsapp");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!message.trim()) { setErr("Type a message first"); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/communication/broadcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaign: `Class ${cls} announcement · ${teacherName}`,
          audience: `class_${cls}`,
          audienceLabel: `Class ${cls} parents`,
          channel,
          message: message.trim(),
          sent: recipientCount,
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      onSent(`Announced to ${recipientCount} parent${recipientCount === 1 ? "" : "s"} of Class ${cls}`);
    } catch (ex) { setErr(ex.message); setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
      display: "grid", placeItems: "center", zIndex: 250, padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 520 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Announce to Class {cls}</div>
            <div className="card-sub">Sent to {recipientCount} parent{recipientCount === 1 ? "" : "s"} via {channel}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Channel">
            <div className="segmented">
              <button type="button" className={channel === "whatsapp" ? "active" : ""} onClick={() => setChannel("whatsapp")}>
                <Icon name="whatsapp" size={11} />WhatsApp
              </button>
              <button type="button" className={channel === "sms" ? "active" : ""} onClick={() => setChannel("sms")}>
                <Icon name="sms" size={11} />SMS
              </button>
              <button type="button" className={channel === "both" ? "active" : ""} onClick={() => setChannel("both")}>
                Both
              </button>
            </div>
          </Field>
          <Field label="Message">
            <textarea
              className="input"
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ width: "100%", height: 110, padding: "10px 12px", lineHeight: 1.5, resize: "vertical", fontFamily: "var(--font-sans)" }}
              placeholder={`e.g. Reminder: bring your art supplies for tomorrow's class. — ${teacherName}`}
            />
          </Field>
          {err && (
            <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>
              {err}
            </div>
          )}
          {recipientCount === 0 && (
            <div style={{ background: "var(--warn-soft)", color: "var(--warn)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>
              No students in Class {cls} yet — announcement won't reach anyone.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn accent" disabled={busy || !message.trim() || recipientCount === 0}>
              <Icon name="send" size={13} />{busy ? "Sending…" : `Send to ${recipientCount}`}
            </button>
          </div>
        </form>
      </div>
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

function LogModal({ student, cls, existing, today, onClose, onSubmit }) {
  const [form, setForm] = useState({
    attendance: existing?.attendance || "present",
    leaveReason: existing?.leaveReason || "",
    classwork: existing?.classwork || "",
    classworkStatus: existing?.classworkStatus || "completed",
    homework: existing?.homework || "",
    homeworkStatus: existing?.homeworkStatus || "completed",
    topics: existing?.topics || "",
    handwritingNote: existing?.handwritingNote || "",
    handwritingGrade: existing?.handwritingGrade || "A",
    behaviour: existing?.behaviour || "",
    extra: existing?.extra || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isAbsent = form.attendance === "absent";

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
            <div className="card-sub">{student?.name || "—"} · {student?.id || ""} · Class {cls} · {today}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Attendance">
            <div className="segmented">
              <button type="button" className={!isAbsent ? "active" : ""} onClick={() => set("attendance", "present")}>
                <Icon name="check" size={11} />Present
              </button>
              <button type="button" className={isAbsent ? "active" : ""} onClick={() => set("attendance", "absent")}>
                <Icon name="x" size={11} />Absent
              </button>
            </div>
          </Field>
          {isAbsent && (
            <Field label="Leave reason">
              <input
                className="input"
                value={form.leaveReason}
                onChange={(e) => set("leaveReason", e.target.value)}
                placeholder="Why is the student absent today?"
              />
            </Field>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
            <Field label="Classwork">
              <input
                className="input"
                value={form.classwork}
                onChange={(e) => set("classwork", e.target.value)}
                placeholder="e.g. Fractions · Ex 3.2 pp. 54–56"
                disabled={isAbsent}
              />
            </Field>
            <Field label="Status">
              <div className="segmented">
                <button type="button" className={form.classworkStatus === "completed" ? "active" : ""} onClick={() => set("classworkStatus", "completed")} disabled={isAbsent}>Done</button>
                <button type="button" className={form.classworkStatus === "not_completed" ? "active" : ""} onClick={() => set("classworkStatus", "not_completed")} disabled={isAbsent}>Pending</button>
              </div>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
            <Field label="Homework">
              <input
                className="input"
                value={form.homework}
                onChange={(e) => set("homework", e.target.value)}
                placeholder="What's due tomorrow"
                disabled={isAbsent}
              />
            </Field>
            <Field label="Status">
              <div className="segmented">
                <button type="button" className={form.homeworkStatus === "completed" ? "active" : ""} onClick={() => set("homeworkStatus", "completed")} disabled={isAbsent}>Done</button>
                <button type="button" className={form.homeworkStatus === "pending" ? "active" : ""} onClick={() => set("homeworkStatus", "pending")} disabled={isAbsent}>Pending</button>
              </div>
            </Field>
          </div>

          <Field label="Topics covered today">
            <input className="input" value={form.topics} onChange={(e) => set("topics", e.target.value)} placeholder="Brief subject-wise summary" disabled={isAbsent} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
            <Field label="Handwriting note">
              <input className="input" value={form.handwritingNote} onChange={(e) => set("handwritingNote", e.target.value)} disabled={isAbsent} />
            </Field>
            <Field label="Grade">
              <select className="select" value={form.handwritingGrade} onChange={(e) => set("handwritingGrade", e.target.value)} disabled={isAbsent}>
                {["A+", "A", "A-", "B+", "B", "B-", "C", "D"].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Behaviour">
            <input className="input" value={form.behaviour} onChange={(e) => set("behaviour", e.target.value)} placeholder="One sentence on how the day went" disabled={isAbsent} />
          </Field>
          <Field label="Extra-curricular">
            <input className="input" value={form.extra} onChange={(e) => set("extra", e.target.value)} placeholder="Clubs, sports, art, etc." disabled={isAbsent} />
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

function Legend({ swatch, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{
        width: 9, height: 9, borderRadius: 2,
        background: swatch, border: "1px solid var(--rule, #e5dfd1)",
      }} />
      {label}
    </span>
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
