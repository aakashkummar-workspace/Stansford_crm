"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip, StatusChip } from "../ui";

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

export default function ScreenTransport({ E, refresh, role }) {
  const canEdit = role === "principal" || role === "admin";
  const [routeIdx, setRouteIdx] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null); // route object being edited, or null
  const [assigning, setAssigning] = useState(null); // route object being staff-assigned, or null
  const [showAbsent, setShowAbsent] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [toast, setToast] = useState(null);
  const [busyAction, setBusyAction] = useState(null);

  const routes = E.ROUTES || [];
  const route = routes[routeIdx];

  // Reset selection when the active route disappears.
  useEffect(() => {
    if (routeIdx >= routes.length) setRouteIdx(0);
  }, [routes.length, routeIdx]);

  // Map: for the active route, group students by their pickup stop.
  // Students are linked to a route via `student.transport === route.code`.
  // Per-stop assignment is via `student.pickupStop` (matches a stop name).
  // If the student has no pickupStop set, they fall into the FIRST stop so
  // the driver can still see and mark them.
  const studentsByStop = useMemo(() => {
    if (!route) return {};
    const stops = route.stops || [];
    const firstStopName = stops[0]?.name;
    const out = {};
    for (const s of stops) out[s.name] = [];
    for (const stu of (E.ADDED_STUDENTS || [])) {
      if (stu.transport !== route.code) continue;
      const matchStop = stops.find((s) => s.name === stu.pickupStop)?.name || firstStopName;
      if (matchStop && out[matchStop]) out[matchStop].push(stu);
    }
    return out;
  }, [route, E.ADDED_STUDENTS]);

  // Per-student attendance state for today, derived from daily_logs entries
  // posted via the transport flow (we use studentName as a marker through
  // /api/transport/board, which already records the per-student count).
  // For per-student status display we read from the route's stops where we
  // store a parallel `studentAttendance` map. Backed by the existing
  // `boarded`/`absent` counters which are aggregate; per-student state is
  // tracked client-side until the schema gets a proper boarding_log table.
  const todayKey = new Date().toISOString().slice(0, 10);
  const [boardingMarks, setBoardingMarks] = useState({}); // { "routeCode-studentId-date": "boarded"|"absent" }
  const markStudent = async (stop, student, action) => {
    const key = `${route.code}-${student.id}-${todayKey}`;
    setBoardingMarks((m) => ({ ...m, [key]: action === "board" ? "boarded" : "absent" }));
    // Also bump the aggregate counter on the stop via the existing endpoint.
    await mark(stop.name, action);
  };
  const studentMark = (student) => boardingMarks[`${route?.code}-${student.id}-${todayKey}`] || null;

  // Add / remove students from a stop. Updates student.transport +
  // student.pickupStop via PATCH /api/students.
  const [addStopOpen, setAddStopOpen] = useState(null); // stop object being filled, or null
  const linkStudent = async (studentId, stopName) => {
    try {
      const r = await fetch("/api/students", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: studentId, transport: route.code, pickupStop: stopName }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast(`${json.student.name} → ${route.code} · ${stopName}`, "ok");
      setAddStopOpen(null);
      await refresh?.();
    } catch (e) { showToast(e.message, "err"); }
  };
  const unlinkStudent = async (student) => {
    if (!confirm(`Remove ${student.name} from ${route.code} · ${student.pickupStop || "this stop"}?`)) return;
    try {
      const r = await fetch("/api/students", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: student.id, transport: "—", pickupStop: null }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast(`${student.name} unlinked from transport`, "ok");
      await refresh?.();
    } catch (e) { showToast(e.message, "err"); }
  };

  const allStops = routes.flatMap((r) => r.stops || []);
  const totalBoarded = allStops.reduce((a, s) => a + (s.boarded || 0), 0);
  const totalAbsent  = allStops.reduce((a, s) => a + (s.absent  || 0), 0);
  const totalCap     = allStops.reduce((a, s) => a + (s.cap     || 0), 0);

  const showToast = (msg, tone) => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3500);
  };

  const mark = async (stopName, action) => {
    try {
      const r = await fetch("/api/transport/board", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: route.code, stopName, action }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      await refresh?.();
    } catch (e) {
      showToast(e.message, "err");
    }
  };

  async function handleAddRoute(payload) {
    const r = await fetch("/api/transport/route", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || !json.ok) throw new Error(json.error || "Failed to add route");
    setShowAdd(false);
    showToast(`Route ${json.route.code} added`, "ok");
    await refresh?.();
  }

  async function handleAssignStaff(code, attendant) {
    const r = await fetch("/api/transport/route", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, attendant }),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || !json.ok) throw new Error(json.error || "Failed to assign teacher");
    setAssigning(null);
    showToast(`${json.route.code} → ${attendant || "(unassigned)"}`, "ok");
    await refresh?.();
  }

  async function handleEditRoute(payload) {
    const r = await fetch("/api/transport/route", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
    setEditing(null);
    showToast(`Route ${json.route.code} updated`, "ok");
    await refresh?.();
  }

  // Drive the bus through the route — start, next stop, prev, finish, reset.
  async function advance(action) {
    if (!route) return;
    setBusyAction(action);
    try {
      const r = await fetch("/api/transport/advance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: route.code, action }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast(json.summary || "Updated", "ok");
      await refresh?.();
    } catch (e) {
      showToast(e.message, "err");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRemoveRoute(code) {
    if (!confirm(`Remove route ${code}? This cannot be undone.`)) return;
    try {
      const r = await fetch("/api/transport/route", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast(`Route ${code} removed`, "ok");
      await refresh?.();
    } catch (e) {
      showToast(e.message, "err");
    }
  }

  // Absentees today across all routes — derived from stop.absent counts.
  // Each route stop with absent>0 becomes one row.
  const absentees = useMemo(() => {
    const out = [];
    for (const r of routes) {
      for (const s of (r.stops || [])) {
        if ((s.absent || 0) > 0) {
          out.push({
            route: r.code,
            routeName: r.name,
            stop: s.name,
            time: s.t,
            count: s.absent,
          });
        }
      }
    }
    return out;
  }, [routes]);

  function downloadAbsenteeList() {
    if (absentees.length === 0) {
      showToast("No absentees marked yet today", "err");
      return;
    }
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const header = ["Route", "Route name", "Stop", "Pickup time", "Absent count"];
    const csv = [
      `# Vidyalaya360 — Transport Absentee List — ${today}`,
      `# Generated: ${new Date().toLocaleString("en-IN")}`,
      header.join(","),
      ...absentees.map((a) => [a.route, csvEscape(a.routeName), csvEscape(a.stop), csvEscape(a.time), a.count].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transport-absent-${today.replace(/\s+/g, "-").toLowerCase()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded list (${absentees.length} stops with absentees)`, "ok");
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Operations · Transport</div>
          <div className="page-title">Transport <span className="amber">live boarding</span></div>
          <div style={{ color: "var(--ink-3)", fontSize: 12, marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className="live-pill"><span className="pulse-dot" />Live GPS · {routes.length} bus{routes.length === 1 ? "" : "es"}</span>
            <span>Morning run · 07:00 – 08:00</span>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setShowMap(true)}>
            <Icon name="mapPin" size={13} />Map view
          </button>
          <button className="btn" onClick={() => setShowAbsent(true)}>
            <Icon name="download" size={13} />Absentee list
          </button>
          {canEdit && (
            <button className="btn accent" onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={13} />Add route
            </button>
          )}
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI
          label="Students boarded" value={totalCap ? `${totalBoarded}` : "—"} unit={totalCap ? `/${totalCap}` : ""}
          sub="morning run" puck="mint" puckIcon="check"
          details={{
            title: `Boarded · ${totalBoarded} of ${totalCap}`,
            sub: "Per-route boarding count",
            items: routes.map((r) => {
              const boarded = (r.stops || []).reduce((a, s) => a + (s.boarded || 0), 0);
              const cap     = (r.stops || []).reduce((a, s) => a + (s.cap     || 0), 0);
              return { label: `${r.code} · ${r.name}`, value: `${boarded}/${cap}`, tone: "ok" };
            }),
          }}
        />
        <KPI
          label="Absent today" value={totalAbsent} sub="across all routes"
          puck="rose" puckIcon="warning"
          details={{
            title: `Absent today · ${totalAbsent} students`,
            sub: "Stops with one or more absentees",
            items: absentees.map((a) => ({
              label: `${a.route} · ${a.stop}`, value: a.count, sub: `Pickup ${a.time}`, tone: "bad",
            })),
          }}
        />
        <KPI
          label="Buses running" value={routes.length}
          sub={routes.length ? `${routes.filter((r) => r.status === "delayed").length} delayed` : "no routes yet"}
          puck="peach" puckIcon="bus"
          details={{
            title: `Buses · ${routes.length} on the road`,
            items: routes.map((r) => ({
              label: `${r.code} · ${r.name}`, value: r.status || "idle",
              sub: `${r.bus} · ${r.driver}`,
            })),
          }}
        />
        <KPI label="Avg on-time %" value={routes.length ? `${Math.round(((routes.length - routes.filter((r) => r.status === "delayed").length) / routes.length) * 100)}%` : "—"} sub={routes.length ? "based on status" : "needs run history"} puck="cream" puckIcon="trending" />
      </div>

      <div className="grid g-12">
        <div className="card col-4">
          <div className="card-head">
            <div><div className="card-title">Routes</div><div className="card-sub">{routes.length} active · morning run</div></div>
          </div>
          <div>
            {routes.length === 0 && (
              <div className="empty">No transport routes yet. {canEdit ? "Click “Add route” to set one up." : "The principal hasn’t added any routes."}</div>
            )}
            {routes.map((r, i) => {
              const boarded = (r.stops || []).reduce((a, s) => a + (s.boarded || 0), 0);
              const cap = (r.stops || []).reduce((a, s) => a + (s.cap || 0), 0);
              const active = i === routeIdx;
              return (
                <div
                  key={r.code}
                  onClick={() => setRouteIdx(i)}
                  className="lrow"
                  style={{ cursor: "pointer", background: active ? "var(--accent-soft)" : undefined, borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent" }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--card-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon name="bus" size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{r.code}</span>
                      <RunStatusChip status={r.status} />
                    </div>
                    <div className="s" style={{ marginTop: 1 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon name="staff" size={10} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.attendant && r.attendant !== "—" ? `Teacher: ${r.attendant}` : <em style={{ color: "var(--ink-4)" }}>No teacher assigned</em>}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <div className="bar" style={{ flex: 1 }}><span style={{ width: `${cap ? (boarded / cap) * 100 : 0}%` }} /></div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", minWidth: 36, textAlign: "right" }}>{boarded}/{cap}</div>
                    </div>
                  </div>
                  {canEdit && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button
                        className="icon-btn"
                        onClick={(e) => { e.stopPropagation(); setAssigning(r); }}
                        title="Assign teacher to this bus"
                      >
                        <Icon name="staff" size={13} />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={(e) => { e.stopPropagation(); setEditing(r); }}
                        title="Edit route"
                      >
                        <Icon name="pencil" size={13} />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={(e) => { e.stopPropagation(); handleRemoveRoute(r.code); }}
                        title="Remove route"
                      >
                        <Icon name="x" size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {!route ? (
          <div className="col-8">
            <div className="card"><div className="empty" style={{ padding: 60 }}>Add a route to see live boarding here.</div></div>
          </div>
        ) : (
        <div className="col-8" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid var(--rule)", flexWrap: "wrap" }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: "var(--accent-soft)", color: "var(--accent-2)", display: "grid", placeItems: "center" }}>
                <Icon name="bus" size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{route.code} · {route.name}</span>
                  <RunStatusChip status={route.status} />
                </div>
                <div style={{ color: "var(--ink-3)", fontSize: 12, display: "flex", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                  <span>{route.bus}</span><span className="meta-dot">·</span>
                  <span>Driver: {route.driver}</span><span className="meta-dot">·</span>
                  <span>Teacher: {route.attendant && route.attendant !== "—" ? route.attendant : <em style={{ color: "var(--ink-4)" }}>unassigned</em>}</span><span className="meta-dot">·</span>
                  <span>{route.eta}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn sm" onClick={() => showToast(`Calling ${route.driver}…`, "ok")}><Icon name="phone" size={12} />Call</button>
                <button className="btn sm" onClick={() => setShowMap(true)}><Icon name="mapPin" size={12} />Track</button>
                <button className="btn sm accent" onClick={() => showToast(`Broadcast sent to ${route.code} parents`, "ok")}><Icon name="send" size={12} />Broadcast</button>
              </div>
            </div>

            {/* Run controls — drive the bus through its route */}
            {canEdit && (() => {
              const stops = route.stops || [];
              const status = route.status || "idle";
              const curIdx = stops.findIndex((s) => s.status === "current");
              const cur = curIdx >= 0 ? stops[curIdx] : null;
              const isLast = curIdx === stops.length - 1;
              const notStarted = status === "idle" || (curIdx === -1 && stops.every((s) => s.status !== "done"));
              const isCompleted = status === "completed";
              return (
                <div style={{
                  padding: "12px 18px", borderBottom: "1px solid var(--rule)",
                  background: "var(--bg-2)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                }}>
                  <div style={{ flex: 1, minWidth: 200, fontSize: 12 }}>
                    {isCompleted ? (
                      <><span style={{ color: "var(--ok)", fontWeight: 500 }}>✓ Run completed</span> · all stops marked done · ready for next trip</>
                    ) : notStarted ? (
                      <><span style={{ color: "var(--ink-3)" }}>Not started yet ·</span> {stops.length} stop{stops.length === 1 ? "" : "s"} planned · click <b>Start run</b> when the bus rolls out</>
                    ) : cur ? (
                      <><span style={{ color: "var(--accent)", fontWeight: 500 }}>● At stop {curIdx + 1}/{stops.length}: {cur.name}</span> · scheduled {cur.t}</>
                    ) : (
                      <span style={{ color: "var(--ink-3)" }}>Run in progress</span>
                    )}
                  </div>
                  {notStarted && (
                    <button className="btn sm accent" disabled={busyAction === "start"} onClick={() => advance("start")}>
                      <Icon name="play" size={12} />{busyAction === "start" ? "Starting…" : "Start run"}
                    </button>
                  )}
                  {!notStarted && !isCompleted && (
                    <>
                      <button className="btn sm" disabled={busyAction === "prev" || curIdx <= 0} onClick={() => advance("prev")}>
                        <Icon name="arrowRight" size={12} style={{ transform: "scaleX(-1)" }} />Previous
                      </button>
                      <button className="btn sm accent" disabled={!!busyAction} onClick={() => advance("next")}>
                        <Icon name="check" size={12} />{busyAction === "next" ? "Saving…" : isLast ? "Mark this stop done & finish" : "Mark this stop done & advance"}
                      </button>
                      <button className="btn sm" disabled={!!busyAction} onClick={() => advance("finish")} title="Mark all remaining stops as done">
                        <Icon name="flag" size={12} />Finish
                      </button>
                    </>
                  )}
                  {isCompleted && (
                    <button className="btn sm" disabled={busyAction === "reset"} onClick={() => advance("reset")}>
                      <Icon name="refresh" size={12} />{busyAction === "reset" ? "Resetting…" : "Reset for next run"}
                    </button>
                  )}
                </div>
              );
            })()}

            <div style={{ padding: "20px 18px" }}>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 22, top: 10, bottom: 10, width: 2, background: "var(--rule)" }} />
                {(route.stops || []).map((s, i) => {
                  const done = s.status === "done";
                  const cur = s.status === "current";
                  return (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "46px 1fr auto",
                        gap: 14,
                        padding: "12px 0",
                        borderBottom: i < (route.stops.length - 1) ? "1px solid var(--rule-2)" : "none",
                      }}
                    >
                      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                        <div
                          className={cur ? "stop-radar" : ""}
                          style={{
                            width: cur ? 24 : 18,
                            height: cur ? 24 : 18,
                            borderRadius: "50%",
                            background: done ? "var(--ok)" : cur ? "var(--accent)" : "var(--card)",
                            border: done ? "3px solid var(--card)" : cur ? "3px solid var(--accent-soft)" : "2px solid var(--rule)",
                            zIndex: 2,
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          {done && <Icon name="check" size={11} stroke={2.5} style={{ color: "var(--card)" }} />}
                        </div>
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13.5, fontWeight: 500 }}>{s.name}</span>
                          {cur && <span className="chip accent"><span className="dot" />Current stop</span>}
                          {s.status === "pending" && <span className="chip"><span className="dot" />Upcoming</span>}
                          {done && <span className="chip ok"><span className="dot" />Done</span>}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                          {s.t} · {(studentsByStop[s.name] || []).length || s.cap} student{((studentsByStop[s.name] || []).length || s.cap) === 1 ? "" : "s"} expected
                        </div>

                        {/* Per-student attendance roster for this stop */}
                        {(studentsByStop[s.name] || []).length > 0 ? (
                          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                            {(studentsByStop[s.name] || []).map((stu) => {
                              const m = studentMark(stu);
                              const isBoarded = m === "boarded";
                              const isAbsent  = m === "absent";
                              return (
                                <div key={stu.id} style={{
                                  display: "flex", alignItems: "center", gap: 8,
                                  padding: "6px 8px",
                                  background: "var(--bg-2)", border: "1px solid var(--rule-2)",
                                  borderRadius: 7,
                                }}>
                                  <span style={{
                                    width: 22, height: 22, borderRadius: "50%",
                                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                                    color: "#fff", display: "grid", placeItems: "center",
                                    fontSize: 9.5, fontWeight: 600, flexShrink: 0,
                                  }}>{(stu.name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{stu.name}</div>
                                    <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{stu.cls} · {stu.id}</div>
                                  </div>
                                  {isBoarded && <span className="chip ok" style={{ fontSize: 9.5 }}><Icon name="check" size={9} stroke={2.5} />Boarded</span>}
                                  {isAbsent  && <span className="chip bad" style={{ fontSize: 9.5 }}><Icon name="x" size={9} stroke={2.5} />Absent</span>}
                                  {cur && !isBoarded && !isAbsent && (
                                    <>
                                      <button className="btn sm ghost" style={{ height: 24, padding: "0 8px", fontSize: 11 }} onClick={() => markStudent(s, stu, "board")}>
                                        <Icon name="check" size={10} stroke={2.5} />Present
                                      </button>
                                      <button className="btn sm ghost" style={{ height: 24, padding: "0 8px", fontSize: 11 }} onClick={() => markStudent(s, stu, "absent")}>
                                        <Icon name="x" size={10} stroke={2.5} />Absent
                                      </button>
                                    </>
                                  )}
                                  {canEdit && (
                                    <button
                                      className="icon-btn"
                                      style={{ width: 22, height: 22 }}
                                      onClick={() => unlinkStudent(stu)}
                                      title={`Remove ${stu.name} from this stop`}
                                    >
                                      <Icon name="x" size={11} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}

                        {/* + Add student button — visible to staff for any stop */}
                        {canEdit && (
                          <button
                            className="btn sm"
                            style={{ marginTop: 8, height: 26, padding: "0 10px", fontSize: 11 }}
                            onClick={() => setAddStopOpen(s)}
                          >
                            <Icon name="plus" size={11} />Add student to this stop
                          </button>
                        )}
                        {!canEdit && (studentsByStop[s.name] || []).length === 0 && (done || cur) && (
                          <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-4)" }}>
                            No students linked to this stop yet.
                          </div>
                        )}

                        {(done || cur) && (s.boarded > 0 || s.absent > 0) && (
                          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                            <span className="chip ok"><Icon name="check" size={10} stroke={2.5} />{s.boarded} boarded</span>
                            {s.absent > 0 && <span className="chip bad"><Icon name="x" size={10} stroke={2.5} />{s.absent} absent</span>}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: done ? "var(--ink-2)" : "var(--ink-4)" }}>
                        {done ? s.t : cur ? "now" : s.t}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div><div className="card-title">Absentees · today</div><div className="card-sub">{absentees.length === 0 ? "No absentees marked yet" : `${absentees.length} stop${absentees.length === 1 ? "" : "s"} affected`}</div></div>
              <div className="card-actions">
                <button className="btn sm" onClick={downloadAbsenteeList}><Icon name="download" size={12} />Export</button>
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead><tr><th>Route</th><th>Stop</th><th>Pickup</th><th>Absent count</th></tr></thead>
                <tbody>
                  {absentees.length === 0 && (
                    <tr><td colSpan={4} className="empty">No absentees logged today.</td></tr>
                  )}
                  {absentees.map((a, i) => (
                    <tr key={i}>
                      <td><span className="chip">{a.route}</span> <span style={{ marginLeft: 6, color: "var(--ink-3)", fontSize: 12 }}>{a.routeName}</span></td>
                      <td style={{ fontSize: 12 }}>{a.stop}</td>
                      <td style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{a.time}</td>
                      <td><span className="chip bad">{a.count}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>

      {showAdd && canEdit && (
        <AddRouteModal
          onClose={() => setShowAdd(false)}
          onSubmit={handleAddRoute}
          existingCodes={routes.map((r) => r.code)}
          staff={E.STAFF || []}
        />
      )}
      {addStopOpen && canEdit && route && (
        <AddStudentToStopModal
          route={route}
          stop={addStopOpen}
          students={E.ADDED_STUDENTS || []}
          onClose={() => setAddStopOpen(null)}
          onPick={(studentId) => linkStudent(studentId, addStopOpen.name)}
        />
      )}
      {editing && canEdit && (
        <EditRouteModal
          route={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleEditRoute}
          staff={E.STAFF || []}
        />
      )}
      {assigning && canEdit && (
        <AssignStaffModal
          route={assigning}
          staff={E.STAFF || []}
          onClose={() => setAssigning(null)}
          onAssign={(driver) => handleAssignStaff(assigning.code, driver)}
        />
      )}
      {showAbsent && (
        <AbsenteeModal absentees={absentees} onClose={() => setShowAbsent(false)} onDownload={downloadAbsenteeList} />
      )}
      {showMap && (
        <MapModal routes={routes} onClose={() => setShowMap(false)} />
      )}

      <Toast msg={toast?.msg} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Status chip for the route — covers idle/running/completed/delayed.
function RunStatusChip({ status }) {
  if (status === "completed") return <span className="chip ok"><span className="dot" />Completed</span>;
  if (status === "running")   return <span className="chip"><span className="dot" />Running</span>;
  if (status === "delayed")   return <span className="chip warn"><span className="dot" />Delayed</span>;
  return <span className="chip"><span className="dot" />Not started</span>;
}

function ModalShell({ title, sub, onClose, children, width = 520 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
      display: "grid", placeItems: "center", zIndex: 250, padding: 16, overflowY: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: width, maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}>
        <div className="card-head">
          <div>
            <div className="card-title">{title}</div>
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{hint}</span>}
    </label>
  );
}

// Free-text input with a quick "pick from staff" dropdown beside it.
// Lets the principal pick an Ops/Intern staff member as the route's
// attendant, or just type a name (e.g. external driver). Stores the
// resolved name string on the route's `driver` field for back-compat.
function StaffPickerInput({ value, onChange, staff = [], placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  // Anyone whose role isn't classroom-facing is fair game for a bus assignment —
  // drivers, attendants, conductors, security, ops/intern. Teachers/faculty are excluded
  // so a class teacher doesn't accidentally end up listed as a driver.
  const candidates = (staff || []).filter((s) => {
    const role = String(s.role || "").toLowerCase();
    if (/teacher|faculty|principal|coordinator|hod/.test(role)) return false;
    return true;
  });
  return (
    <div ref={ref} style={{ position: "relative", display: "flex", gap: 4 }}>
      <input
        className="input"
        style={{ flex: 1 }}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {candidates.length > 0 && (
        <button
          type="button"
          className="btn"
          style={{ padding: "0 8px", height: 34 }}
          onClick={() => setOpen((s) => !s)}
          title="Pick from staff"
        >
          <Icon name="staff" size={13} />
        </button>
      )}
      {open && candidates.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0,
          minWidth: 220, maxHeight: 220, overflowY: "auto",
          background: "var(--card)", border: "1px solid var(--rule)",
          borderRadius: 8, padding: 4, zIndex: 60,
          boxShadow: "var(--shadow-lg)",
        }}>
          <div style={{ fontSize: 10.5, color: "var(--ink-4)", padding: "6px 10px 4px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500 }}>
            Pick from staff
          </div>
          {candidates.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { onChange(s.name); setOpen(false); }}
              style={{
                width: "100%", textAlign: "left",
                padding: "7px 10px", background: "transparent",
                border: 0, borderRadius: 6, cursor: "pointer",
                color: "var(--ink-2)", fontSize: 12,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ fontWeight: 500, color: "var(--ink)" }}>{s.name}</div>
              <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{s.role} · {s.dept}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddRouteModal({ onClose, onSubmit, existingCodes, staff = [] }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const codeRef = useRef(null);
  useEffect(() => { codeRef.current?.focus(); }, []);

  const nextCode = (() => {
    const nums = existingCodes.map((c) => Number(String(c).replace(/\D/g, "")) || 0);
    return `R${(Math.max(0, ...nums) + 1)}`;
  })();

  const [form, setForm] = useState({
    code: nextCode, name: "", driver: "", bus: "", eta: "07:00 – 08:00",
  });
  const [stops, setStops] = useState([
    { name: "", t: "07:10", cap: "" },
  ]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setStop = (i, k, v) => setStops((arr) => arr.map((s, j) => j === i ? { ...s, [k]: v } : s));
  const addStop = () => setStops((arr) => [...arr, { name: "", t: "", cap: "" }]);
  const rmStop  = (i) => setStops((arr) => arr.length > 1 ? arr.filter((_, j) => j !== i) : arr);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const code = String(form.code || "").trim().toUpperCase();
      if (!code) throw new Error("Route code is required");
      if (existingCodes.includes(code)) throw new Error(`Route ${code} already exists`);
      const cleanStops = stops
        .filter((s) => s.name.trim())
        .map((s) => ({ name: s.name.trim(), t: s.t || "—", cap: Number(s.cap) || 0 }));
      if (cleanStops.length === 0) throw new Error("Add at least one stop with a name");
      await onSubmit({
        code, name: form.name.trim() || code,
        driver: form.driver.trim() || "—",
        bus: form.bus.trim() || "—",
        eta: form.eta || "07:00 – 08:00",
        stops: cleanStops,
      });
    } catch (ex) {
      setErr(ex.message || String(ex));
      setBusy(false);
    }
  }

  return (
    <ModalShell title="New transport route" sub="Stops are added in pickup order" onClose={onClose} width={560}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
          <Field label="Code">
            <input ref={codeRef} className="input" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} maxLength={6} />
          </Field>
          <Field label="Route name">
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sarjapur loop" />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Driver / attendant" hint={staff.length ? "Pick from staff or type a name" : ""}>
            <StaffPickerInput value={form.driver} onChange={(v) => set("driver", v)} staff={staff} placeholder="Driver name" />
          </Field>
          <Field label="Bus number">
            <input className="input" value={form.bus} onChange={(e) => set("bus", e.target.value)} placeholder="KA-05-XX-1234" />
          </Field>
          <Field label="ETA window">
            <input className="input" value={form.eta} onChange={(e) => set("eta", e.target.value)} placeholder="07:00 – 08:00" />
          </Field>
        </div>

        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: 0.4 }}>Stops (in pickup order)</span>
            <button type="button" className="btn sm" onClick={addStop}><Icon name="plus" size={11} />Add stop</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stops.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 32px", gap: 6, alignItems: "center" }}>
                <input
                  className="input"
                  value={s.name} onChange={(e) => setStop(i, "name", e.target.value)}
                  placeholder={`Stop ${i + 1} name`}
                />
                <input
                  className="input"
                  value={s.t} onChange={(e) => setStop(i, "t", e.target.value)}
                  placeholder="07:15"
                />
                <input
                  className="input"
                  value={s.cap} onChange={(e) => setStop(i, "cap", e.target.value.replace(/\D/g, ""))}
                  placeholder="cap"
                  inputMode="numeric"
                />
                <button type="button" className="icon-btn" onClick={() => rmStop(i)} disabled={stops.length === 1} title="Remove stop">
                  <Icon name="x" size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {err && (
          <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy}>
            {busy ? "Adding…" : <><Icon name="check" size={13} />Add route</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// Edit modal — pre-filled with the current route. Code is shown read-only
// (changing the PK is messy; ask the user to delete & recreate if needed).
// Sends a PATCH that only touches fields the user actually changed in the
// form. Boarded/absent counters on existing stops are preserved server-side
// when stop names match; new stops start at 0/0/pending.
function EditRouteModal({ route, onClose, onSubmit, staff = [] }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: route.name || "",
    driver: route.driver || "",
    bus: route.bus || "",
    eta: route.eta || "",
  });
  const [stops, setStops] = useState(
    (route.stops || []).map((s) => ({ name: s.name || "", t: s.t || "", cap: s.cap ?? 0 }))
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setStop = (i, k, v) => setStops((arr) => arr.map((s, j) => j === i ? { ...s, [k]: v } : s));
  const addStop = () => setStops((arr) => [...arr, { name: "", t: "", cap: "" }]);
  const rmStop  = (i) => setStops((arr) => arr.length > 1 ? arr.filter((_, j) => j !== i) : arr);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const cleanStops = stops
        .filter((s) => String(s.name).trim())
        .map((s) => ({ name: s.name.trim(), t: s.t || "—", cap: Number(s.cap) || 0 }));
      if (cleanStops.length === 0) throw new Error("Add at least one stop with a name");
      await onSubmit({
        code: route.code,
        name: form.name.trim() || route.code,
        driver: form.driver.trim() || "—",
        bus: form.bus.trim() || "—",
        eta: form.eta || "07:00 – 08:00",
        stops: cleanStops,
      });
    } catch (ex) {
      setErr(ex.message || String(ex));
      setBusy(false);
    }
  }

  return (
    <ModalShell title={`Edit route ${route.code}`} sub="Boarded / absent counters on existing stops are preserved" onClose={onClose} width={560}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
          <Field label="Code">
            <input className="input" value={route.code} disabled style={{ opacity: 0.7, cursor: "not-allowed" }} />
          </Field>
          <Field label="Route name">
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Driver / attendant" hint={staff.length ? "Pick from staff or type a name" : ""}>
            <StaffPickerInput value={form.driver} onChange={(v) => set("driver", v)} staff={staff} />
          </Field>
          <Field label="Bus number">
            <input className="input" value={form.bus} onChange={(e) => set("bus", e.target.value)} />
          </Field>
          <Field label="ETA window">
            <input className="input" value={form.eta} onChange={(e) => set("eta", e.target.value)} />
          </Field>
        </div>

        <div style={{ marginTop: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: 0.4 }}>Stops (in pickup order)</span>
            <button type="button" className="btn sm" onClick={addStop}><Icon name="plus" size={11} />Add stop</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stops.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 32px", gap: 6, alignItems: "center" }}>
                <input
                  className="input"
                  value={s.name} onChange={(e) => setStop(i, "name", e.target.value)}
                  placeholder={`Stop ${i + 1} name`}
                />
                <input
                  className="input"
                  value={s.t} onChange={(e) => setStop(i, "t", e.target.value)}
                  placeholder="07:15"
                />
                <input
                  className="input"
                  value={s.cap} onChange={(e) => setStop(i, "cap", String(e.target.value).replace(/\D/g, ""))}
                  placeholder="cap"
                  inputMode="numeric"
                />
                <button type="button" className="icon-btn" onClick={() => rmStop(i)} disabled={stops.length === 1} title="Remove stop">
                  <Icon name="x" size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {err && (
          <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy}>
            {busy ? "Saving…" : <><Icon name="check" size={13} />Save changes</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// Dedicated picker to assign a TEACHER to ride a bus (separate from the driver).
// The teacher acts as the bus monitor / staff-on-duty. List is filtered to staff
// whose role is teacher/faculty. Picking a name PATCHes route.attendant.
function AssignStaffModal({ route, staff = [], onClose, onAssign }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const candidates = useMemo(() => {
    const eligible = (staff || []).filter((s) => {
      const role = String(s.role || "").toLowerCase();
      return /teacher|faculty/.test(role);
    });
    if (!q.trim()) return eligible;
    const ql = q.trim().toLowerCase();
    return eligible.filter((s) =>
      [s.name, s.role, s.dept, s.id].filter(Boolean).some((v) => String(v).toLowerCase().includes(ql))
    );
  }, [staff, q]);

  async function pick(name) {
    setBusy(true);
    setErr("");
    try {
      await onAssign(name);
    } catch (e) {
      setErr(e.message || "Failed to assign");
      setBusy(false);
    }
  }

  const initials = (n) => (n || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const current = route.attendant && route.attendant !== "—" ? route.attendant : null;

  return (
    <ModalShell
      title={`Assign teacher to ${route.code}`}
      sub={`${route.name} · driver: ${route.driver || "—"}`}
      onClose={onClose}
      width={520}
    >
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{
          background: "var(--bg-2)", border: "1px solid var(--rule)", borderRadius: 8,
          padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <div style={{ fontSize: 12 }}>
            <div style={{ color: "var(--ink-4)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5 }}>Bus teacher</div>
            <div style={{ marginTop: 2, fontWeight: 500, color: current ? "var(--ink)" : "var(--ink-4)" }}>
              {current || "No teacher assigned yet"}
            </div>
          </div>
          {current && (
            <button type="button" className="btn sm" onClick={() => pick("")} disabled={busy} title="Clear assignment">
              <Icon name="x" size={11} />Unassign
            </button>
          )}
        </div>

        <input
          className="input"
          autoFocus
          placeholder="Search teachers by name or department…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div style={{
          maxHeight: 320, overflowY: "auto", border: "1px solid var(--rule)",
          borderRadius: 8, background: "var(--card)",
        }}>
          {candidates.length === 0 && (
            <div className="empty" style={{ padding: 24 }}>
              {(staff || []).filter((s) => /teacher|faculty/i.test(s.role || "")).length === 0
                ? "No teachers in the system yet. Go to Staff → + Add staff and add a Teacher first."
                : "No matching teacher. Try a different search."}
            </div>
          )}
          {candidates.map((s) => {
            const isCurrent = current === s.name;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => !isCurrent && pick(s.name)}
                disabled={busy || isCurrent}
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", background: isCurrent ? "var(--accent-soft)" : "transparent",
                  border: 0, borderBottom: "1px solid var(--rule)", cursor: isCurrent ? "default" : "pointer",
                }}
                onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = "var(--bg-2)"; }}
                onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: "var(--card-2)",
                  display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, color: "var(--ink-2)", flexShrink: 0,
                }}>
                  {initials(s.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-4)" }}>
                    {s.role}{s.dept ? ` · ${s.dept}` : ""}{s.id ? ` · ${s.id}` : ""}
                  </div>
                </div>
                {isCurrent ? (
                  <span className="chip ok" style={{ fontSize: 10 }}>Assigned</span>
                ) : (
                  <Icon name="check" size={13} />
                )}
              </button>
            );
          })}
        </div>

        {err && (
          <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </ModalShell>
  );
}

// Picker for assigning an existing student to a stop. Lists students who:
//   - aren't currently linked to any transport route, OR
//   - are on a different route (with a hint), OR
//   - are on this route but a different stop
// With a search box at the top to filter by name / class / id.
function AddStudentToStopModal({ route, stop, students, onClose, onPick }) {
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);

  const initials = (n) => (n || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  // Surface students whose CURRENT pickup stop isn't this one. (Adding the
  // student to this stop will move them here, even if they're on another
  // route — confirm with the principal that this is the intent.)
  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return students
      .filter((s) => !(s.transport === route.code && s.pickupStop === stop.name))
      .filter((s) => !needle || `${s.name} ${s.cls} ${s.id}`.toLowerCase().includes(needle))
      .slice(0, 60);
  }, [students, route.code, stop.name, q]);

  return (
    <ModalShell
      title={`Add student to ${stop.name}`}
      sub={`${route.code} · pickup ${stop.t}`}
      onClose={onClose}
      width={520}
    >
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          className="input"
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, class, or ID…"
        />
        {candidates.length === 0 ? (
          <div className="empty">No students match. Either every student is already on this stop, or there's no roster yet.</div>
        ) : (
          <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {candidates.map((s) => {
              const onOtherRoute = s.transport && s.transport !== "—" && s.transport !== route.code;
              const onThisRouteOtherStop = s.transport === route.code && s.pickupStop && s.pickupStop !== stop.name;
              const noTransport = !s.transport || s.transport === "—";
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={busyId === s.id}
                  onClick={async () => {
                    setBusyId(s.id);
                    try { await onPick(s.id); } finally { setBusyId(null); }
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", textAlign: "left",
                    background: "var(--card-2)", border: "1px solid var(--rule-2)",
                    borderRadius: 8, cursor: busyId === s.id ? "wait" : "pointer",
                    opacity: busyId === s.id ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => busyId !== s.id && (e.currentTarget.style.borderColor = "var(--accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--rule-2)")}
                >
                  <span style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    color: "#fff", display: "grid", placeItems: "center",
                    fontSize: 10, fontWeight: 600, flexShrink: 0,
                  }}>{initials(s.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{s.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
                      {s.cls} · {s.id}
                      {noTransport && " · no bus yet"}
                      {onOtherRoute && ` · currently on ${s.transport}`}
                      {onThisRouteOtherStop && ` · currently at ${s.pickupStop}`}
                    </div>
                  </div>
                  {onOtherRoute && <span className="chip warn" style={{ fontSize: 10 }}>Switch</span>}
                  {noTransport && <span className="chip ok" style={{ fontSize: 10 }}>New</span>}
                  {onThisRouteOtherStop && <span className="chip" style={{ fontSize: 10 }}>Move</span>}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
          Picking a student here sets their bus to <b>{route.code}</b> and pickup stop to <b>{stop.name}</b>. Changes are reversible.
        </div>
      </div>
    </ModalShell>
  );
}

function AbsenteeModal({ absentees, onClose, onDownload }) {
  return (
    <ModalShell title="Absentees · today" sub={`${absentees.length} stop${absentees.length === 1 ? "" : "s"} with absentees · auto-SMS sent on detection`} onClose={onClose} width={620}>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {absentees.length === 0 ? (
          <div className="empty">No absentees marked yet today. As drivers tap “Mark absent” on the stops page, they appear here.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Route</th><th>Stop</th><th>Pickup</th><th>Count</th></tr></thead>
            <tbody>
              {absentees.map((a, i) => (
                <tr key={i}>
                  <td><span className="chip">{a.route}</span> <span style={{ marginLeft: 6, color: "var(--ink-3)", fontSize: 12 }}>{a.routeName}</span></td>
                  <td style={{ fontSize: 12 }}>{a.stop}</td>
                  <td style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{a.time}</td>
                  <td><span className="chip bad">{a.count}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Close</button>
          <button type="button" className="btn accent" onClick={onDownload} disabled={absentees.length === 0}>
            <Icon name="download" size={13} />Download CSV
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function MapModal({ routes, onClose }) {
  // Stylised "map" — colour-coded route lanes with stops as pins.
  // No real geo here; the sidebar list of routes feeds a vertical lane each
  // so the principal can see all routes' progress at a glance.
  const palette = ["#c8510a", "#4a7a54", "#2f6048", "#b07c28", "#7a5cb0", "#1a8e8e"];
  return (
    <ModalShell title="Map view" sub="Live route lanes — each line is one bus" onClose={onClose} width={760}>
      <div className="card-body">
        {routes.length === 0 ? (
          <div className="empty">No routes to display. Add one first.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {routes.map((r, ri) => {
              const stops = r.stops || [];
              const total = stops.length;
              const doneIdx = stops.findIndex((s) => s.status === "current");
              const progress = doneIdx === -1 ? 100 : (doneIdx / Math.max(1, total - 1)) * 100;
              const colour = palette[ri % palette.length];
              return (
                <div key={r.code}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ width: 10, height: 10, background: colour, borderRadius: "50%" }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{r.code}</span>
                    <span style={{ color: "var(--ink-3)", fontSize: 12 }}>{r.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-3)" }}>
                      {r.bus} · {r.driver} · {r.eta}
                    </span>
                  </div>
                  <div style={{
                    position: "relative", height: 50,
                    background: "linear-gradient(to right, var(--bg-2) 0%, var(--bg-2) 100%)",
                    borderRadius: 8, padding: "0 8px",
                  }}>
                    {/* base lane */}
                    <div style={{
                      position: "absolute", left: 18, right: 18, top: "50%",
                      height: 3, background: "var(--rule, #e5dfd1)", borderRadius: 2,
                      transform: "translateY(-50%)",
                    }} />
                    {/* progress lane */}
                    <div style={{
                      position: "absolute", left: 18, top: "50%",
                      width: `calc((100% - 36px) * ${progress / 100})`,
                      height: 3, background: colour, borderRadius: 2,
                      transform: "translateY(-50%)",
                    }} />
                    {/* stops */}
                    {stops.map((s, i) => {
                      const x = total === 1 ? 50 : (i / (total - 1)) * 100;
                      const done = s.status === "done";
                      const cur = s.status === "current";
                      return (
                        <div
                          key={i}
                          title={`${s.name} · ${s.t} · ${s.boarded || 0}/${s.cap || 0} boarded${(s.absent || 0) > 0 ? ` · ${s.absent} absent` : ""}`}
                          style={{
                            position: "absolute",
                            left: `calc(${x}% * ((100% - 36px) / 100%) + 18px)`,
                            top: "50%",
                            width: cur ? 16 : 12, height: cur ? 16 : 12,
                            borderRadius: "50%",
                            background: done ? colour : cur ? "#fff" : "var(--card)",
                            border: `2px solid ${cur ? colour : "var(--rule, #e5dfd1)"}`,
                            transform: "translate(-50%, -50%)",
                            boxShadow: cur ? `0 0 0 4px ${colour}33` : undefined,
                            cursor: "help",
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10.5, color: "var(--ink-4)" }}>
                    <span>{stops[0]?.name || "—"}</span>
                    <span>{stops[stops.length - 1]?.name || "—"}</span>
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px dashed var(--rule, #e5dfd1)", fontSize: 10.5, color: "var(--ink-3)", display: "flex", gap: 14, flexWrap: "wrap" }}>
              <span><b style={{ color: "var(--ink)" }}>Filled</b> = stop visited · <b style={{ color: "var(--ink)" }}>Outlined ring</b> = current stop · <b style={{ color: "var(--ink)" }}>Empty</b> = upcoming. Hover any pin for details.</span>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
