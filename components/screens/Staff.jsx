"use client";

import Icon from "../Icon";
import { KPI, AvatarChip, Ring } from "../ui";

export default function ScreenStaff({ E }) {
  const staff = [...E.STAFF].sort((a, b) => b.score - a.score);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">People · Performance</div>
          <div className="page-title">Staff & <span className="amber">Interns</span></div>
          <div className="page-sub">Performance · attendance · tasks · interns rotations</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="download" size={13} />Monthly report</button>
          <button className="btn accent"><Icon name="plus" size={13} />Add staff</button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Total staff" value="38" delta="+2" deltaDir="up" sub="32 teachers · 6 ops" puck="mint" puckIcon="staff" />
        <KPI label="Interns" value="7" delta="4 active" deltaDir="up" sub="this semester" puck="peach" puckIcon="users" />
        <KPI label="Avg performance" value="86" delta="+3 pts" deltaDir="up" sub="composite score" puck="cream" puckIcon="trending" />
        <KPI label="Low performers" value="1" delta="auto-flagged" deltaDir="down" sub="under review" puck="rose" puckIcon="warning" />
      </div>

      <div className="grid g-12">
        <div className="card col-8">
          <div className="card-head">
            <div><div className="card-title">Performance leaderboard</div><div className="card-sub">Score = 40% attendance + 40% tasks + 20% activity</div></div>
            <div className="card-actions">
              <div className="segmented">
                <button className="active">All</button>
                <button>Teachers</button>
                <button>Ops</button>
                <button>Interns</button>
              </div>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead><tr><th>#</th><th>Name</th><th>Role</th><th>Attendance</th><th>Tasks</th><th>Score</th><th>Status</th></tr></thead>
              <tbody>
                {staff.map((s, i) => (
                  <tr key={s.name}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)" }}>{String(i + 1).padStart(2, "0")}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <AvatarChip initials={s.avatar} />
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: "var(--ink-4)" }}>{s.dept}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{s.role}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="bar" style={{ width: 60 }}><span style={{ width: `${s.attendance}%`, background: s.attendance < 85 ? "var(--warn)" : "var(--ok)" }} /></div>
                        <span className="mono" style={{ fontSize: 11 }}>{s.attendance}%</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="bar" style={{ width: 60 }}><span style={{ width: `${s.tasks}%`, background: "var(--accent)" }} /></div>
                        <span className="mono" style={{ fontSize: 11 }}>{s.tasks}%</span>
                      </div>
                    </td>
                    <td><span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{s.score}</span></td>
                    <td>
                      {s.status === "top" && <span className="chip ok"><span className="dot" />Top performer</span>}
                      {s.status === "ok" && <span className="chip"><span className="dot" />On track</span>}
                      {s.status === "low" && <span className="chip bad"><span className="dot" />Needs review</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-4" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div className="card-head"><div><div className="card-title">Today&apos;s attendance</div></div></div>
            <div className="card-body" style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <Ring pct={92} label="35/38" sub="checked in" color="var(--ok)" size={92} stroke={10} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>On time</span><span className="mono">32</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Late</span><span className="mono" style={{ color: "var(--warn)" }}>3</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>On leave</span><span className="mono" style={{ color: "var(--ink-3)" }}>2</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Absent</span><span className="mono">1</span></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div><div className="card-title">Intern rotations</div><div className="card-sub">4 active · 3 completed</div></div>
            </div>
            <div>
              {[
                { n: "Kavya N.", cls: "Class 4", mentor: "Neha Kulkarni", weeks: 6, total: 12 },
                { n: "Rohit M.", cls: "Class 2", mentor: "Arun Joshi", weeks: 3, total: 12 },
                { n: "Swati B.", cls: "Class 7", mentor: "Vikram Rao", weeks: 10, total: 12 },
                { n: "Tanvi R.", cls: "Class 1", mentor: "Priya Shah", weeks: 2, total: 12 },
              ].map((it, i) => (
                <div key={i} className="lrow">
                  <AvatarChip initials={it.n.split(" ").map((n) => n[0]).join("")} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{it.n} · <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>{it.cls}</span></div>
                    <div className="s">Mentor: {it.mentor}</div>
                  </div>
                  <div style={{ width: 60 }}>
                    <div className="bar"><span style={{ width: `${(it.weeks / it.total) * 100}%` }} /></div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "right", marginTop: 2 }}>{it.weeks}/{it.total}w</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Alerts</div></div></div>
            <div>
              <div className="lrow">
                <div className="act-ico bad"><Icon name="warning" size={13} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5 }}>Arun Joshi flagged</div>
                  <div className="s">Attendance dropped below 80% · 14 days</div>
                </div>
              </div>
              <div className="lrow">
                <div className="act-ico warn"><Icon name="clock" size={13} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5 }}>3 contracts expiring</div>
                  <div className="s">HR auto-reminder queued for next week</div>
                </div>
              </div>
              <div className="lrow">
                <div className="act-ico info"><Icon name="calendar" size={13} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5 }}>Salary run · Apr 30</div>
                  <div className="s">₹12,48,000 · 38 staff · pre-approved</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
