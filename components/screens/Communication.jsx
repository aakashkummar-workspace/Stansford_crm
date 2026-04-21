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
        <KPI label="Messages · today" value={0} sub="WhatsApp + SMS" puck="mint" puckIcon="megaphone" />
        <KPI label="Delivery rate" value="—" sub="no messages yet" puck="cream" puckIcon="check" />
        <KPI label="Templates" value={0} sub="add DLT-approved templates" puck="peach" puckIcon="mail" />
        <KPI label="Parent reachability" value="—" sub="add parent contacts first" puck="sky" puckIcon="users" />
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
                <tr><td colSpan={6} className="empty">No broadcasts yet. Compose your first message on the right.</td></tr>
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
            <div className="empty">No templates yet. Add DLT-approved templates to send bulk messages.</div>
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Compose</div></div></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Audience</div>
                <select className="select" style={{ width: "100%" }}>
                  <option>All parents</option>
                  <option>Pending fees only</option>
                  <option>Pick a class…</option>
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
                  placeholder="Type your message…"
                />
              </div>
              <button className="btn accent" style={{ justifyContent: "center" }}><Icon name="send" size={13} />Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
