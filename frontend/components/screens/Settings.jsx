"use client";

import Icon from "../Icon";

const SECTIONS = [
  {
    t: "Trust identity",
    items: [
      { k: "Trust name", v: "—" },
      { k: "Registration no.", v: "—" },
      { k: "PAN · 80G status", v: "—" },
      { k: "Primary contact", v: "—" },
    ],
  },
  {
    t: "Finance",
    items: [
      { k: "Academic year", v: "—" },
      { k: "Fee cycle", v: "—" },
      { k: "UPI handle", v: "—" },
      { k: "GST · PAN for invoices", v: "—" },
    ],
  },
  {
    t: "Communication",
    items: [
      { k: "SMS provider", v: "Not configured" },
      { k: "WhatsApp", v: "Not configured" },
      { k: "Email sender", v: "Not configured" },
      { k: "Office hours for auto-call", v: "—" },
    ],
  },
  {
    t: "Security",
    items: [
      { k: "MFA for admins", v: "Required" },
      { k: "Session timeout", v: "30 min idle" },
      { k: "IP allowlist", v: "Off" },
      { k: "Backup", v: "Nightly · 30-day retention" },
    ],
  },
];

export default function ScreenSettings() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">System</div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Trust-wide defaults. Individual schools can override finance and communication settings.</div>
        </div>
        <div className="page-actions">
          <button className="btn"><Icon name="refresh" size={13} />Revert</button>
          <button className="btn accent"><Icon name="check" size={13} />Save changes</button>
        </div>
      </div>

      <div className="grid g-2">
        {SECTIONS.map((s) => (
          <div className="card" key={s.t}>
            <div className="card-head">
              <div><div className="card-title">{s.t}</div></div>
              <button className="btn sm ghost"><Icon name="pencil" size={11} />Edit</button>
            </div>
            <div>
              {s.items.map((it) => (
                <div className="lrow" key={it.k}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>{it.k}</div>
                    <div style={{ fontSize: 13, marginTop: 3 }}>{it.v}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
