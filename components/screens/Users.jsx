"use client";

import Icon from "../Icon";
import { AvatarChip } from "../ui";

const USERS = [
  { name: "Rajesh Iyer", role: "Super Admin", school: "All 3", email: "rajesh@saraswati.org", mfa: true, last: "now", status: "active" },
  { name: "Rashmi Iyer", role: "Principal", school: "Chennai", email: "rashmi@saraswati.org", mfa: true, last: "2 min ago", status: "active" },
  { name: "Sanjay Mehta", role: "Academic Director", school: "Chennai", email: "sanjay@saraswati.org", mfa: true, last: "1 hr ago", status: "active" },
  { name: "Anita Deshmukh", role: "Teacher", school: "Chennai", email: "anita.d@saraswati.org", mfa: false, last: "Today", status: "active" },
  { name: "Sunita Pillai", role: "Accountant", school: "Chennai", email: "sunita@saraswati.org", mfa: true, last: "32 min ago", status: "active" },
  { name: "Vikram Rao", role: "Teacher", school: "Coimbatore", email: "vikram@saraswati.org", mfa: false, last: "Today", status: "active" },
  { name: "Neha Kulkarni", role: "Teacher", school: "Coimbatore", email: "neha@saraswati.org", mfa: true, last: "Today", status: "active" },
  { name: "Ramesh Prasad", role: "Transport lead", school: "All 3", email: "ramesh.p@saraswati.org", mfa: true, last: "Today", status: "active" },
  { name: "Kavya N.", role: "Intern", school: "Chennai", email: "kavya@saraswati.org", mfa: false, last: "Yesterday", status: "active" },
  { name: "Arun Joshi", role: "Teacher", school: "Trichy", email: "arun@saraswati.org", mfa: false, last: "4 days ago", status: "inactive" },
];

const ROLES_DESC = [
  { role: "Super Admin", count: 1, desc: "Full trust-wide access incl. finance, users, audit." },
  { role: "Principal", count: 3, desc: "Full access to their school · cannot edit trust settings." },
  { role: "Academic Director", count: 3, desc: "Academic modules only · no finance writes." },
  { role: "Accountant", count: 3, desc: "Finance modules · issue receipts · read-only students." },
  { role: "Teacher", count: 124, desc: "Own classes + students · homework · messaging." },
  { role: "Transport lead", count: 3, desc: "Routes, buses, drivers, stops, live boarding." },
  { role: "Parent", count: 1624, desc: "Their child(ren) only · fees, academics, messages." },
];

export default function ScreenUsers() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Governance</div>
          <div className="page-title">Users <span className="amber">& roles</span></div>
          <div className="page-sub">1,761 user accounts across 7 roles. MFA is enforced for all admin tiers.</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="download" size={13} />Export CSV</button>
          <button className="btn accent"><Icon name="plus" size={13} />Invite user</button>
        </div>
      </div>

      <div className="grid g-12" style={{ marginBottom: 18 }}>
        <div className="card col-8">
          <div className="card-head">
            <div><div className="card-title">Admin & staff</div><div className="card-sub">10 of 124 shown · sorted by last active</div></div>
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
                {USERS.map((u) => (
                  <tr key={u.email}>
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
                    <td style={{ fontSize: 12 }}>{u.school}</td>
                    <td>
                      {u.mfa ? <span className="chip ok"><Icon name="check" size={10} />On</span> : <span className="chip warn"><span className="dot" />Off</span>}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{u.last}</td>
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
            {ROLES_DESC.map((r) => (
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
