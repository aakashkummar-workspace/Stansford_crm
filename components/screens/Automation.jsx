"use client";

import Icon from "../Icon";
import { KPI } from "../ui";

export default function ScreenAutomation({ E }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">System · Automation</div>
          <div className="page-title">Automation <span className="amber">engine</span></div>
          <div className="page-sub">Event-based rules · zero manual work</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="play" size={13} />Test run</button>
          <button className="btn accent"><Icon name="plus" size={13} />New rule</button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Active rules" value={(E.AUTOMATIONS || []).length} sub="configured" puck="mint" puckIcon="zap" />
        <KPI label="Actions · total" value={(E.AUTOMATIONS || []).reduce((a, x) => a + (x.runs || 0), 0)} sub="across all rules" puck="peach" puckIcon="trending" />
        <KPI label="Manual hours saved" value="—" sub="needs run history" puck="cream" puckIcon="clock" />
        <KPI label="Success rate" value="—" sub="needs run history" puck="sky" puckIcon="check" />
      </div>

      <div className="grid g-12">
        <div className="card col-8">
          <div className="card-head">
            <div><div className="card-title">Rules</div><div className="card-sub">When event fires, do action</div></div>
          </div>
          <div>
            {(E.AUTOMATIONS || []).length === 0 && (
              <div className="empty">No automation rules yet. Click “New rule” to wire your first event → action.</div>
            )}
            {(E.AUTOMATIONS || []).map((a, i) => (
              <div
                key={i}
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  borderBottom: i < E.AUTOMATIONS.length - 1 ? "1px solid var(--rule-2)" : "none",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--accent-soft)", color: "var(--accent-2)", display: "grid", placeItems: "center" }}>
                  <Icon name="zap" size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{a.runs} runs · last fired {a.last}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="chip ok"><span className="dot" />Live</span>
                  <span style={{ width: 34, height: 18, borderRadius: 999, background: "var(--accent)", position: "relative", display: "inline-block" }}>
                    <span style={{ position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "var(--card)", top: 2, right: 2, boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }} />
                  </span>
                  <button className="icon-btn"><Icon name="more" size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card col-4">
          <div className="card-head"><div><div className="card-title">Live event stream</div><div className="card-sub">Recent activity</div></div></div>
          <div style={{ maxHeight: 540, overflowY: "auto" }}>
            {(E.ACTIVITIES || []).length === 0 ? (
              <div className="empty">No events yet.</div>
            ) : (E.ACTIVITIES || []).map((l, i) => (
              <div key={i} style={{ padding: "10px 14px", borderBottom: "1px solid var(--rule-2)", display: "flex", gap: 10 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", width: 42, flexShrink: 0 }}>{l.ts}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--accent-2)" }}>{l.t}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 1 }}>{l.title}</div>
                </div>
                <span className={`sdot ${l.tone || "neutral"}`} style={{ marginTop: 6, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
