"use client";

import Icon from "../Icon";
import { KPI, AvatarChip } from "../ui";

export default function ScreenEnquiries({ E, refresh }) {
  const data = E.ENQUIRIES;
  const counts = { New: 0, Contacted: 0, Converted: 0, Rejected: 0 };
  data.forEach((e) => {
    if (counts[e.status] !== undefined) counts[e.status]++;
  });

  const advance = async (id, next) => {
    await fetch("/api/enquiries", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    await refresh?.();
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">CRM · Admissions</div>
          <div className="page-title">Admission <span className="amber">enquiries</span></div>
          <div className="page-sub">Pipeline · source tracking · conversion</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="download" size={13} />Export</button>
          <button className="btn accent"><Icon name="plus" size={13} />New enquiry</button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Open pipeline" value={counts.New + counts.Contacted} delta="+9" deltaDir="up" sub="this week" puck="mint" puckIcon="enquiry" />
        <KPI label="Converted · YTD" value="63" delta="+18%" deltaDir="up" sub="admission conversion 41%" puck="cream" puckIcon="check" />
        <KPI label="Avg response time" value="2.1h" delta="-40 min" deltaDir="down" sub="first-touch" puck="peach" puckIcon="clock" />
        <KPI label="Top source" value="Referral" delta="38%" deltaDir="up" sub="parent-to-parent" puck="sky" puckIcon="trending" />
      </div>

      <div className="grid g-12">
        <div className="col-12" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {[
            { s: "New", tone: "info", desc: "Just in · needs first call" },
            { s: "Contacted", tone: "warn", desc: "Follow-up in progress" },
            { s: "Converted", tone: "ok", desc: "Admission confirmed" },
            { s: "Rejected", tone: "bad", desc: "Not a fit · archived" },
          ].map((col) => {
            const items = data.filter((e) => e.status === col.s);
            return (
              <div key={col.s} className="card">
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--rule)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`chip ${col.tone}`}><span className="dot" />{col.s}</span>
                    <span className="mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)" }}>{items.length}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>{col.desc}</div>
                </div>
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, minHeight: 220 }}>
                  {items.map((e) => (
                    <div key={e.id} style={{ background: "var(--card-2)", border: "1px solid var(--rule-2)", borderRadius: 8, padding: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <AvatarChip initials={e.name.split(" ").map((n) => n[0]).join("")} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{e.name}</div>
                          <div style={{ fontSize: 10.5, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{e.id}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.5 }}>
                        Class {e.cls} · {e.source}
                        <br />
                        {e.parent} · <span className="mono">{e.phone}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                        <button className="btn sm"><Icon name="phone" size={11} /></button>
                        <button className="btn sm"><Icon name="whatsapp" size={11} /></button>
                        {col.s === "New" && (
                          <button className="btn sm accent" style={{ marginLeft: "auto" }} onClick={() => advance(e.id, "Contacted")}>
                            Contact
                          </button>
                        )}
                        {col.s === "Contacted" && (
                          <button className="btn sm accent" style={{ marginLeft: "auto" }} onClick={() => advance(e.id, "Converted")}>
                            Convert
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
