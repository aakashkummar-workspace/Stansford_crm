"use client";

import Icon from "../Icon";
import { KPI, AvatarChip } from "../ui";

const STATIC_EVENTS = [
  { t: "08:12", who: "Rajesh Iyer", action: "Viewed Trust dashboard", meta: "From 49.37.x.x · Chrome", tone: "info" },
  { t: "08:03", who: "Sunita Pillai", action: "Issued receipt · STN-2041 Aanya Sharma", meta: "₹18,500 · UPI · auto", tone: "ok" },
  { t: "07:54", who: "System", action: "Ran automation · Fee reminder SMS batch", meta: "14 sent · 2 failed", tone: "accent" },
  { t: "07:41", who: "Anita Deshmukh", action: "Marked attendance · Class 6-B", meta: "28/30 present", tone: "info" },
  { t: "07:30", who: "Rashmi Iyer", action: "Updated fee structure · Class 7 term 2", meta: "₹21,200 → ₹22,400", tone: "warn" },
  { t: "07:12", who: "Ramesh K.", action: "Boarding logged · Stop Whitefield Main", meta: "12/12 boarded", tone: "ok" },
  { t: "06:58", who: "System", action: "Nightly backup complete", meta: "3.4 GB · S3 · verified", tone: "ok" },
  { t: "Y/23:14", who: "Sanjay Mehta", action: "Added user · neha@saraswati.org", meta: "Role: Teacher", tone: "accent" },
  { t: "Y/19:02", who: "Rajesh Iyer", action: "Approved vendor payment", meta: "₹1,24,000 · Stationers", tone: "warn" },
  { t: "Y/17:40", who: "Parent Portal", action: "Complaint filed · CMP-0312", meta: "Nandini Verma", tone: "bad" },
  { t: "Y/14:22", who: "System", action: "Donation recorded · Kothari Foundation", meta: "₹1,00,000 · 80G issued", tone: "ok" },
  { t: "Y/11:08", who: "Rashmi Iyer", action: "Exported monthly board pack", meta: "PDF · 38 pages", tone: "info" },
];

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
  // Merge in live audit events from the DB (newest first), then the static history
  const liveEvents = (E.AUDIT || []).map((a) => ({
    t: a.when,
    who: a.who,
    action: a.action,
    meta: a.entity,
    tone: toneFor(a.action),
  }));
  const events = [...liveEvents, ...STATIC_EVENTS];

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
        <KPI label="Events · 24h" value="342" delta="+8%" deltaDir="up" sub="vs yesterday" puck="mint" puckIcon="audit" />
        <KPI label="Financial writes" value="48" delta="0" deltaDir="" sub="₹14.2L moved" puck="peach" puckIcon="money" />
        <KPI label="Permission changes" value="3" delta="-2" deltaDir="down" sub="2 admins · 1 teacher" puck="cream" puckIcon="shield" />
        <KPI label="Failed attempts" value="2" delta="+1" deltaDir="up" sub="Auto-locked after 5" puck="rose" puckIcon="warning" />
      </div>

      <div className="card">
        <div className="card-head">
          <div><div className="card-title">Recent activity</div><div className="card-sub">Last 24h · chronological</div></div>
          <div className="card-actions">
            <span className="chip teal"><span className="pulse-dot" />Streaming</span>
          </div>
        </div>
        <div>
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
