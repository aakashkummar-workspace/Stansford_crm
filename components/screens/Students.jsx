"use client";

import { useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip, StatusChip } from "../ui";

const STUDENT_NAMES = [
  ["Aanya", "Sharma"], ["Advait", "Patel"], ["Arjun", "Khan"], ["Ishaan", "Gupta"],
  ["Kiara", "Reddy"], ["Vivaan", "Iyer"], ["Saanvi", "Desai"], ["Aarav", "Nair"],
  ["Myra", "Joshi"], ["Vihaan", "Malhotra"], ["Diya", "Singh"], ["Krish", "Verma"],
  ["Anaya", "Mehta"], ["Reyansh", "Chauhan"], ["Aadhya", "Rao"], ["Shaurya", "Kapoor"],
  ["Zara", "Pillai"], ["Kabir", "Bose"], ["Navya", "Menon"], ["Atharv", "Trivedi"],
  ["Pari", "Shetty"], ["Dhruv", "Agarwal"], ["Riya", "Banerjee"], ["Yash", "Choudhary"],
];

export default function ScreenStudents() {
  const [filter, setFilter] = useState("All");
  const roster = STUDENT_NAMES.flatMap((n, i) => {
    const cls = (i % 8) + 1;
    const sec = i % 2 === 0 ? "A" : "B";
    const rr = (k) => ((i * k * 9301 + 49297) % 233280) / 233280;
    return [{
      id: `STN-${2000 + i}`,
      name: `${n[0]} ${n[1]}`,
      cls: `${cls}-${sec}`,
      parent: `+91 98${Math.floor(rr(3) * 90000 + 10000)} ${Math.floor(rr(5) * 9000 + 1000)}`,
      fee: rr(7) > 0.22 ? "paid" : rr(7) > 0.1 ? "pending" : "overdue",
      attendance: Math.round(80 + rr(9) * 18),
      transport: rr(11) > 0.4 ? ["R1", "R2", "R3"][i % 3] : "—",
      joined: `Apr ${2020 + (i % 5)}`,
    }];
  });

  const visible = filter === "All" ? roster : roster.filter((s) => `Class ${s.cls.split("-")[0]}` === filter);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">People · Roster</div>
          <div className="page-title">Students <span className="amber">at school</span></div>
          <div className="page-sub">445 children · classes 1–8 · academic year 2025–26</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="upload" size={13} />Import</button>
          <button className="btn"><Icon name="download" size={13} />Export</button>
          <button className="btn accent"><Icon name="plus" size={13} />New admission</button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Enrolled" value="445" delta="+12 this term" deltaDir="up" sub="across 8 classes" puck="mint" puckIcon="students" />
        <KPI label="New admissions · YTD" value="63" delta="+18%" deltaDir="up" sub="vs last year" puck="peach" puckIcon="enquiry" />
        <KPI label="Average attendance" value="91%" delta="+2%" deltaDir="up" sub="last 30 days" puck="cream" puckIcon="check" />
        <KPI label="Transfer certificates" value="4" delta="2 pending" deltaDir="down" sub="processed this month" puck="rose" puckIcon="reports" />
      </div>

      <div className="card">
        <div className="card-head">
          <div><div className="card-title">All students</div><div className="card-sub">Auto-assigned IDs · auto fee schedule</div></div>
          <div className="card-actions">
            <div className="segmented" style={{ flexWrap: "wrap" }}>
              {["All", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"].map((f) => (
                <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f}</button>
              ))}
            </div>
            <button className="btn sm"><Icon name="filter" size={12} />Filter</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead><tr><th></th><th>Student</th><th>ID</th><th>Class</th><th>Parent</th><th>Attendance</th><th>Fee</th><th>Transport</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td><input type="checkbox" /></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AvatarChip initials={s.name.split(" ").map((n) => n[0]).join("")} />
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-3)" }}>{s.id}</td>
                  <td><span className="chip">{s.cls}</span></td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>{s.parent}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div className="bar" style={{ width: 60 }}><span style={{ width: `${s.attendance}%`, background: s.attendance < 85 ? "var(--warn)" : "var(--ok)" }} /></div>
                      <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.attendance}%</span>
                    </div>
                  </td>
                  <td><StatusChip status={s.fee}>{s.fee.charAt(0).toUpperCase() + s.fee.slice(1)}</StatusChip></td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{s.transport}</td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{s.joined}</td>
                  <td><button className="icon-btn"><Icon name="more" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
