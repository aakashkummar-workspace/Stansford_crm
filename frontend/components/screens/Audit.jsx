"use client";

import Icon from "../Icon";
import { KPI, AvatarChip } from "../ui";

function toneFor(action = "") {
  const a = action.toLowerCase();
  if (a.includes("paid") || a.includes("receipt") || a.includes("board")) return "ok";
  if (a.includes("resolved") || a.includes("converted")) return "ok";
  if (a.includes("absent") || a.includes("complaint")) return "bad";
  if (a.includes("progress") || a.includes("contacted") || a.includes("late")) return "warn";
  if (a.includes("created") || a.includes("enquiry") || a.includes("viewed")) return "info";
  return "accent";
}

export default function ScreenAudit({ E }) {
  // Live audit events from the DB only — newest first.
  const events = (E.AUDIT || []).map((a) => ({
    t: a.when,
    who: a.who,
    action: a.action,
    meta: a.entity,
    tone: toneFor(a.action),
  }));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Governance</div>
          <div className="page-title">Audit <span className="amber">log</span></div>
          <div className="page-sub">Every sensitive action is captured — financial writes, permission changes, automation runs, and parent-facing messages.</div>
        </div>
        <div className="page-actions">
          <select className="select">
            <option>All events</option>
            <option>Financial</option>
            <option>Permissions</option>
            <option>Automations</option>
          </select>
          <button className="btn"><Icon name="download" size={13} />Export</button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 18 }}>
        <KPI label="Events · total" value={events.length} sub="all-time" puck="mint" puckIcon="audit" />
        <KPI label="Financial writes" value={events.filter((e) => /paid|receipt|reminder|donation/i.test(e.action)).length} sub="fee/donation actions" puck="peach" puckIcon="money" />
        <KPI label="Permission changes" value={events.filter((e) => /role|user/i.test(e.action)).length} sub="user/role updates" puck="cream" puckIcon="shield" />
        <KPI label="Failed attempts" value={0} sub="locked after 5" puck="rose" puckIcon="warning" />
      </div>

      <div className="card">
        <div className="card-head">
          <div><div className="card-title">Recent activity</div><div className="card-sub">Last 24h · chronological</div></div>
          <div className="card-actions">
            <span className="chip teal"><span className="pulse-dot" />Streaming</span>
          </div>
        </div>
        <div>
          {events.length === 0 && (
            <div className="empty">No events yet. Actions across the app will appear here as you work.</div>
          )}
          {events.map((e, i) => (
            <div key={i} className="lrow">
              <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-3)", width: 54, flexShrink: 0 }}>{e.t}</div>
              <AvatarChip initials={e.who === "System" ? "SY" : e.who === "Parent Portal" ? "PP" : e.who.split(" ").map((n) => n[0]).join("")} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>{e.action}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{e.who} · {e.meta}</div>
              </div>
              <span className={`chip ${e.tone}`}><span className="dot" />{e.tone}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
