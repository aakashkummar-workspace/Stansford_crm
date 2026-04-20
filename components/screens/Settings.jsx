"use client";

import Icon from "../Icon";

const SECTIONS = [
  {
    t: "Trust identity",
    items: [
      { k: "Trust name", v: "Saraswati Educational Trust" },
      { k: "Registration no.", v: "TN/TRST/2002/3948" },
      { k: "PAN · 80G status", v: "AAATS4921K · Valid till Mar 2027" },
      { k: "Primary contact", v: "Rajesh Iyer · rajesh@saraswati.org" },
    ],
  },
  {
    t: "Finance",
    items: [
      { k: "Academic year", v: "2025–26 · closes 31 Mar" },
      { k: "Fee cycle", v: "Quarterly · due on 10th" },
      { k: "UPI handle", v: "saraswati@hdfc" },
      { k: "GST · PAN for invoices", v: "33AAATS4921K1ZH" },
    ],
  },
  {
    t: "Communication",
    items: [
      { k: "SMS provider", v: "MSG91 · 14,200 credits left" },
      { k: "WhatsApp", v: "Business API · verified" },
      { k: "Email sender", v: "no-reply@saraswati.org · SPF ok" },
      { k: "Office hours for auto-call", v: "09:30 – 17:30 IST" },
    ],
  },
  {
    t: "Security",
    items: [
      { k: "MFA for admins", v: "Required" },
      { k: "Session timeout", v: "30 min idle" },
      { k: "IP allowlist", v: "Off · school-only mode available" },
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
