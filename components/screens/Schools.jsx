"use client";

import { useState } from "react";
import Icon from "../Icon";

export default function ScreenSchools({ E }) {
  const { SCHOOLS } = E;
  const [sel, setSel] = useState(SCHOOLS[0].id);
  const s = SCHOOLS.find((x) => x.id === sel);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Trust · 3 schools</div>
          <div className="page-title">Schools <span className="amber">at a glance</span></div>
          <div className="page-sub">Switch between schools. Each one has its own fees, staff, and academic tracker — but reports roll up here.</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="download" size={13} />Export</button>
          <button className="btn accent"><Icon name="plus" size={13} />Add school</button>
        </div>
      </div>

      <div className="grid g-3" style={{ marginBottom: 18 }}>
        {SCHOOLS.map((sc) => (
          <div className="card" key={sc.id} style={{ cursor: "pointer", borderColor: sel === sc.id ? "var(--accent)" : undefined }} onClick={() => setSel(sc.id)}>
            <div className="card-body">
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div className={`school-puck ${sc.puck}`} style={{ width: 44, height: 44 }}><Icon name="school" size={20} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, fontFamily: "var(--font-serif)" }}>{sc.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{sc.city} · est. 2002</div>
                </div>
                <span className="chip ok"><span className="dot" />{sc.status}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 16 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Students</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 500, marginTop: 3 }}>{sc.students}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Fees</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 500, color: "var(--ok)", marginTop: 3 }}>{sc.fees}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Wellness</div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 500, color: "var(--accent)", marginTop: 3 }}>{sc.wellness}</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div className="dual-bar"><span className="g" style={{ width: sc.fees + "%" }} /><span className="r" style={{ width: 100 - sc.fees + "%" }} /></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">{s.name}</div>
            <div className="card-sub">{s.city} · detailed snapshot</div>
          </div>
          <div className="card-actions">
            <button className="btn sm"><Icon name="pencil" size={11} />Edit</button>
            <button className="btn sm"><Icon name="link" size={11} />Open as Principal</button>
          </div>
        </div>
        <div className="card-body">
          <div className="grid g-4">
            {[
              { t: "Students", v: s.students, s: "Classes 1–10" },
              { t: "Teachers", v: Math.round(s.students / 22), s: "12:1 ratio" },
              { t: "Fees collected", v: s.fees + "%", s: "Apr 2026" },
              { t: "Complaints open", v: 4, s: "2 overdue" },
              { t: "Transport routes", v: 6, s: "All running" },
              { t: "Inventory low", v: 3, s: "Reorder due" },
              { t: "Donors", v: 12, s: "YTD" },
              { t: "Audit score", v: s.wellness, s: "Board Jan 26" },
            ].map((k) => (
              <div key={k.t} style={{ padding: "14px 0" }}>
                <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>{k.t}</div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 28, marginTop: 6, letterSpacing: "-0.02em" }}>{k.v}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{k.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
