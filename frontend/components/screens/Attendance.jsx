"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip } from "../ui";
import { formatClassLabel } from "@/backend/lib/format.js";

function Toast({ msg, tone, onClose }) {
  if (!msg) return null;
  const bg = tone === "ok" ? "var(--ok)" : tone === "err" ? "var(--err, #b13c1c)" : "var(--ink)";
  return (
    <div onClick={onClose} role="status" style={{
      position: "fixed", bottom: 18, right: 18, zIndex: 9000,
      background: bg, color: "#fff", padding: "9px 14px", borderRadius: 8,
      fontSize: 12, fontWeight: 500, cursor: "pointer", maxWidth: 360,
      boxShadow: "0 12px 30px -16px rgba(0,0,0,0.35)",
    }}>{msg}</div>
  );
}

export default function ScreenAttendance({ E, refresh, role, session }) {
  // Parents get a child-scoped read-only view — no class picker, no
  // roster, no marking controls. They see today's status + a 30-day
  // attendance history for their child only. Staff fall through to
  // the full marking flow below.
  if (role === "parent") {
    return <ParentAttendanceView E={E} />;
  }

  // Teachers can be assigned to several classes. Build the picker list from
  // session.linkedClasses (legacy session.linkedId still honoured).
  const teacherClassList = role === "teacher"
    ? (Array.isArray(session?.linkedClasses) && session.linkedClasses.length
        ? session.linkedClasses
        : (session?.linkedId ? [session.linkedId] : []))
    : [];
  const firstTeacherKey = teacherClassList[0] || null;
  const firstTeacherSplit = firstTeacherKey
    ? (() => { const [c, s] = String(firstTeacherKey).split("-"); return { c: Number(c), s }; })()
    : null;

  const [cls, setCls] = useState(firstTeacherSplit?.c || (E.CLASSES?.[0]?.n) || 1);
  const [sec, setSec] = useState(firstTeacherSplit?.s || "A");
  const [todayIso, setTodayIso] = useState("");
  const [todayLabel, setTodayLabel] = useState("");
  const [marks, setMarks] = useState({}); // { studentId: { state: 'present'|'absent', reason: '' } }
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  // Pin "today" by the system clock and re-check every 60s so a screen left
  // open across midnight will auto-roll forward (which also releases the
  // once-per-day lock below for the next day).
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const iso = d.toISOString().slice(0, 10);
      setTodayIso((prev) => (prev === iso ? prev : iso));
      setTodayLabel(d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    };
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  // Roster for the selected class+section
  const roster = useMemo(() => {
    const want = `${cls}-${sec}`;
    return (E.ADDED_STUDENTS || [])
      .filter((s) => s.cls === want)
      .map((s, i) => ({ id: s.id, name: s.name, cls: s.cls, parent: s.parent, roll: i + 1 }));
  }, [E.ADDED_STUDENTS, cls, sec]);

  // Pre-populate marks from existing daily logs for today
  useEffect(() => {
    if (!todayIso) return;
    const next = {};
    const ATT_STATES = new Set(["present", "late", "absent", "leave"]);
    for (const stu of roster) {
      const log = (E.DAILY_LOGS || []).find((l) => l.studentId === stu.id && l.date === todayIso);
      next[stu.id] = log
        ? {
            state: ATT_STATES.has(log.attendance) ? log.attendance : "present",
            reason: log.leaveReason || "",
            saved: true,
          }
        : { state: null, reason: "", saved: false };
    }
    setMarks(next);
  }, [todayIso, roster.length, E.DAILY_LOGS]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMark = (id, state) => setMarks((m) => ({ ...m, [id]: { ...(m[id] || {}), state, saved: false } }));
  const setReason = (id, reason) => setMarks((m) => ({ ...m, [id]: { ...(m[id] || {}), reason, saved: false } }));

  const presentCount = roster.filter((s) => marks[s.id]?.state === "present").length;
  const lateCount    = roster.filter((s) => marks[s.id]?.state === "late").length;
  const absentCount  = roster.filter((s) => marks[s.id]?.state === "absent").length;
  const leaveCount   = roster.filter((s) => marks[s.id]?.state === "leave").length;
  const unmarkedCount = roster.length - presentCount - lateCount - absentCount - leaveCount;
  const dirty = roster.some((s) => marks[s.id] && marks[s.id].saved === false && marks[s.id].state);
  // Once attendance is recorded for everyone in the class today, the screen
  // is locked until the system date changes — staff take attendance for each
  // class once per day. Re-opens automatically next day via the tick() above.
  const lockedForToday = roster.length > 0 && roster.every((s) => marks[s.id]?.saved === true && marks[s.id]?.state);

  const showToast = (msg, tone) => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3500);
  };

  const markAll = (state) => {
    const next = {};
    for (const stu of roster) {
      next[stu.id] = { state, reason: marks[stu.id]?.reason || "", saved: false };
    }
    setMarks(next);
  };

  const save = async () => {
    if (busy) return;
    const list = roster
      .filter((s) => marks[s.id]?.state)
      .map((s) => ({
        studentId: s.id,
        studentName: s.name,
        attendance: marks[s.id].state,
        // Reason persists for any non-present bucket — absent/late/leave.
        leaveReason: marks[s.id].state === "present" ? "" : (marks[s.id].reason || ""),
      }));
    if (list.length === 0) { showToast("Mark at least one student", "err"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/academic/attendance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: todayIso, cls: `${cls}-${sec}`, marks: list }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast(
        `Saved · ${json.present || 0} present · ${json.late || 0} late · ${json.absent || 0} absent · ${json.leave || 0} on leave`,
        "ok",
      );
      // Mark all saved=true locally
      setMarks((m) => {
        const next = { ...m };
        for (const k of Object.keys(next)) if (next[k].state) next[k].saved = true;
        return next;
      });
      await refresh?.();
    } catch (e) { showToast(e.message, "err"); }
    finally { setBusy(false); }
  };

  const canPickClass = role !== "teacher";
  // Principal/admin can also take staff (teacher) attendance from this screen.
  // Mode flips between the existing student roster view and a new teacher panel.
  const canMarkTeachers = role === "principal" || role === "admin";
  const [mode, setMode] = useState("students"); // "students" | "teachers"

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">People · Attendance</div>
          <div className="page-title">Attendance <span className="amber">today</span></div>
          <div className="page-sub">{todayLabel || " "} · marks save to today's daily log for each student</div>
        </div>
        <div className="page-actions">
          {mode === "students" && roster.length > 0 && (
            <>
              <button className="btn" onClick={() => markAll("present")} disabled={busy || lockedForToday}>
                <Icon name="check" size={13} />Mark all present
              </button>
              <button className="btn" onClick={() => markAll("absent")} disabled={busy || lockedForToday}>
                <Icon name="x" size={13} />Mark all absent
              </button>
              <button
                className="btn accent"
                onClick={save}
                disabled={busy || !dirty || lockedForToday}
                title={lockedForToday ? "Already recorded for today" : ""}
              >
                {busy ? "Saving…" : lockedForToday ? <><Icon name="check" size={13} />Recorded for today</> : <><Icon name="check" size={13} />Save attendance</>}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mode tab strip — only relevant for principal / admin */}
      {canMarkTeachers && (
        <div className="card" style={{ marginBottom: 14, padding: "10px 14px", display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500, marginRight: 4 }}>Take attendance for:</span>
          {[
            { k: "students", label: "Students" },
            { k: "teachers", label: "Teachers" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setMode(t.k)}
              style={{
                padding: "6px 14px", borderRadius: 999,
                background: mode === t.k ? "var(--accent)" : "var(--bg-2)",
                color: mode === t.k ? "#fff" : "var(--ink-2)",
                border: 0, cursor: "pointer", fontSize: 12.5, fontWeight: 500,
              }}
            >{t.label}</button>
          ))}
        </div>
      )}

      {mode === "teachers" && canMarkTeachers ? (
        <TeacherAttendancePanel
          E={E}
          today={todayIso}
          todayLabel={todayLabel}
          refresh={refresh}
          showToast={(m, t) => setToast({ msg: m, tone: t })}
        />
      ) : null}

      {mode === "students" && (
      <></>
      )}
      {mode === "students" && (<div style={{ display: "contents" }}>

      {/* Class banner / picker */}
      {role === "teacher" ? (
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
                  onClick={() => { setCls(Number(c)); setSec(s); }}
                  className="btn sm"
                  style={{
                    background: active ? "var(--accent-soft)" : "var(--card)",
                    color: active ? "var(--accent-2)" : "var(--ink-2)",
                    borderColor: active ? "var(--accent)" : "var(--rule)",
                  }}
                >
                  {formatClassLabel(key)}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: "auto" }}>
            {roster.length} student{roster.length === 1 ? "" : "s"} on roll · {formatClassLabel(`${cls}-${sec}`)}
          </span>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 14, padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4 }}>Class</span>
          {(E.CLASSES || []).map((c) => (
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
              {c.label || formatClassLabel(String(c.n))}
            </button>
          ))}
        </div>
      )}

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="On roll" value={roster.length} sub={`${formatClassLabel(`${cls}-${sec}`)} · ${unmarkedCount} not marked`} puck="mint" puckIcon="students" />
        <KPI label="Present" value={presentCount} sub={roster.length ? `${Math.round((presentCount / roster.length) * 100)}%` : "—"} puck="cream" puckIcon="check" />
        <KPI label="Late" value={lateCount} sub={lateCount ? "with reasons" : "—"} puck="peach" puckIcon="clock" />
        <KPI label="Absent / leave" value={absentCount + leaveCount} sub={`${absentCount} absent · ${leaveCount} on leave`} puck="rose" puckIcon="x" />
      </div>

      {lockedForToday && (
        <div style={{
          background: "var(--ok-soft, #e7f3e8)", color: "var(--ok, #1f7a3a)",
          border: "1px solid var(--ok, #1f7a3a)", borderRadius: 10,
          padding: "10px 14px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 10, fontSize: 12.5,
        }}>
          <Icon name="check" size={14} />
          <span>
            Attendance for <b>{formatClassLabel(`${cls}-${sec}`)}</b> is already recorded for today
            ({todayLabel || todayIso}). The roster is locked — it will reopen automatically tomorrow.
          </span>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Roster · {formatClassLabel(`${cls}-${sec}`)}</div>
            <div className="card-sub">
              {lockedForToday
                ? "Today's attendance is locked. Buttons reopen tomorrow."
                : "Tap Present or Absent for each student. Add a reason when absent."}
            </div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Student</th>
                <th>Roll · ID</th>
                <th>Parent</th>
                <th style={{ width: 320 }}>Status</th>
                <th>Reason (late · absent · leave)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roster.length === 0 && (
                <tr><td colSpan={7} className="empty">
                  No students in Class {cls}-{sec} yet. Add students from the Students screen first.
                </td></tr>
              )}
              {roster.map((s, i) => {
                const m = marks[s.id] || { state: null, reason: "" };
                const STATE_PILLS = [
                  { k: "present", label: "Present", icon: "check", soft: "ok-soft",  fg: "ok" },
                  { k: "late",    label: "Late",    icon: "clock", soft: "warn-soft", fg: "warn" },
                  { k: "absent",  label: "Absent",  icon: "x",     soft: "bad-soft",  fg: "bad" },
                  { k: "leave",   label: "Leave",   icon: "calendar", soft: "accent-soft", fg: "accent" },
                ];
                const needsReason = m.state && m.state !== "present";
                return (
                  <tr key={s.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)" }}>{String(i + 1).padStart(2, "0")}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <AvatarChip initials={(s.name || "?").split(" ").map((n) => n[0]).join("")} />
                        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                      {String(s.roll).padStart(2, "0")} · {s.id}
                    </td>
                    <td style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{s.parent}</td>
                    <td>
                      <div className="segmented" style={{ width: "fit-content", opacity: lockedForToday ? 0.7 : 1, flexWrap: "wrap" }}>
                        {STATE_PILLS.map((p) => {
                          const active = m.state === p.k;
                          return (
                            <button
                              key={p.k}
                              type="button"
                              className={active ? "active" : ""}
                              onClick={() => setMark(s.id, p.k)}
                              disabled={lockedForToday}
                              style={active ? { background: `var(--${p.soft})`, color: `var(--${p.fg})` } : {}}
                            >
                              <Icon name={p.icon} size={11} />{p.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td>
                      {needsReason ? (
                        <input
                          className="input"
                          style={{ height: 28, fontSize: 12 }}
                          value={m.reason}
                          disabled={lockedForToday}
                          onChange={(e) => setReason(s.id, e.target.value)}
                          placeholder={
                            m.state === "late"   ? "Traffic / late bus / overslept …" :
                            m.state === "leave"  ? "Pre-approved leave reason …" :
                                                   "Sick / family event …"
                          }
                        />
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--ink-4)" }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {m.saved && m.state && (
                        <span className="chip ok" style={{ fontSize: 10 }}><span className="dot" />Saved</span>
                      )}
                      {!m.saved && m.state && (
                        <span className="chip warn" style={{ fontSize: 10 }}><span className="dot" />Unsaved</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      )}

      <Toast msg={toast?.msg} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

// Teacher attendance panel — visible only to principal/admin via the mode tab
// at the top. Shows every teacher (from /api/users?role=teacher) with their
// today status + Present/Absent/Leave buttons + a Save All. Self-marks done by
// the teacher themselves on the Exams & Marks screen still feed the same data.
function TeacherAttendancePanel({ E, today, todayLabel, refresh, showToast }) {
  const [teachers, setTeachers] = useState([]);
  const [todays, setTodays] = useState([]); // pre-existing rows for today
  const [drafts, setDrafts] = useState({}); // teacherId -> "present"|"absent"|"leave"
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pull list of teachers + today's attendance once.
  useEffect(() => {
    if (!today) return;
    let cancel = false;
    (async () => {
      try {
        const [tu, ta] = await Promise.all([
          fetch(`/api/users?role=teacher`,    { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/teacher-attendance?fromDate=${today}&toDate=${today}`, { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (cancel) return;
        setTeachers(tu.ok ? (tu.teachers || []) : []);
        setTodays(ta.ok  ? (ta.records  || []) : []);
        const d = {};
        for (const r of (ta.records || [])) d[r.teacherId] = r.status;
        setDrafts(d);
      } catch {}
      finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [today]);

  const counts = useMemo(() => {
    const out = { present: 0, late: 0, absent: 0, leave: 0, unmarked: 0 };
    for (const t of teachers) {
      const v = drafts[t.id];
      if (v === "present")      out.present++;
      else if (v === "late")    out.late++;
      else if (v === "absent")  out.absent++;
      else if (v === "leave")   out.leave++;
      else                      out.unmarked++;
    }
    return out;
  }, [drafts, teachers]);

  const dirty = useMemo(() => {
    const saved = {};
    for (const r of todays) saved[r.teacherId] = r.status;
    return Object.keys(drafts).some((id) => drafts[id] !== saved[id]);
  }, [drafts, todays]);

  const setMark = (teacherId, status) => setDrafts((d) => ({ ...d, [teacherId]: status }));
  const markAll = (status) => {
    const next = {};
    for (const t of teachers) next[t.id] = status;
    setDrafts(next);
  };

  async function saveAll() {
    setBusy(true);
    try {
      const entries = teachers
        .map((t) => drafts[t.id] ? { teacherId: t.id, status: drafts[t.id] } : null)
        .filter(Boolean);
      // No bulk endpoint — POST one by one. Volumes are small (school-scale).
      for (const e of entries) {
        const r = await fetch("/api/teacher-attendance", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ teacherId: e.teacherId, date: today, status: e.status }),
        });
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
      }
      showToast(`Saved ${entries.length} teacher attendance${entries.length === 1 ? "" : "s"}`, "ok");
      // Re-pull so `dirty` becomes false again.
      const ta = await fetch(`/api/teacher-attendance?fromDate=${today}&toDate=${today}`, { cache: "no-store" }).then((r) => r.json());
      if (ta.ok) setTodays(ta.records || []);
      await refresh?.();
    } catch (e) { showToast(e.message, "err"); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="card empty">Loading teachers…</div>;
  if (teachers.length === 0) return <div className="card empty">No teachers yet — add staff with role <b>Teacher</b> from the Staff screen.</div>;

  return (
    <div>
      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Present today" value={counts.present} sub={`${todayLabel || today}`} puck="mint" puckIcon="check" />
        <KPI label="Late arrivals" value={counts.late} sub={counts.late ? "with reasons" : "—"} puck="peach" puckIcon="clock" />
        <KPI label="Absent / leave" value={counts.absent + counts.leave} sub={`${counts.absent} absent · ${counts.leave} on leave`} puck="rose" puckIcon="warning" />
        <KPI label="Unmarked" value={counts.unmarked} sub={counts.unmarked ? "needs marking" : "all done"} puck="cream" puckIcon="audit" />
      </div>

      <div className="card">
        <div className="card-head">
          <div><div className="card-title">Teachers · today</div><div className="card-sub">Tap a chip to mark · click Save when done</div></div>
          <div className="card-actions" style={{ display: "flex", gap: 6 }}>
            <button className="btn sm" onClick={() => markAll("present")} disabled={busy}><Icon name="check" size={11} />All present</button>
            <button className="btn sm" onClick={() => markAll("absent")} disabled={busy}><Icon name="x" size={11} />All absent</button>
            <button className="btn sm accent" onClick={saveAll} disabled={busy || !dirty}>
              {busy ? "Saving…" : <><Icon name="check" size={13} />{dirty ? "Save attendance" : "Saved"}</>}
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr><th>#</th><th>Teacher</th><th>Email</th><th style={{ textAlign: "right" }}>Mark</th></tr>
            </thead>
            <tbody>
              {teachers.map((t, i) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", width: 32 }}>{String(i + 1).padStart(2, "0")}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <AvatarChip initials={(t.name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{t.name}</div>
                        {t.linkedClasses?.length > 0 && (
                          <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>Classes: {t.linkedClasses.join(", ")}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{t.email}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <MarkChip label="Present" tone="ok"   active={drafts[t.id] === "present"} onClick={() => setMark(t.id, "present")} />
                      <MarkChip label="Late"    tone="warn" active={drafts[t.id] === "late"}    onClick={() => setMark(t.id, "late")} />
                      <MarkChip label="Absent"  tone="bad"  active={drafts[t.id] === "absent"}  onClick={() => setMark(t.id, "absent")} />
                      <MarkChip label="Leave"   tone="info" active={drafts[t.id] === "leave"}   onClick={() => setMark(t.id, "leave")} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MarkChip({ label, tone, active, onClick }) {
  const bg = active
    ? (tone === "ok" ? "var(--ok)"
     : tone === "bad" ? "var(--err, #b13c1c)"
     : tone === "info" ? "var(--accent, #1f3f8b)"
     : "var(--warn)")
    : "var(--bg-2)";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 10px", borderRadius: 6,
        background: bg, color: active ? "#fff" : "var(--ink-2)",
        border: 0, cursor: "pointer",
        fontSize: 11, fontWeight: 500,
        transition: "background .12s",
      }}
    >{label}</button>
  );
}

// Parent-only attendance view. Read-only summary for one child.
// Server-side, /api/data parent-scope already filters dailyLogs to just
// this child's records, so we can iterate freely without leaking other
// students' attendance.
function ParentAttendanceView({ E }) {
  const child = (E.ADDED_STUDENTS || [])[0] || null;

  if (!child) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <div className="page-eyebrow">PEOPLE · ATTENDANCE</div>
            <div className="page-title">Attendance</div>
            <div className="page-sub">Ask the school office to link your account to your child's record.</div>
          </div>
        </div>
      </div>
    );
  }

  const logs = (E.DAILY_LOGS || []).filter((l) => l.studentId === child.id);

  // Today's status from the latest log
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayLog = logs.find((l) => l.date === todayIso);
  const todayState = !todayLog
    ? "not_posted"
    : todayLog.attendance === "absent"
      ? "absent"
      : "present";

  // Term-level stats
  const presentCount = logs.filter((l) => l.attendance !== "absent").length;
  const absentCount  = logs.filter((l) => l.attendance === "absent").length;
  const totalLogs    = logs.length;
  const pct = totalLogs ? Math.round((presentCount / totalLogs) * 100) : null;

  // Build a 30-day grid: most recent day first, weekends muted, days
  // with no log shown as "—".
  const grid = (() => {
    const out = [];
    const today = new Date(`${todayIso}T00:00:00`);
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const log = logs.find((l) => l.date === iso);
      const isWeekend = d.getDay() === 0;
      out.push({
        iso,
        dateLabel: d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }),
        state: isWeekend
          ? "weekend"
          : !log ? "empty" : (log.attendance === "absent" ? "absent" : "present"),
        reason: log?.reason || null,
        postedBy: log?.postedBy || null,
      });
    }
    return out;
  })();

  const statusBadge = todayState === "present"
    ? { label: "Present", color: "var(--ok)", bg: "var(--ok-soft, #e6f4ec)" }
    : todayState === "absent"
      ? { label: "Absent", color: "var(--bad)", bg: "var(--bad-soft, #fbe1d8)" }
      : { label: "Not posted yet", color: "var(--ink-3)", bg: "var(--bg-2)" };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">PEOPLE · ATTENDANCE</div>
          <div className="page-title">Attendance <span className="amber">history</span></div>
          <div className="page-sub">
            {child.name} · {formatClassLabel(child.cls)} · {totalLogs} day{totalLogs === 1 ? "" : "s"} logged so far
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid g-4" style={{ marginBottom: 18 }}>
        <KPI
          label="Today"
          value={statusBadge.label}
          sub={todayLog ? `Marked by ${todayLog.postedBy || "teacher"}` : "Teacher hasn't posted yet"}
          puck={todayState === "absent" ? "rose" : todayState === "present" ? "mint" : "cream"}
          puckIcon={todayState === "absent" ? "x" : "check"}
        />
        <KPI
          label="This term"
          value={pct !== null ? `${pct}%` : "—"}
          sub={totalLogs ? `${presentCount}/${totalLogs} days present` : "no logs yet"}
          puck="peach"
          puckIcon="trending"
        />
        <KPI
          label="Days present"
          value={presentCount}
          sub={`out of ${totalLogs} logged`}
          puck="mint"
          puckIcon="check"
        />
        <KPI
          label="Days absent"
          value={absentCount}
          sub={absentCount > 0 ? "see reasons below" : "no absences"}
          puck={absentCount > 0 ? "rose" : "mint"}
          puckIcon={absentCount > 0 ? "x" : "check"}
        />
      </div>

      {/* 30-day timeline list */}
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Last 30 days</div>
            <div className="card-sub">Most recent first · weekends marked as 'Holiday'</div>
          </div>
        </div>
        <div style={{ maxHeight: 480, overflowY: "auto" }}>
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: 150 }}>Date</th>
                <th>Status</th>
                <th>Marked by</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {grid.length === 0 && (
                <tr><td colSpan={4} className="empty">No attendance records yet.</td></tr>
              )}
              {grid.map((row) => {
                const pill = row.state === "present"
                  ? { label: "Present", color: "var(--ok)" }
                  : row.state === "absent"
                    ? { label: "Absent",  color: "var(--bad)" }
                    : row.state === "weekend"
                      ? { label: "Holiday", color: "var(--ink-4)" }
                      : { label: "—",       color: "var(--ink-4)" };
                return (
                  <tr key={row.iso} style={{ borderTop: "1px solid var(--rule-2)" }}>
                    <td style={{ padding: "10px 12px", fontSize: 12.5, color: "var(--ink-2)" }}>
                      {row.dateLabel}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "2px 10px", borderRadius: 999,
                        fontSize: 11, fontWeight: 500,
                        color: pill.color, border: `1px solid ${pill.color}`,
                        background: "transparent",
                      }}>
                        {pill.label}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--ink-3)" }}>
                      {row.postedBy || "—"}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--ink-3)" }}>
                      {row.reason || (row.state === "absent" ? "No reason recorded" : "—")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
