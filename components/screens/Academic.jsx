"use client";

import { useMemo, useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip } from "../ui";

const STUDENT_NAMES = [
  ["Aanya", "Sharma"], ["Advait", "Patel"], ["Arjun", "Khan"], ["Ishaan", "Gupta"],
  ["Kiara", "Reddy"], ["Vivaan", "Iyer"], ["Saanvi", "Desai"], ["Aarav", "Nair"],
  ["Myra", "Joshi"], ["Vihaan", "Malhotra"], ["Diya", "Singh"], ["Krish", "Verma"],
  ["Anaya", "Mehta"], ["Reyansh", "Chauhan"], ["Aadhya", "Rao"], ["Shaurya", "Kapoor"],
  ["Zara", "Pillai"], ["Kabir", "Bose"],
];

export default function ScreenAcademic({ E }) {
  const classes = E.CLASSES;
  const [cls, setCls] = useState(5);
  const [sec, setSec] = useState("A");
  const [selectedStudent, setSelectedStudent] = useState(0);

  const roster = useMemo(() => {
    return STUDENT_NAMES.slice(0, 18).map((n, i) => {
      const seed = cls * 100 + i;
      const rr = (k) => ((seed * k * 9301 + 49297) % 233280) / 233280;
      return {
        id: `STN-${2000 + cls * 30 + i}`,
        name: `${n[0]} ${n[1]}`,
        roll: i + 1,
        attendance: Math.round(80 + rr(3) * 18),
        homework: Math.round(70 + rr(5) * 28),
        classwork: Math.round(70 + rr(7) * 28),
        handwriting: ["A", "A", "A-", "B+", "B", "B", "A", "B+"][(i + cls) % 8],
        behavior: ["Excellent", "Good", "Good", "Needs focus", "Good", "Excellent", "Good"][(i + cls) % 7],
      };
    });
  }, [cls, sec]);

  const student = roster[selectedStudent];

  const heatmap = Array.from({ length: 28 }, (_, i) => {
    const seed = student.id.charCodeAt(student.id.length - 1) * (i + 1);
    const v = ((seed * 9301 + 49297) % 233280) / 233280;
    if (i % 7 === 6) return { v: -1 };
    if (v < 0.08) return { v: 0 };
    return { v: Math.min(4, Math.floor(v * 5)) };
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">People · Academic tracker</div>
          <div className="page-title">Academic <span className="amber">tracker</span></div>
          <div className="page-sub">Class → Student → Daily log. Teachers post daily; monthly summary auto-generates to parents.</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="calendar" size={13} />Week of 22 Apr</button>
          <button className="btn"><Icon name="download" size={13} />Monthly report</button>
          <button className="btn accent"><Icon name="plus" size={13} />Log today</button>
        </div>
      </div>

      <div className="grid g-12">
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
          <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)" }}>
            Teacher-in-charge <span style={{ color: "var(--ink)", fontWeight: 500 }}>Ms. Anita Deshmukh</span>
          </div>
        </div>

        <div className="card col-4">
          <div className="card-head">
            <div>
              <div className="card-title">Class {cls}-{sec} · {roster.length} students</div>
              <div className="card-sub">Today&apos;s attendance: 16/{roster.length}</div>
            </div>
          </div>
          <div style={{ maxHeight: 620, overflowY: "auto" }}>
            {roster.map((s, i) => {
              const act = i === selectedStudent;
              return (
                <div key={s.id} onClick={() => setSelectedStudent(i)} className="lrow" style={{ cursor: "pointer", background: act ? "var(--accent-soft)" : undefined }}>
                  <div style={{ width: 28, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{String(s.roll).padStart(2, "0")}</div>
                  <AvatarChip initials={s.name.split(" ").map((n) => n[0]).join("")} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: act ? 500 : 400 }}>{s.name}</div>
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
                  <span>Class {cls}-{sec} · Roll {student.roll}</span><span className="meta-dot">·</span>
                  <span>Parent: Mr. Sharma · +91 98xxxx4251</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn sm"><Icon name="whatsapp" size={12} />Parent</button>
                <button className="btn sm"><Icon name="book" size={12} />TC</button>
                <button className="btn sm accent"><Icon name="pencil" size={12} />Today&apos;s log</button>
              </div>
            </div>
          </div>

          <div className="grid g-4">
            <KPI label="Attendance" value={`${student.attendance}%`} delta="21/23 days" deltaDir="up" sub="this term" puck="mint" puckIcon="check" />
            <KPI label="Homework" value={`${student.homework}%`} delta={student.homework > 85 ? "on track" : "lagging"} deltaDir={student.homework > 85 ? "up" : "down"} sub="completion" puck="peach" puckIcon="book" />
            <KPI label="Classwork" value={`${student.classwork}%`} delta="+4" deltaDir="up" sub="vs last month" puck="cream" puckIcon="pencil" />
            <KPI label="Handwriting" value={student.handwriting} sub="avg grade · 4 weeks" puck="sky" puckIcon="pencil" />
          </div>

          <div className="grid g-12">
            <div className="card col-7">
              <div className="card-head">
                <div><div className="card-title">Today · daily log</div><div className="card-sub">28 April · posted by Ms. Deshmukh 08:02</div></div>
                <div className="card-actions"><span className="chip ok"><span className="dot" />Submitted</span></div>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { l: "Classwork", v: "Fractions · Ex 3.2 pp. 54–56", c: <span className="chip ok"><span className="dot" />Complete</span> },
                  { l: "Homework", v: "English comprehension · 'The Banyan Tree'", c: <span className="chip ok"><span className="dot" />Submitted on time</span> },
                  { l: "Topics covered today", v: "Science: Food chains · Social: Mughal empire intro", c: null },
                  { l: "Handwriting", v: "Clean, letters well-formed. Watch spacing on 'g' and 'y'.", c: <span className="chip accent"><span className="dot" />A-</span> },
                  { l: "Behaviour", v: "Engaged in group reading. Helped peer with maths.", c: <span className="chip ok"><span className="dot" />Excellent</span> },
                  { l: "Extra-curricular", v: "Art club · practicing watercolour", c: <span className="chip info"><span className="dot" />Active</span> },
                ].map((r, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 12, alignItems: "flex-start", paddingBottom: 10, borderBottom: i < 5 ? "1px solid var(--rule-2)" : "none" }}>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: 1 }}>{r.l}</div>
                    <div style={{ fontSize: 13 }}>{r.v}</div>
                    <div>{r.c}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card col-5">
              <div className="card-head">
                <div><div className="card-title">28-day attendance</div><div className="card-sub">Green = present · red = absent</div></div>
              </div>
              <div className="card-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <div key={i} style={{ fontSize: 10, color: "var(--ink-4)", textAlign: "center" }}>{d}</div>
                  ))}
                  {heatmap.map((c, i) => {
                    const color =
                      c.v === -1 ? "var(--rule-2)" :
                      c.v === 0 ? "var(--bad)" :
                      `color-mix(in oklch, var(--accent) ${40 + c.v * 15}%, var(--rule-2))`;
                    return <div key={i} className="hm-cell" style={{ background: color, opacity: c.v === -1 ? 0.5 : 1 }} />;
                  })}
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>This year&apos;s achievements</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { i: "sparkles", t: "Annual Day · Lead speaker", d: "Feb 2026" },
                      { i: "flag", t: "Inter-school quiz · 2nd place", d: "Jan 2026" },
                      { i: "heart", t: "100% attendance award (Term 1)", d: "Dec 2025" },
                      { i: "book", t: "Reading challenge · 24 books", d: "Nov 2025" },
                    ].map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "var(--card-2)", borderRadius: 7 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--accent-soft)", color: "var(--accent-2)", display: "grid", placeItems: "center" }}>
                          <Icon name={a.i} size={12} />
                        </div>
                        <div style={{ flex: 1, fontSize: 12.5 }}>{a.t}</div>
                        <div style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{a.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
