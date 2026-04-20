"use client";

import Icon from "../Icon";
import { KPI } from "../ui";

export default function ScreenCommunication() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Operations · Communication</div>
          <div className="page-title">Talk to <span className="amber">parents</span></div>
          <div className="page-sub">SMS · WhatsApp · templates · logs</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="upload" size={13} />Import list</button>
          <button className="btn accent"><Icon name="send" size={13} />New broadcast</button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Messages · today" value="284" delta="+38" deltaDir="up" sub="218 WA · 66 SMS" puck="mint" puckIcon="megaphone" />
        <KPI label="Delivery rate" value="98.2%" delta="+0.4%" deltaDir="up" sub="last 7 days" puck="cream" puckIcon="check" />
        <KPI label="Templates" value="16" delta="+2" deltaDir="up" sub="DLT-approved" puck="peach" puckIcon="mail" />
        <KPI label="Parent reachability" value="99.3%" sub="at least one channel" puck="sky" puckIcon="users" />
      </div>

      <div className="grid g-12">
        <div className="card col-7">
          <div className="card-head">
            <div><div className="card-title">Recent broadcasts</div><div className="card-sub">Automations + manual</div></div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead><tr><th>Campaign</th><th>Channel</th><th>Audience</th><th>Sent</th><th>Delivered</th><th>When</th></tr></thead>
              <tbody>
                {[
                  { n: "Fee reminder · T1 due", ch: ["whatsapp", "sms"], aud: "Pending fees · 82", sent: 82, d: 80, w: "2h ago" },
                  { n: "Transport R3 delay notice", ch: ["whatsapp"], aud: "R3 parents · 24", sent: 24, d: 24, w: "14m ago" },
                  { n: "Annual day · save the date", ch: ["whatsapp", "sms"], aud: "All parents · 445", sent: 445, d: 440, w: "Yesterday" },
                  { n: "Homework reminder · Cl 4", ch: ["whatsapp"], aud: "Class 4 · 54", sent: 54, d: 53, w: "Yesterday" },
                  { n: "Holiday circular · May 1", ch: ["sms"], aud: "All parents · 445", sent: 445, d: 431, w: "2 days ago" },
                  { n: "Parent-teacher meeting", ch: ["whatsapp"], aud: "Class 6 · 62", sent: 62, d: 61, w: "3 days ago" },
                ].map((b, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12.5, fontWeight: 500 }}>{b.n}</td>
                    <td>
                      <div style={{ display: "flex", gap: 3 }}>
                        {b.ch.includes("whatsapp") && <span className="chip ok"><Icon name="whatsapp" size={10} />WA</span>}
                        {b.ch.includes("sms") && <span className="chip info"><Icon name="sms" size={10} />SMS</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{b.aud}</td>
                    <td className="num">{b.sent}</td>
                    <td className="num" style={{ color: b.d === b.sent ? "var(--ok)" : "var(--warn)" }}>{b.d}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{b.w}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-5" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div className="card-head">
              <div><div className="card-title">Templates</div></div>
              <div className="card-actions"><button className="btn sm"><Icon name="plus" size={12} />New</button></div>
            </div>
            <div>
              {[
                { t: "Fee receipt", d: "Auto on payment", tags: ["WA", "SMS"] },
                { t: "Fee reminder · 3 days", d: "Auto · 3 days before due", tags: ["SMS"] },
                { t: "Fee overdue · 7 days", d: "Auto · +7 days", tags: ["WA"] },
                { t: "Attendance absence", d: "Auto on mark absent", tags: ["SMS"] },
                { t: "Holiday circular", d: "Manual · seasonal", tags: ["WA", "SMS"] },
                { t: "PTM reminder", d: "Manual · monthly", tags: ["WA"] },
              ].map((t, i) => (
                <div key={i} className="lrow">
                  <div className="act-ico"><Icon name="mail" size={13} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{t.t}</div>
                    <div className="s">{t.d}</div>
                  </div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {t.tags.map((tag) => (
                      <span key={tag} className="chip">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Compose</div></div></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Audience</div>
                <select className="select" style={{ width: "100%" }}>
                  <option>All parents · 445</option>
                  <option>Class 5 parents · 58</option>
                  <option>Transport R1 · 36</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Channel</div>
                <div className="segmented">
                  <button className="active"><Icon name="whatsapp" size={11} />WhatsApp</button>
                  <button><Icon name="sms" size={11} />SMS</button>
                  <button>Both</button>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Message</div>
                <textarea
                  className="input"
                  style={{ width: "100%", height: 70, padding: "8px 10px", lineHeight: 1.5, resize: "none" }}
                  defaultValue="Dear Parent, this is a gentle reminder that fees for Term 1 are due by April 30. Pay securely via UPI at @hdfc — Stansford International School."
                />
              </div>
              <button className="btn accent" style={{ justifyContent: "center" }}><Icon name="send" size={13} />Send to 445 parents</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
