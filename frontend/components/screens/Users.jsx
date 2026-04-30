"use client";

import Icon from "../Icon";
import { AvatarChip } from "../ui";

const ROLE_DESC = {
  "Super Admin": "Full trust-wide access incl. finance, users, audit.",
  "Principal": "Full access to their school · cannot edit trust settings.",
  "Academic Director": "Academic modules only · no finance writes.",
  "Accountant": "Finance modules · issue receipts · read-only students.",
  "Teacher": "Own classes + students · homework · messaging.",
  "Transport lead": "Routes, buses, drivers, stops, live boarding.",
  "Parent": "Their child(ren) only · fees, academics, messages.",
  "Intern": "Limited access under a mentor.",
};

export default function ScreenUsers({ E }) {
  const users = E.USERS || [];

  // Roll-up: count users per role from the live list
  const counts = users.reduce((m, u) => ({ ...m, [u.role]: (m[u.role] || 0) + 1 }), {});
  const rolesUsed = Object.keys(ROLE_DESC).map((role) => ({
    role,
    count: counts[role] || 0,
    desc: ROLE_DESC[role],
  }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Governance</div>
          <div className="page-title">Users <span className="amber">& roles</span></div>
          <div className="page-sub">{users.length} user account{users.length === 1 ? "" : "s"} across {Object.keys(counts).length || "—"} role{Object.keys(counts).length === 1 ? "" : "s"}.</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="download" size={13} />Export CSV</button>
          <button className="btn accent"><Icon name="plus" size={13} />Invite user</button>
        </div>
      </div>

      <div className="grid g-12" style={{ marginBottom: 18 }}>
        <div className="card col-8">
          <div className="card-head">
            <div><div className="card-title">Admin & staff</div><div className="card-sub">{users.length} on file</div></div>
            <div className="card-actions">
              <div className="input" style={{ display: "inline-flex", alignItems: "center", gap: 6, width: 200, padding: "0 10px" }}>
                <Icon name="search" size={13} style={{ color: "var(--ink-3)" }} />
                <input style={{ border: 0, background: "transparent", outline: "none", fontSize: 12, flex: 1 }} placeholder="Search name or email" />
              </div>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead><tr><th>User</th><th>Role</th><th>School</th><th>MFA</th><th>Last active</th><th></th></tr></thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan={6} className="empty">No users invited yet. Add the first one with “Invite user”.</td></tr>
                )}
                {users.map((u) => (
                  <tr key={u.id || u.email}>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <AvatarChip initials={u.name.split(" ").map((n) => n[0]).join("")} />
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: "var(--ink-4)" }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="chip">{u.role}</span></td>
                    <td style={{ fontSize: 12 }}>{u.school || "—"}</td>
                    <td>
                      {u.mfa
                        ? <span className="chip ok"><Icon name="check" size={10} />On</span>
                        : <span className="chip warn"><span className="dot" />Off</span>}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{u.lastSeen || u.last || "—"}</td>
                    <td><button className="icon-btn" style={{ width: 24, height: 24 }}><Icon name="more" size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card col-4">
          <div className="card-head">
            <div><div className="card-title">Roles</div><div className="card-sub">Edit permissions per role</div></div>
          </div>
          <div>
            {rolesUsed.map((r) => (
              <div className="lrow" key={r.role}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.role} <span style={{ color: "var(--ink-4)", fontWeight: 400, marginLeft: 4 }}>· {r.count}</span></div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{r.desc}</div>
                </div>
                <button className="btn sm ghost"><Icon name="chevronRight" size={11} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
