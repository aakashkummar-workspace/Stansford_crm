"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip } from "../ui";

const SOURCES = ["Website", "Walk-in", "Referral", "Phone", "Instagram", "Facebook", "Google", "Other"];
const COLUMNS = [
  { s: "New",       tone: "info", desc: "Just in · needs first call" },
  { s: "Contacted", tone: "warn", desc: "Follow-up in progress" },
  { s: "Converted", tone: "ok",   desc: "Admission confirmed" },
  { s: "Rejected",  tone: "bad",  desc: "Not a fit · archived" },
];

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

function ModalShell({ title, sub, onClose, children, width = 480 }) {
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

export default function ScreenEnquiries({ E, refresh, role }) {
  const canEdit = role === "principal" || role === "admin" || role === "academic_director";
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);

  const data = E.ENQUIRIES || [];
  const classes = E.CLASSES || [];

  const counts = useMemo(() => {
    const c = { New: 0, Contacted: 0, Converted: 0, Rejected: 0 };
    data.forEach((e) => { if (c[e.status] !== undefined) c[e.status]++; });
    return c;
  }, [data]);

  const showToast = (msg, tone) => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3500);
  };

  async function setStatus(id, status) {
    try {
      const r = await fetch("/api/enquiries", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast(`${json.enquiry.name} → ${status}`, "ok");
      await refresh?.();
    } catch (e) { showToast(e.message, "err"); }
  }

  async function handleAdd(payload) {
    const r = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || !json.ok) throw new Error(json.error || "Failed to add");
    setShowAdd(false);
    showToast(`Enquiry added: ${json.enquiry.name}`, "ok");
    await refresh?.();
  }

  function exportCsv() {
    if (data.length === 0) {
      showToast("No enquiries to export", "err");
      return;
    }
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const header = ["#", "ID", "Student name", "Parent", "Phone", "Class", "Source", "Status", "Date received"];
    const csv = [
      `# Vidyalaya360 — Admission Enquiries — ${today}`,
      `# Generated: ${new Date().toLocaleString("en-IN")}`,
      `# Counts: New=${counts.New} · Contacted=${counts.Contacted} · Converted=${counts.Converted} · Rejected=${counts.Rejected}`,
      header.join(","),
      ...data.map((e, i) => [
        i + 1, e.id, csvEscape(e.name), csvEscape(e.parent), csvEscape(e.phone),
        e.cls, csvEscape(e.source), e.status, csvEscape(e.date),
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enquiries-${today.replace(/\s+/g, "-").toLowerCase()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${data.length} enquiries`, "ok");
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">CRM · Admissions</div>
          <div className="page-title">Admission <span className="amber">enquiries</span></div>
          <div className="page-sub">Pipeline · source tracking · conversion</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={exportCsv} disabled={data.length === 0}>
            <Icon name="download" size={13} />Export
          </button>
          {canEdit && (
            <button className="btn accent" onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={13} />New enquiry
            </button>
          )}
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Open pipeline" value={counts.New + counts.Contacted} sub="awaiting follow-up" puck="mint" puckIcon="enquiry" />
        <KPI label="Converted" value={counts.Converted} sub="admissions confirmed" puck="cream" puckIcon="check" />
        <KPI label="Rejected" value={counts.Rejected} sub="archived" puck="peach" puckIcon="x" />
        <KPI label="Total enquiries" value={data.length} sub="all-time" puck="sky" puckIcon="trending" />
      </div>

      <div className="grid g-12">
        <div className="col-12" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {COLUMNS.map((col) => {
            const items = data.filter((e) => e.status === col.s);
            return (
              <div key={col.s} className="card">
                <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--rule)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`chip ${col.tone}`}><span className="dot" />{col.s}</span>
                    <span className="mono" style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)" }}>{items.length}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>{col.desc}</div>
                </div>
                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, minHeight: 220 }}>
                  {items.length === 0 && (
                    <div className="empty" style={{ padding: "20px 8px", fontSize: 11.5 }}>
                      {col.s === "New" ? "Add enquiries to start the pipeline" : `No ${col.s.toLowerCase()} enquiries`}
                    </div>
                  )}
                  {items.map((e) => (
                    <EnquiryCard
                      key={e.id} enquiry={e} status={col.s} canEdit={canEdit}
                      onSetStatus={setStatus}
                      onCall={() => showToast(`Calling ${e.parent} (${e.phone})…`, "ok")}
                      onWhatsApp={() => showToast(`WhatsApp drafted to ${e.parent}`, "ok")}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAdd && canEdit && (
        <NewEnquiryModal classes={classes} onClose={() => setShowAdd(false)} onSubmit={handleAdd} />
      )}

      <Toast msg={toast?.msg} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function EnquiryCard({ enquiry, status, canEdit, onSetStatus, onCall, onWhatsApp }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const e = enquiry;
  // Forward action depends on column.
  const fwd = status === "New" ? "Contacted" : status === "Contacted" ? "Converted" : null;

  return (
    <div style={{ background: "var(--card-2)", border: "1px solid var(--rule-2)", borderRadius: 8, padding: 10, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <AvatarChip initials={(e.name || "?").split(" ").map((n) => n[0]).join("")} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{e.name}</div>
          <div style={{ fontSize: 10.5, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{e.id} · {e.date}</div>
        </div>
        {canEdit && (
          <div ref={menuRef} style={{ position: "relative" }}>
            <button className="icon-btn" onClick={() => setMenuOpen((s) => !s)} title="Move to…"><Icon name="more" size={13} /></button>
            {menuOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 4px)", minWidth: 160,
                background: "var(--card, #fff)", border: "1px solid var(--rule, #e5dfd1)",
                borderRadius: 8, padding: 4, zIndex: 50,
                boxShadow: "0 16px 40px -20px rgba(0,0,0,0.25)",
              }}>
                {COLUMNS.filter((c) => c.s !== status).map((c) => (
                  <button
                    key={c.s}
                    onClick={() => { setMenuOpen(false); onSetStatus(e.id, c.s); }}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "7px 10px", background: "transparent", border: 0, borderRadius: 5,
                      cursor: "pointer", color: "var(--ink-2)", fontSize: 12,
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--bg-2)")}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                  >
                    Move to {c.s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.5 }}>
        Class {e.cls} · {e.source}
        <br />
        {e.parent} · <span className="mono">{e.phone}</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
        <button className="btn sm" onClick={onCall} title="Call parent"><Icon name="phone" size={11} /></button>
        <button className="btn sm" onClick={onWhatsApp} title="WhatsApp parent"><Icon name="whatsapp" size={11} /></button>
        {canEdit && fwd && (
          <button className="btn sm accent" style={{ marginLeft: "auto" }} onClick={() => onSetStatus(e.id, fwd)}>
            {fwd === "Contacted" ? "Contact" : "Convert"}
          </button>
        )}
        {canEdit && status !== "Rejected" && status !== "Converted" && (
          <button className="btn sm ghost" onClick={() => onSetStatus(e.id, "Rejected")} title="Reject">
            <Icon name="x" size={11} />
          </button>
        )}
        {canEdit && (status === "Rejected" || status === "Converted") && (
          <button className="btn sm ghost" style={{ marginLeft: "auto" }} onClick={() => onSetStatus(e.id, "New")}>
            Re-open
          </button>
        )}
      </div>
    </div>
  );
}

function NewEnquiryModal({ classes, onClose, onSubmit }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "",
    parent: "",
    phone: "",
    cls: classes[0]?.n ? String(classes[0].n) : "1",
    source: "Website",
  });
  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      if (!form.name.trim()) throw new Error("Student name is required");
      await onSubmit({
        name: form.name.trim(),
        parent: form.parent.trim(),
        phone: form.phone.replace(/\D/g, ""),
        cls: Number(form.cls),
        source: form.source,
      });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <ModalShell title="New admission enquiry" sub="Auto-assigned ID · lands in 'New' column" onClose={onClose} width={480}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Prospective student name *">
          <input className="input" ref={nameRef} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Aanya Sharma" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: 10 }}>
          <Field label="Parent name">
            <input className="input" value={form.parent} onChange={(e) => set("parent", e.target.value)} placeholder="Parent / guardian" />
          </Field>
          <Field label="Class">
            <select className="select" value={form.cls} onChange={(e) => set("cls", e.target.value)}>
              {(classes.length ? classes : [{ n: 1, label: "Class 1" }, { n: 2, label: "Class 2" }, { n: 3, label: "Class 3" }, { n: 4, label: "Class 4" }, { n: 5, label: "Class 5" }, { n: 6, label: "Class 6" }, { n: 7, label: "Class 7" }, { n: 8, label: "Class 8" }]).map((c) => (
                <option key={c.n} value={c.n}>{c.label || `Class ${c.n}`}</option>
              ))}
            </select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Phone (10-digit Indian)" hint="Optional but recommended for follow-up">
            <input
              className="input" inputMode="numeric"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="98XXXXXXXX"
            />
          </Field>
          <Field label="Source">
            <select className="select" value={form.source} onChange={(e) => set("source", e.target.value)}>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        {err && (
          <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>{err}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy}>
            {busy ? "Adding…" : <><Icon name="check" size={13} />Add enquiry</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
