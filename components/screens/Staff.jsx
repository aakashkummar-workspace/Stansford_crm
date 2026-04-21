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
        <KPI label="Total staff" value={staff.length} sub="all roles" puck="mint" puckIcon="staff" />
        <KPI label="Interns" value={staff.filter((s) => /intern/i.test(s.role)).length} sub="active" puck="peach" puckIcon="users" />
        <KPI label="Avg performance" value={staff.length ? Math.round(staff.reduce((a, s) => a + (s.score || 0), 0) / staff.length) : "—"} sub="composite score" puck="cream" puckIcon="trending" />
        <KPI label="Low performers" value={staff.filter((s) => s.status === "low").length} sub="needs review" puck="rose" puckIcon="warning" />
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
                {staff.length === 0 && (
                  <tr><td colSpan={7} className="empty">No staff added yet. Click “Add staff” to start.</td></tr>
                )}
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
            <div className="empty">Mark staff in/out to see today's check-in summary.</div>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Intern rotations</div></div></div>
            <div className="empty">No intern rotations set up yet.</div>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Alerts</div></div></div>
            <div className="empty">No alerts.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
