"use client";

import { useEffect, useState } from "react";
import Icon from "../Icon";

const SECTIONS = [
  {
    key: "trust",
    t: "Trust identity",
    fields: [
      { k: "name",      label: "Trust name" },
      { k: "regNo",     label: "Registration no." },
      { k: "pan80g",    label: "PAN · 80G status" },
      { k: "contact",   label: "Primary contact" },
    ],
  },
  {
    key: "finance",
    t: "Finance",
    fields: [
      { k: "academicYear", label: "Academic year" },
      { k: "feeCycle",     label: "Fee cycle" },
      // UPI ID + payee name drive the QR shown on the Fees · Collect screen
      // and the Pay-online checkout. Set both for the QR to be scannable.
      { k: "upi",          label: "UPI ID",          hint: "e.g. sanfort@hdfc — used for the fees QR scanner" },
      { k: "upiPayeeName", label: "UPI payee name",  hint: "Shown to the parent's UPI app (max 40 chars)" },
      { k: "gstPan",       label: "GST · PAN for invoices" },
    ],
  },
  {
    key: "communication",
    t: "Communication",
    fields: [
      { k: "smsProvider",    label: "SMS provider" },
      { k: "whatsappNumber", label: "WhatsApp" },
      { k: "emailSender",    label: "Email sender" },
      { k: "officeHours",    label: "Office hours for auto-call" },
    ],
  },
  {
    key: "security",
    t: "Security",
    fields: [
      { k: "mfa",            label: "MFA for admins" },
      { k: "sessionTimeout", label: "Session timeout" },
      { k: "ipAllowlist",    label: "IP allowlist" },
      { k: "backup",         label: "Backup" },
    ],
  },
];

function Toast({ msg, tone, onClose }) {
  if (!msg) return null;
  const bg = tone === "ok" ? "var(--ok)" : tone === "err" ? "var(--err, #b13c1c)" : "var(--ink)";
  return (
    <div onClick={onClose} role="status" style={{
      position: "fixed", bottom: 18, right: 18, zIndex: 9000,
      background: bg, color: "#fff", padding: "9px 14px", borderRadius: 8,
      fontSize: 12, fontWeight: 500, cursor: "pointer", maxWidth: 360,
    }}>{msg}</div>
  );
}

export default function ScreenSettings({ role }) {
  const [settings, setSettings] = useState({});
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const canEdit = role === "admin";

  const showToast = (msg, tone) => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/settings", { cache: "no-store" });
        const json = await r.json();
        if (!cancelled && json.ok) {
          setSettings(json.settings || {});
          setDraft(json.settings || {});
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const setField = (section, key, value) => {
    setDraft((d) => ({ ...d, [section]: { ...(d[section] || {}), [key]: value } }));
  };

  const save = async () => {
    if (!canEdit) return;
    setBusy(true);
    try {
      const r = await fetch("/api/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: draft }),
      });
      const json = await r.json();
      if (json.ok) {
        setSettings(json.settings || draft);
        setDraft(json.settings || draft);
        showToast("Settings saved", "ok");
      } else {
        showToast(json.error || "Save failed", "err");
      }
    } catch (e) {
      showToast(e.message || "Network error", "err");
    } finally {
      setBusy(false);
    }
  };

  const revert = () => setDraft(settings);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">System</div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Trust-wide defaults. Individual schools can override finance and communication settings.</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={revert} disabled={busy}><Icon name="refresh" size={13} />Revert</button>
          {canEdit && (
            <button className="btn accent" onClick={save} disabled={busy}>
              <Icon name="check" size={13} />{busy ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      </div>

      <div className="grid g-2">
        {SECTIONS.map((s) => (
          <div className="card" key={s.key}>
            <div className="card-head">
              <div><div className="card-title">{s.t}</div></div>
            </div>
            <div>
              {s.fields.map((it) => {
                const value = draft?.[s.key]?.[it.k] ?? "";
                return (
                  <div className="lrow" key={it.k}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>{it.label}</div>
                      {canEdit ? (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setField(s.key, it.k, e.target.value)}
                          placeholder={it.placeholder || "—"}
                          style={{
                            marginTop: 4, width: "100%", fontSize: 13,
                            padding: "6px 8px", border: "1px solid var(--rule-2)",
                            borderRadius: 6, background: "var(--card)",
                            color: "var(--ink)",
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: 13, marginTop: 3 }}>{value || "—"}</div>
                      )}
                      {it.hint && (
                        <div style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 4 }}>{it.hint}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Toast msg={toast?.msg} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}
