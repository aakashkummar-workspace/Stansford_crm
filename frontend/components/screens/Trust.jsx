"use client";

import Icon from "../Icon";
import { KPI } from "../ui";
import { moneyK } from "@/lib/format";

export default function ScreenTrust({ E }) {
  const { SCHOOLS, TRUST_KPIS, ANOMALIES, AI_BRIEF, COMPLIANCE, DONATION_PIPELINE } = E;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Trust overview · {SCHOOLS.length} school{SCHOOLS.length === 1 ? "" : "s"}</div>
          <div className="page-title">
            Trust <span className="amber">overview</span>
          </div>
          <div className="page-sub">Roll-up view across all schools in the trust.</div>
        </div>
        <div className="page-actions">
          <div className="segmented">
            {["This week", "This term", "YTD"].map((r, i) => (
              <button key={r} className={i === 0 ? "active" : ""}>
                {r}
              </button>
            ))}
          </div>
          <button className="btn">
            <Icon name="download" size={13} />
            Board pack
          </button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 20 }}>
        <KPI label="Students" value={TRUST_KPIS.students.value} delta={TRUST_KPIS.students.delta} deltaDir="up" sub={TRUST_KPIS.students.sub} puck="mint" puckIcon="students" />
        <KPI label="Fee collection" value={TRUST_KPIS.collected.value} delta={TRUST_KPIS.collected.delta} deltaDir="up" sub={TRUST_KPIS.collected.sub} puck="peach" puckIcon="fees" />
        <KPI label="Donations YTD" value={TRUST_KPIS.donations.value} delta={TRUST_KPIS.donations.delta} deltaDir="up" sub={TRUST_KPIS.donations.sub} puck="cream" puckIcon="donors" />
        <KPI label="Parent NPS" value={TRUST_KPIS.teacherNPS.value} delta={TRUST_KPIS.teacherNPS.delta} deltaDir="up" sub={TRUST_KPIS.teacherNPS.sub} puck="sky" puckIcon="heart" />
      </div>

      <div className="grid g-12" style={{ marginBottom: 20 }}>
        <div className="card col-8">
          <div className="card-head">
            <div>
              <div className="card-title">Schools</div>
              <div className="card-sub">Tap any row to drill into a school</div>
            </div>
            <div className="card-actions">
              <button className="btn sm">
                <Icon name="plus" size={12} />
                Add school
              </button>
            </div>
          </div>
          <div>
            {SCHOOLS.length === 0 && (
              <div className="empty">No schools added to the trust yet.</div>
            )}
            {SCHOOLS.map((s) => (
              <div className="school-row" key={s.id}>
                <div className={`school-puck ${s.puck}`}>
                  <Icon name="school" size={18} />
                </div>
                <div className="school-info">
                  <div className="name">{s.name}</div>
                  <div className="meta">
                    {s.city} · {s.students} students · {s.fees}% fees · {s.wellness}% wellness
                  </div>
                </div>
                <div style={{ width: 140 }}>
                  <div className="dual-bar">
                    <span className="g" style={{ width: s.fees + "%" }} />
                    <span className="r" style={{ width: 100 - s.fees + "%" }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>{s.fees}% collected</div>
                </div>
                <span className="chip ok">
                  <span className="dot" />
                  {s.status}
                </span>
                <Icon name="chevronRight" size={14} style={{ color: "var(--ink-4)" }} />
              </div>
            ))}
          </div>
        </div>

        <div className="card col-4 ai-brief">
          <div className="card-body" style={{ position: "relative", zIndex: 1 }}>
            <div className="eyebrow">
              <Icon name="sparkles" size={11} /> Briefing
            </div>
            <div className="headline">Today across the trust.</div>
            {AI_BRIEF.length === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12.5, lineHeight: 1.5 }}>
                Briefing items will appear here once there's enough activity to summarise.
              </div>
            ) : AI_BRIEF.map((t, i) => (
              <div className="insight-row" key={i}>
                <div className="n">0{i + 1}</div>
                <div>{t}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid g-12" style={{ marginBottom: 20 }}>
        <div className="card col-5">
          <div className="card-head">
            <div>
              <div className="card-title">Anomalies spotted</div>
              <div className="card-sub">Patterns unusual for this week</div>
            </div>
            <span className="chip accent">
              <span className="dot" />3 new
            </span>
          </div>
          <div>
            {ANOMALIES.length === 0 && (
              <div className="empty">No anomalies detected.</div>
            )}
            {ANOMALIES.map((a, i) => (
              <div key={i} className="lrow">
                <div className={`act-ico ${a.tone}`}>
                  <Icon name={a.tone === "bad" ? "warning" : a.tone === "warn" ? "trending" : "spark"} size={13} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}>{a.t}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{a.s}</div>
                </div>
                <button className="btn sm ghost">
                  <Icon name="chevronRight" size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card col-4">
          <div className="card-head">
            <div>
              <div className="card-title">Donation pipeline</div>
              <div className="card-sub">₹1.24 Cr in motion</div>
            </div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {DONATION_PIPELINE.length === 0 && (
              <div className="empty" style={{ padding: 12 }}>No pipeline yet.</div>
            )}
            {DONATION_PIPELINE.map((p, i) => {
              const max = Math.max(...DONATION_PIPELINE.map((x) => x.amount)) || 1;
              return (
                <div key={p.stage}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, alignItems: "baseline" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>
                      {p.stage} <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>· {p.count}</span>
                    </span>
                    <span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>
                      {moneyK(p.amount)}
                    </span>
                  </div>
                  <div className="bar thick">
                    <span style={{ width: (p.amount / max) * 100 + "%", background: i === 3 ? "var(--ok)" : "var(--accent)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card col-3">
          <div className="card-head">
            <div>
              <div className="card-title">Compliance</div>
              <div className="card-sub">Q1 · FY26</div>
            </div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {COMPLIANCE.length === 0 && (
              <div className="empty" style={{ padding: 12 }}>No compliance items tracked.</div>
            )}
            {COMPLIANCE.map((c) => (
              <div key={c.t}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
                  <span>{c.t}</span>
                  <span className="mono" style={{ color: c.tone === "ok" ? "var(--ok)" : "var(--warn)", fontWeight: 500 }}>
                    {c.v}/{c.goal}
                  </span>
                </div>
                <div className="bar">
                  <span style={{ width: (c.v / c.goal) * 100 + "%", background: c.tone === "ok" ? "var(--ok)" : "var(--warn)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
