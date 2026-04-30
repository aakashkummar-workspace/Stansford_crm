"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip } from "../ui";
import { money, moneyK } from "@/lib/format";

const DONOR_TYPES = ["CSR", "Trust", "Individual", "Alumni"];
const FILTERS = [
  { k: "all",        label: "All" },
  { k: "CSR",        label: "CSR" },
  { k: "Trust",      label: "Trusts" },
  { k: "Individual", label: "Individuals" },
  { k: "Alumni",     label: "Alumni" },
];

// "Next touchpoint" is stored as a free-text string. When the add form is used
// it's encoded as "YYYY-MM-DD" or "YYYY-MM-DD · note". Older free-text entries
// (no ISO prefix) fall through unchanged so they still render.
export function parseNextTouchpoint(raw) {
  const s = (raw || "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s*[·\-]\s*(.+))?$/);
  if (!m) return { iso: null, note: s, label: s };
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  const note = (m[4] || "").trim();
  const nice = new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return { iso, note, label: note ? `${nice} · ${note}` : nice };
}

function Toast({ msg, tone, onClose }) {
  if (!msg) return null;
  const bg = tone === "ok" ? "var(--ok)" : tone === "err" ? "var(--err, #b13c1c)" : "var(--ink)";
  return (
    <div onClick={onClose} role="status" style={{
      position: "fixed", bottom: 18, right: 18, zIndex: 9000,
      background: bg, color: "#fff", padding: "9px 14px", borderRadius: 8,
      fontSize: 12, fontWeight: 500, cursor: "pointer", maxWidth: 360,
      boxShadow: "0 12px 30px -16px rgba(0,0,0,0.35)",
    }}>{msg}</div>
  );
}

function ModalShell({ title, sub, onClose, children, width = 520 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
      display: "grid", placeItems: "center", zIndex: 250, padding: 16, overflowY: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: width, maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}>
        <div className="card-head">
          <div>
            <div className="card-title">{title}</div>
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{hint}</span>}
    </label>
  );
}

export default function ScreenDonors({ E, refresh, role }) {
  const canEdit = role === "principal" || role === "admin";
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);
  const [donating, setDonating] = useState(null); // donor object being credited, or null
  const [lastReceipt, setLastReceipt] = useState(null); // freshly generated receipt to preview
  const [viewingReceiptsFor, setViewingReceiptsFor] = useState(null); // donor whose receipts list is open, or "*" for all
  const [toast, setToast] = useState(null);

  const donors    = E.DONORS || [];
  const campaigns = E.CAMPAIGNS || [];
  const receipts  = E.DONOR_RECEIPTS || [];

  const filtered = useMemo(() => {
    if (filter === "all") return donors;
    return donors.filter((d) => d.type === filter);
  }, [donors, filter]);

  const ytdTotal = donors.reduce((a, d) => a + (d.ytd || 0), 0);
  const csrCount = donors.filter((d) => d.type === "CSR").length;
  const recurring = donors.filter((d) => d.next).length;

  const showToast = (msg, tone) => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3500);
  };

  async function handleAdd(payload) {
    const r = await fetch("/api/donors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || !json.ok) throw new Error(json.error || "Failed to add donor");
    setShowAdd(false);
    showToast(`${json.donor.name} added (${json.donor.id})`, "ok");
    await refresh?.();
  }

  async function handleCampaign(payload) {
    const r = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || !json.ok) throw new Error(json.error || "Failed to create campaign");
    setShowCampaign(false);
    showToast(`Campaign "${json.campaign.name}" created`, "ok");
    await refresh?.();
  }

  async function handleDonate(donor, payload) {
    const r = await fetch("/api/donors", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: donor.id, donate: payload }),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || !json.ok) throw new Error(json.error || "Failed to record donation");
    setDonating(null);
    setLastReceipt(json.receipt);
    showToast(`Receipt ${json.receipt.id} generated · ${donor.name}`, "ok");
    await refresh?.();
  }

  // CSV export — handy for accounting / annual reconciliation. Either dump all
  // receipts or just one donor's (when called from the per-donor list modal).
  function exportReceiptsCsv(scope) {
    const list = scope === "all" || !scope
      ? receipts
      : receipts.filter((r) => r.donorId === scope.id);
    if (list.length === 0) {
      showToast("No receipts to export", "err");
      return;
    }
    const header = ["Receipt #", "Issued", "Donor ID", "Donor", "Type", "Amount", "Method", "Memo", "Campaign"];
    const esc = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const titleScope = scope && scope !== "all" ? scope.name : "All donors";
    const csv = [
      `# Vidyalaya360 — Donation receipts — ${titleScope} — ${today}`,
      `# Generated: ${new Date().toLocaleString("en-IN")}`,
      header.join(","),
      ...list.map((r) => [
        r.id, r.issuedAtLabel || r.issuedAt, r.donorId, esc(r.donorName), r.donorType,
        r.amount, esc(r.method), esc(r.memo), esc(r.campaignId || ""),
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `donor-receipts-${(scope && scope !== "all") ? scope.id : "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Exported ${list.length} receipt${list.length === 1 ? "" : "s"}`, "ok");
  }

  async function handleRemove(d) {
    if (!confirm(`Remove ${d.name} from donors?`)) return;
    try {
      const r = await fetch("/api/donors", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: d.id }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast(`${d.name} removed`, "ok");
      await refresh?.();
    } catch (e) { showToast(e.message, "err"); }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">CRM · Trust & Donors</div>
          <div className="page-title">Trust & <span className="amber">Donors</span></div>
          <div className="page-sub">Donor CRM · campaigns · 80G receipts · annual statements</div>
        </div>
        {canEdit && (
          <div className="page-actions">
            <button className="btn" onClick={() => setViewingReceiptsFor("*")} disabled={receipts.length === 0} title={receipts.length === 0 ? "No receipts yet" : `Browse ${receipts.length} receipts`}>
              <Icon name="download" size={13} />Receipts ({receipts.length})
            </button>
            <button className="btn" onClick={() => setShowCampaign(true)}><Icon name="send" size={13} />Campaign</button>
            <button className="btn accent" onClick={() => setShowAdd(true)}><Icon name="plus" size={13} />Add donor</button>
          </div>
        )}
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Donors" value={donors.length} sub="on file" puck="mint" puckIcon="donors" />
        <KPI label="Raised · YTD" value={ytdTotal ? moneyK(ytdTotal) : "₹0"} sub="across all donors" puck="cream" puckIcon="trending" />
        <KPI label="CSR partners" value={csrCount} sub="organisations" puck="peach" puckIcon="shield" />
        <KPI label="Recurring donors" value={recurring} sub={recurring ? "with next touchpoint" : "add to track"} puck="sky" puckIcon="refresh" />
      </div>

      <div className="grid g-12">
        <div className="card col-8">
          <div className="card-head">
            <div><div className="card-title">Donor directory</div><div className="card-sub">Auto-receipts · annual statements</div></div>
            <div className="card-actions">
              <div className="segmented">
                {FILTERS.map((f) => (
                  <button key={f.k} className={filter === f.k ? "active" : ""} onClick={() => setFilter(f.k)}>{f.label}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Donor</th><th>ID</th><th>Type</th>
                  <th className="num">Contributed YTD</th><th>Last gift</th><th>Next touchpoint</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={canEdit ? 7 : 6} className="empty">
                    {donors.length === 0
                      ? "No donors on file. Add the first one with “Add donor”."
                      : `No donors match the "${FILTERS.find((f) => f.k === filter)?.label}" filter.`}
                  </td></tr>
                )}
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <AvatarChip initials={(d.name || "?").split(" ").slice(0, 2).map((n) => n[0]).join("")} />
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{d.name}</div>
                          {(d.email || d.phone) && (
                            <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
                              {d.email || ""}{d.email && d.phone ? " · " : ""}{d.phone || ""}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-3)" }}>{d.id}</td>
                    <td><span className={`chip ${d.type === "CSR" ? "accent" : d.type === "Trust" ? "info" : ""}`}><span className="dot" />{d.type}</span></td>
                    <td className="num" style={{ fontWeight: 500 }}>{money(d.ytd)}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{d.last || "—"}</td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>
                      {(() => {
                        const parsed = parseNextTouchpoint(d.next);
                        if (!parsed) return "—";
                        if (!parsed.iso) return parsed.label;
                        const todayIso = new Date().toISOString().slice(0, 10);
                        const days = Math.round(
                          (new Date(`${parsed.iso}T00:00:00`) - new Date(`${todayIso}T00:00:00`)) / 86_400_000
                        );
                        const tag = days === 0 ? "today"
                          : days > 0 ? `in ${days}d`
                          : `${Math.abs(days)}d ago`;
                        const tone = days < 0 ? "bad" : days === 0 ? "warn" : "";
                        return (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span>{parsed.label}</span>
                            <span className={`chip ${tone}`} style={{ fontSize: 10 }}>{tag}</span>
                          </span>
                        );
                      })()}
                    </td>
                    {canEdit && (
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn sm accent" title="Record donation & generate receipt" onClick={() => setDonating(d)}>
                            <Icon name="plus" size={11} />Donate
                          </button>
                          {(() => {
                            const count = receipts.filter((r) => r.donorId === d.id).length;
                            return (
                              <button
                                className="btn sm ghost"
                                title={count === 0
                                  ? `No receipts yet for ${d.name} — record a donation first`
                                  : `View ${count} receipt${count === 1 ? "" : "s"}`}
                                onClick={() => {
                                  if (count === 0) {
                                    showToast(`No receipts yet for ${d.name}. Click + Donate to generate one.`, "err");
                                  } else {
                                    setViewingReceiptsFor(d);
                                  }
                                }}
                              >
                                <Icon name="download" size={12} />{count > 0 ? ` ${count}` : ""}
                              </button>
                            );
                          })()}
                          <button className="icon-btn" onClick={() => handleRemove(d)} title="Remove"><Icon name="x" size={12} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-4" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div className="card-head">
              <div><div className="card-title">Active campaigns</div><div className="card-sub">{campaigns.length ? `${campaigns.length} running` : "Set fundraising targets"}</div></div>
              {canEdit && (
                <div className="card-actions">
                  <button className="btn sm" onClick={() => setShowCampaign(true)}><Icon name="plus" size={11} />New</button>
                </div>
              )}
            </div>
            {campaigns.length === 0 ? (
              <div className="empty">No campaigns yet. Create one to set fundraising targets.</div>
            ) : (
              <div style={{ padding: "8px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {campaigns.map((c) => {
                  const pct = c.goal ? Math.min(100, Math.round((c.raised / c.goal) * 100)) : 0;
                  return (
                    <div key={c.id} style={{ padding: 10, background: "var(--bg-2)", borderRadius: 7 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{c.name}</div>
                        <span className={`chip ${c.status === "completed" ? "ok" : c.status === "paused" ? "" : "accent"}`}><span className="dot" />{c.status}</span>
                      </div>
                      {c.description && (
                        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.4 }}>{c.description}</div>
                      )}
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="bar" style={{ flex: 1 }}>
                          <span style={{ width: `${pct}%`, background: "var(--accent)" }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11, fontWeight: 500 }}>{pct}%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10.5, color: "var(--ink-4)" }}>
                        <span>{moneyK(c.raised)} raised</span>
                        <span>Goal: {moneyK(c.goal)}</span>
                      </div>
                      {(c.starts || c.ends) && (
                        <div style={{ marginTop: 4, fontSize: 10.5, color: "var(--ink-4)" }}>
                          {c.starts || "—"} → {c.ends || "—"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Top contributors · YTD</div></div></div>
            {donors.length === 0 ? (
              <div className="empty">Add donors to see contribution rankings.</div>
            ) : (
              <div>
                {[...donors].sort((a, b) => (b.ytd || 0) - (a.ytd || 0)).slice(0, 5).map((d, i) => (
                  <div key={d.id} className="lrow">
                    <div style={{ width: 18, fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{i + 1}</div>
                    <AvatarChip initials={(d.name || "?").split(" ").slice(0, 2).map((n) => n[0]).join("")} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</div>
                      <div className="s">{d.type}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 12, fontWeight: 500 }}>{moneyK(d.ytd)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdd && canEdit && (
        <AddDonorModal onClose={() => setShowAdd(false)} onSubmit={handleAdd} />
      )}
      {showCampaign && canEdit && (
        <CampaignModal onClose={() => setShowCampaign(false)} onSubmit={handleCampaign} />
      )}
      {donating && canEdit && (
        <DonateModal donor={donating} campaigns={campaigns} onClose={() => setDonating(null)} onSubmit={(p) => handleDonate(donating, p)} />
      )}
      {lastReceipt && (
        <ReceiptModal receipt={lastReceipt} onClose={() => setLastReceipt(null)} />
      )}
      {viewingReceiptsFor && (
        <ReceiptsListModal
          scope={viewingReceiptsFor}
          receipts={viewingReceiptsFor === "*" ? receipts : receipts.filter((r) => r.donorId === viewingReceiptsFor.id)}
          onClose={() => setViewingReceiptsFor(null)}
          onPreview={(r) => { setViewingReceiptsFor(null); setLastReceipt(r); }}
          onExport={() => exportReceiptsCsv(viewingReceiptsFor === "*" ? "all" : viewingReceiptsFor)}
        />
      )}

      <Toast msg={toast?.msg} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function AddDonorModal({ onClose, onSubmit }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "", type: "Individual", email: "", phone: "",
    ytd: "", last: "", nextDate: "", nextNote: "",
  });
  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      if (!form.name.trim()) throw new Error("Donor name is required");
      // Encode next touchpoint as "YYYY-MM-DD · note" (or just date / just note).
      // The ISO prefix is what the notifications panel parses to schedule the
      // reminder on the selected day.
      const nextDate = form.nextDate.trim();
      const nextNote = form.nextNote.trim();
      const next = nextDate && nextNote
        ? `${nextDate} · ${nextNote}`
        : nextDate
        ? nextDate
        : nextNote || null;
      await onSubmit({
        name: form.name.trim(),
        type: form.type,
        email: form.email.trim() || null,
        phone: form.phone.replace(/\D/g, "") || null,
        ytd: Number(form.ytd) || 0,
        last: form.last.trim() || null,
        next,
      });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <ModalShell title="Add donor" sub="Auto-assigned ID · counted in YTD totals" onClose={onClose} width={520}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Donor name *">
          <input className="input" ref={nameRef} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Infosys Foundation" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Type">
            <select className="select" value={form.type} onChange={(e) => set("type", e.target.value)}>
              {DONOR_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Contributed YTD (₹)">
            <input
              className="input" inputMode="numeric"
              value={form.ytd}
              onChange={(e) => set("ytd", e.target.value.replace(/\D/g, ""))}
              placeholder="0"
            />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="contact@org.com" />
          </Field>
          <Field label="Phone (10-digit Indian)">
            <input
              className="input" inputMode="numeric"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="98XXXXXXXX"
            />
          </Field>
        </div>
        <Field label="Last gift" hint="Free text · e.g. ₹5L · 12 Mar">
          <input className="input" value={form.last} onChange={(e) => set("last", e.target.value)} placeholder="₹5L · 12 Mar" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10 }}>
          <Field label="Next touchpoint" hint="Reminder fires on this date">
            <input
              className="input" type="date"
              value={form.nextDate}
              onChange={(e) => set("nextDate", e.target.value)}
            />
          </Field>
          <Field label="Note (optional)" hint="Shown on the reminder">
            <input
              className="input"
              value={form.nextNote}
              onChange={(e) => set("nextNote", e.target.value)}
              placeholder="e.g. Quarterly review call"
            />
          </Field>
        </div>

        {err && (
          <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>{err}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy}>
            {busy ? "Adding…" : <><Icon name="check" size={13} />Add donor</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function CampaignModal({ onClose, onSubmit }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "", goal: "", raised: "0",
    starts: "", ends: "", status: "active", description: "",
  });
  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      if (!form.name.trim()) throw new Error("Campaign name is required");
      const goal = Number(form.goal) || 0;
      if (goal <= 0) throw new Error("Set a fundraising goal greater than 0");
      await onSubmit({
        name: form.name.trim(),
        goal, raised: Number(form.raised) || 0,
        starts: form.starts.trim() || null,
        ends: form.ends.trim() || null,
        status: form.status,
        description: form.description.trim() || null,
      });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <ModalShell title="New fundraising campaign" sub="Tracked in 'Active campaigns'" onClose={onClose} width={520}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Campaign name *">
          <input className="input" ref={nameRef} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. New science lab" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Goal (₹) *">
            <input
              className="input" inputMode="numeric"
              value={form.goal}
              onChange={(e) => set("goal", e.target.value.replace(/\D/g, ""))}
              placeholder="500000"
            />
          </Field>
          <Field label="Raised so far (₹)">
            <input
              className="input" inputMode="numeric"
              value={form.raised}
              onChange={(e) => set("raised", e.target.value.replace(/\D/g, ""))}
              placeholder="0"
            />
          </Field>
          <Field label="Status">
            <select className="select" value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Starts" hint="Free text date">
            <input className="input" value={form.starts} onChange={(e) => set("starts", e.target.value)} placeholder="01 May" />
          </Field>
          <Field label="Ends">
            <input className="input" value={form.ends} onChange={(e) => set("ends", e.target.value)} placeholder="31 Aug" />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            className="input"
            style={{ width: "100%", height: 70, padding: "8px 10px", lineHeight: 1.5, resize: "vertical" }}
            value={form.description} onChange={(e) => set("description", e.target.value)}
            placeholder="What this campaign funds…"
          />
        </Field>

        {err && (
          <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>{err}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy}>
            {busy ? "Creating…" : <><Icon name="check" size={13} />Create campaign</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

const PAYMENT_METHODS = ["Bank transfer", "UPI", "Cheque", "Cash", "Credit card", "Demand draft"];

function DonateModal({ donor, campaigns = [], onClose, onSubmit }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    amount: "", method: "Bank transfer", memo: "", campaignId: "",
  });
  const amtRef = useRef(null);
  useEffect(() => { amtRef.current?.focus(); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setErr(""); setBusy(true);
    try {
      const amount = Number(form.amount);
      if (!amount || amount < 1) throw new Error("Enter a positive donation amount");
      await onSubmit({
        amount,
        method: form.method,
        memo: form.memo.trim() || null,
        campaignId: form.campaignId || null,
      });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  const niceAmount = form.amount ? `₹${Number(form.amount).toLocaleString("en-IN")}` : "—";

  return (
    <ModalShell title={`Record donation · ${donor.name}`} sub={`${donor.id} · ${donor.type}`} onClose={onClose} width={480}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Amount (₹) *" hint={`Will be added to YTD: ${money(donor.ytd)} → ${form.amount ? money((Number(donor.ytd) || 0) + Number(form.amount)) : money(donor.ytd)}`}>
          <input
            ref={amtRef} className="input" inputMode="numeric"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value.replace(/\D/g, ""))}
            placeholder="50000"
          />
        </Field>
        <Field label="Payment method">
          <select className="select" value={form.method} onChange={(e) => set("method", e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        {campaigns.length > 0 && (
          <Field label="Tag to campaign (optional)">
            <select className="select" value={form.campaignId} onChange={(e) => set("campaignId", e.target.value)}>
              <option value="">— general donation —</option>
              {campaigns.filter((c) => c.status !== "completed").map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Memo / reference (optional)" hint="e.g. cheque number, CSR PO#, transaction id">
          <input className="input" value={form.memo} onChange={(e) => set("memo", e.target.value)} placeholder="UPI ref, PO#…" />
        </Field>

        {err && (
          <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>{err}</div>
        )}

        <div style={{ background: "var(--bg-2)", border: "1px dashed var(--rule)", borderRadius: 8, padding: "10px 12px", fontSize: 11.5, color: "var(--ink-3)" }}>
          A unique 80G-style receipt will be auto-generated for <b style={{ color: "var(--ink)" }}>{niceAmount}</b> as soon as you save.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy || !form.amount}>
            {busy ? "Saving…" : <><Icon name="check" size={13} />Record & generate receipt</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// Standalone receipt preview — printable A5-ish layout, with print + close.
function ReceiptModal({ receipt, onClose }) {
  const print = () => {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    const doc = w.document;
    doc.title = `Receipt ${receipt.id}`;
    const style = doc.createElement("style");
    style.textContent = `
      body { font-family: ui-sans-serif, system-ui, sans-serif; padding: 32px; color: #20140c; }
      .head { border-bottom: 2px solid #20140c; padding-bottom: 12px; margin-bottom: 18px; }
      .title { font-size: 22px; font-weight: 600; margin: 0; }
      .sub { color: #806b58; font-size: 13px; margin-top: 4px; }
      .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
      .row .lbl { color: #806b58; }
      .amount { font-size: 28px; font-weight: 600; margin: 18px 0 12px; }
      .stamp { margin-top: 28px; font-size: 11px; color: #806b58; border-top: 1px dashed #ccc; padding-top: 10px; }
    `;
    doc.head.appendChild(style);
    doc.body.innerHTML = `
      <div class="head"><div class="title">Donation receipt</div><div class="sub">Stansford International HR.Sec.School &middot; Vidyalaya360</div></div>
      <div class="row"><span class="lbl">Receipt #</span><span><b>${receipt.id}</b></span></div>
      <div class="row"><span class="lbl">Issued</span><span>${receipt.issuedAtLabel}</span></div>
      <div class="row"><span class="lbl">Donor</span><span>${receipt.donorName} (${receipt.donorId})</span></div>
      <div class="row"><span class="lbl">Type</span><span>${receipt.donorType}</span></div>
      <div class="row"><span class="lbl">Method</span><span>${receipt.method}</span></div>
      ${receipt.memo ? `<div class="row"><span class="lbl">Memo</span><span>${receipt.memo}</span></div>` : ""}
      <div class="amount">&#8377;${receipt.amount.toLocaleString("en-IN")}</div>
      <div class="stamp">Auto-generated. Eligible for 80G deduction subject to school's registered status. Retain for tax records.</div>
    `;
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  return (
    <ModalShell title="Donation receipt generated" sub="Auto-numbered · printable" onClose={onClose} width={460}>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "var(--bg-2)", borderRadius: 10, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 500 }}>Receipt #</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>{receipt.id}</div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 600, color: "var(--ink)", letterSpacing: -0.01 }}>
            ₹{receipt.amount.toLocaleString("en-IN")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", fontSize: 12 }}>
            <span style={{ color: "var(--ink-4)" }}>Donor</span><span style={{ color: "var(--ink)" }}>{receipt.donorName}</span>
            <span style={{ color: "var(--ink-4)" }}>Type</span><span style={{ color: "var(--ink-2)" }}>{receipt.donorType}</span>
            <span style={{ color: "var(--ink-4)" }}>Method</span><span style={{ color: "var(--ink-2)" }}>{receipt.method}</span>
            {receipt.memo && (<><span style={{ color: "var(--ink-4)" }}>Memo</span><span style={{ color: "var(--ink-2)" }}>{receipt.memo}</span></>)}
            <span style={{ color: "var(--ink-4)" }}>Issued</span><span style={{ color: "var(--ink-2)" }}>{receipt.issuedAtLabel}</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-4)" }}>
          Eligible for 80G deduction subject to the school's registered status. The donor's YTD total has been updated.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Close</button>
          <button type="button" className="btn accent" onClick={print}>
            <Icon name="download" size={13} />Print receipt
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// Browse all past receipts — either for a single donor (scope = donor object)
// or across every donor (scope = "*"). Each row has a Print button that
// re-opens the printable ReceiptModal. Footer has CSV export of the visible list.
function ReceiptsListModal({ scope, receipts = [], onClose, onPreview, onExport }) {
  const isAll = scope === "*";
  const title = isAll ? "All donation receipts" : `Receipts · ${scope.name}`;
  const sub = isAll
    ? `${receipts.length} receipt${receipts.length === 1 ? "" : "s"} · ${money(receipts.reduce((a, r) => a + (r.amount || 0), 0))} total`
    : `${scope.id} · ${scope.type} · ${receipts.length} receipt${receipts.length === 1 ? "" : "s"}`;

  return (
    <ModalShell title={title} sub={sub} onClose={onClose} width={620}>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {receipts.length === 0 ? (
          <div className="empty">No receipts yet. Record a donation to generate one.</div>
        ) : (
          <div style={{ maxHeight: 380, overflowY: "auto", border: "1px solid var(--rule)", borderRadius: 8 }}>
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Receipt #</th>
                  {isAll && <th>Donor</th>}
                  <th>Issued</th>
                  <th className="num">Amount</th>
                  <th>Method</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-2)" }}>{r.id}</td>
                    {isAll && (
                      <td style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 500 }}>{r.donorName}</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{r.donorId}</div>
                      </td>
                    )}
                    <td style={{ fontSize: 11.5, color: "var(--ink-3)", whiteSpace: "nowrap" }}>{r.issuedAtLabel}</td>
                    <td className="num" style={{ fontWeight: 500 }}>₹{(r.amount || 0).toLocaleString("en-IN")}</td>
                    <td><span className="chip" style={{ fontSize: 10.5 }}>{r.method}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn sm" onClick={() => onPreview(r)} title="Preview & print">
                        <Icon name="download" size={11} />Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <button type="button" className="btn" onClick={onExport} disabled={receipts.length === 0}>
            <Icon name="download" size={13} />Export CSV
          </button>
          <button type="button" className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </ModalShell>
  );
}
