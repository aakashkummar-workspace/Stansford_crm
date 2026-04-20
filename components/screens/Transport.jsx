"use client";

import { useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip, StatusChip } from "../ui";

export default function ScreenTransport({ E, refresh }) {
  const [routeIdx, setRouteIdx] = useState(0);
  const routes = E.ROUTES;
  const route = routes[routeIdx];

  const allStops = routes.flatMap((r) => r.stops);
  const totalBoarded = allStops.reduce((a, s) => a + s.boarded, 0);
  const totalAbsent = allStops.reduce((a, s) => a + s.absent, 0);
  const totalCap = allStops.reduce((a, s) => a + s.cap, 0);

  const mark = async (stopName, action) => {
    await fetch("/api/transport/board", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: route.code, stopName, action }),
    });
    await refresh?.();
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Operations · Transport</div>
          <div className="page-title">Transport <span className="amber">live boarding</span></div>
          <div style={{ color: "var(--ink-3)", fontSize: 12, marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span className="live-pill"><span className="pulse-dot" />Live GPS · 3 buses</span>
            <span>Morning run · 07:00 – 08:00</span>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="mapPin" size={13} />Map view</button>
          <button className="btn"><Icon name="download" size={13} />Absentee list</button>
          <button className="btn accent"><Icon name="plus" size={13} />Add route</button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Students boarded" value={`${totalBoarded}`} unit={`/${totalCap}`} delta={`${totalCap ? Math.round((totalBoarded / totalCap) * 100) : 0}%`} deltaDir="up" sub="morning run" puck="mint" puckIcon="check" />
        <KPI label="Absent today" value={totalAbsent} delta="auto-SMS sent" deltaDir="down" sub="to parents" puck="rose" puckIcon="warning" />
        <KPI label="Buses running" value="3" delta="1 delayed" deltaDir="down" sub="Route R3 · 12 min late" puck="peach" puckIcon="bus" />
        <KPI label="Avg on-time %" value="92%" delta="+3%" deltaDir="up" sub="last 30 days" puck="cream" puckIcon="trending" />
      </div>

      <div className="grid g-12">
        <div className="card col-4">
          <div className="card-head">
            <div><div className="card-title">Routes</div><div className="card-sub">{routes.length} active · morning run</div></div>
          </div>
          <div>
            {routes.map((r, i) => {
              const boarded = r.stops.reduce((a, s) => a + s.boarded, 0);
              const cap = r.stops.reduce((a, s) => a + s.cap, 0);
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
                      <StatusChip status={r.status}>{r.status === "delayed" ? "Delayed" : "Running"}</StatusChip>
                    </div>
                    <div className="s" style={{ marginTop: 1 }}>{r.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <div className="bar" style={{ flex: 1 }}><span style={{ width: `${cap ? (boarded / cap) * 100 : 0}%` }} /></div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", minWidth: 36, textAlign: "right" }}>{boarded}/{cap}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-8" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, borderBottom: "1px solid var(--rule)", flexWrap: "wrap" }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: "var(--accent-soft)", color: "var(--accent-2)", display: "grid", placeItems: "center" }}>
                <Icon name="bus" size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{route.code} · {route.name}</span>
                  <StatusChip status={route.status}>{route.status === "delayed" ? "Delayed · 12 min" : "On route"}</StatusChip>
                </div>
                <div style={{ color: "var(--ink-3)", fontSize: 12, display: "flex", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
                  <span>{route.bus}</span><span className="meta-dot">·</span>
                  <span>Driver: {route.driver}</span><span className="meta-dot">·</span>
                  <span>{route.eta}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn sm"><Icon name="phone" size={12} />Call</button>
                <button className="btn sm"><Icon name="mapPin" size={12} />Track</button>
                <button className="btn sm accent"><Icon name="send" size={12} />Broadcast</button>
              </div>
            </div>

            <div style={{ padding: "20px 18px" }}>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 22, top: 10, bottom: 10, width: 2, background: "var(--rule)" }} />
                {route.stops.map((s, i) => {
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
                        borderBottom: i < route.stops.length - 1 ? "1px solid var(--rule-2)" : "none",
                      }}
                    >
                      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                        <div
                          style={{
                            width: cur ? 24 : 18,
                            height: cur ? 24 : 18,
                            borderRadius: "50%",
                            background: done ? "var(--ok)" : cur ? "var(--accent)" : "var(--card)",
                            border: done ? "3px solid var(--card)" : cur ? "3px solid var(--accent-soft)" : "2px solid var(--rule)",
                            boxShadow: cur ? "0 0 0 4px var(--accent-soft)" : "none",
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
                        </div>
                        <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                          {s.t} · {s.cap} students expected
                        </div>
                        {(done || cur) && s.cap > 0 && (
                          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                            <span className="chip ok"><Icon name="check" size={10} stroke={2.5} />{s.boarded} boarded</span>
                            {s.absent > 0 && <span className="chip bad"><Icon name="x" size={10} stroke={2.5} />{s.absent} absent</span>}
                            {cur && (
                              <>
                                <button className="btn sm ghost" onClick={() => mark(s.name, "board")} style={{ marginLeft: "auto" }}>
                                  <Icon name="check" size={11} />Board one
                                </button>
                                <button className="btn sm ghost" onClick={() => mark(s.name, "absent")}>
                                  <Icon name="warning" size={11} />Mark absent
                                </button>
                              </>
                            )}
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
              <div><div className="card-title">Absentees · today</div><div className="card-sub">Auto-SMS sent to parents on detection</div></div>
              <div className="card-actions"><button className="btn sm"><Icon name="send" size={12} />Re-notify</button></div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead><tr><th>Student</th><th>Class</th><th>Stop</th><th>Route</th><th>Parent notified</th></tr></thead>
                <tbody>
                  {[
                    { n: "Diya Singh", c: "6-A", s: "ITPL Junction", r: "R1", t: "07:25" },
                    { n: "Krish Verma", c: "4-A", s: "Brookefield Gate", r: "R1", t: "07:32" },
                    { n: "Shaurya Kapoor", c: "7-B", s: "HSR Sector 6", r: "R2", t: "07:19" },
                    { n: "Kabir Bose", c: "2-B", s: "Agara Lake", r: "R2", t: "07:27" },
                    { n: "Anaya Mehta", c: "5-A", s: "Domlur Bridge", r: "R3", t: "07:16" },
                  ].map((a, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <AvatarChip initials={a.n.split(" ").map((n) => n[0]).join("")} />
                          <span style={{ fontSize: 12.5, fontWeight: 500 }}>{a.n}</span>
                        </div>
                      </td>
                      <td><span className="chip">{a.c}</span></td>
                      <td style={{ fontSize: 12 }}>{a.s}</td>
                      <td><span className="chip info"><span className="dot" />{a.r}</span></td>
                      <td style={{ fontSize: 12, color: "var(--ink-3)" }}>
                        <span className="chip ok"><Icon name="whatsapp" size={10} />WhatsApp · {a.t}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
