"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip } from "../ui";

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

  useEffect(() => {
    const d = new Date();
    setTodayIso(d.toISOString().slice(0, 10));
    setTodayLabel(d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
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
    for (const stu of roster) {
      const log = (E.DAILY_LOGS || []).find((l) => l.studentId === stu.id && l.date === todayIso);
      next[stu.id] = log
        ? { state: log.attendance === "absent" ? "absent" : "present", reason: log.leaveReason || "", saved: true }
        : { state: null, reason: "", saved: false };
    }
    setMarks(next);
  }, [todayIso, roster.length, E.DAILY_LOGS]); // eslint-disable-line react-hooks/exhaustive-deps

  const setMark = (id, state) => setMarks((m) => ({ ...m, [id]: { ...(m[id] || {}), state, saved: false } }));
  const setReason = (id, reason) => setMarks((m) => ({ ...m, [id]: { ...(m[id] || {}), reason, saved: false } }));

  const presentCount = roster.filter((s) => marks[s.id]?.state === "present").length;
  const absentCount  = roster.filter((s) => marks[s.id]?.state === "absent").length;
  const unmarkedCount = roster.length - presentCount - absentCount;
  const dirty = roster.some((s) => marks[s.id] && marks[s.id].saved === false && marks[s.id].state);

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
        leaveReason: marks[s.id].state === "absent" ? (marks[s.id].reason || "") : "",
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
      showToast(`Saved · ${json.present} present, ${json.absent} absent`, "ok");
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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">People · Attendance</div>
          <div className="page-title">Attendance <span className="amber">today</span></div>
          <div className="page-sub">{todayLabel || " "} · marks save to today's daily log for each student</div>
        </div>
        <div className="page-actions">
          {roster.length > 0 && (
            <>
              <button className="btn" onClick={() => markAll("present")} disabled={busy}>
                <Icon name="check" size={13} />Mark all present
              </button>
              <button className="btn" onClick={() => markAll("absent")} disabled={busy}>
                <Icon name="x" size={13} />Mark all absent
              </button>
              <button className="btn accent" onClick={save} disabled={busy || !dirty}>
                {busy ? "Saving…" : <><Icon name="check" size={13} />Save attendance</>}
              </button>
            </>
          )}
        </div>
      </div>

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
                  Class {key}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: "auto" }}>
            {roster.length} student{roster.length === 1 ? "" : "s"} on roll · {cls}-{sec}
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
              Class {c.n}
            </button>
          ))}
          <span style={{ width: 1, height: 16, background: "var(--rule)", margin: "0 6px" }} />
          {((E.CLASSES || []).find((c) => c.n === cls)?.sections || ["A", "B"]).map((s) => (
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

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="On roll" value={roster.length} sub={`Class ${cls}-${sec}`} puck="mint" puckIcon="students" />
        <KPI label="Present" value={presentCount} sub={roster.length ? `${Math.round((presentCount / roster.length) * 100)}%` : "—"} puck="cream" puckIcon="check" />
        <KPI label="Absent" value={absentCount} sub={roster.length ? `${Math.round((absentCount / roster.length) * 100)}%` : "—"} puck="rose" puckIcon="x" />
        <KPI label="Not marked" value={unmarkedCount} sub={dirty ? "unsaved changes" : "click Save"} puck="peach" puckIcon="warning" />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Roster · {cls}-{sec}</div>
            <div className="card-sub">Tap Present or Absent for each student. Add a reason when absent.</div>
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
                <th style={{ width: 220 }}>Status</th>
                <th>Reason (if absent)</th>
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
                const isPresent = m.state === "present";
                const isAbsent  = m.state === "absent";
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
                      <div className="segmented" style={{ width: "fit-content" }}>
                        <button
                          type="button"
                          className={isPresent ? "active" : ""}
                          onClick={() => setMark(s.id, "present")}
                          style={isPresent ? { background: "var(--ok-soft)", color: "var(--ok)" } : {}}
                        >
                          <Icon name="check" size={11} />Present
                        </button>
                        <button
                          type="button"
                          className={isAbsent ? "active" : ""}
                          onClick={() => setMark(s.id, "absent")}
                          style={isAbsent ? { background: "var(--bad-soft)", color: "var(--bad, var(--err))" } : {}}
                        >
                          <Icon name="x" size={11} />Absent
                        </button>
                      </div>
                    </td>
                    <td>
                      {isAbsent ? (
                        <input
                          className="input"
                          style={{ height: 28, fontSize: 12 }}
                          value={m.reason}
                          onChange={(e) => setReason(s.id, e.target.value)}
                          placeholder="Sick / family event / …"
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

      <Toast msg={toast?.msg} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}
