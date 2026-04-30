"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import { KPI } from "../ui";
import { resolveSchool, downloadPdf } from "@/lib/export";

const DOC_TYPES = [
  { k: "registration", label: "Trust registration" },
  { k: "80g",          label: "80G certificate" },
  { k: "12a",          label: "12A registration" },
  { k: "noc",          label: "NOC / Building" },
  { k: "fire",         label: "Fire safety" },
  { k: "tax",          label: "Tax / GST" },
  { k: "license",      label: "Licence" },
  { k: "other",        label: "Other" },
];

const DOC_TYPE_LABEL = Object.fromEntries(DOC_TYPES.map((t) => [t.k, t.label]));

// How an expiry date should be presented + flagged. Returns
// { tone, label, days } where days is signed: negative = expired.
function expiryStatus(expiryDate) {
  if (!expiryDate) return { tone: "info", label: "No expiry", days: null };
  const exp = new Date(`${expiryDate}T00:00:00`);
  if (Number.isNaN(exp.getTime())) return { tone: "info", label: "—", days: null };
  const now = new Date();
  const days = Math.round((exp - now) / 86_400_000);
  if (days < 0)  return { tone: "bad",  label: `Expired ${Math.abs(days)}d ago`, days };
  if (days <= 30) return { tone: "warn", label: `Expires in ${days}d`, days };
  if (days <= 90) return { tone: "info", label: `Expires in ${days}d`, days };
  return { tone: "ok", label: `Valid · ${days}d`, days };
}

export default function ScreenGovernmentDocuments({ E, role, session, refresh }) {
  const isAdmin = role === "admin";
  const [items, setItems] = useState(E.GOVERNMENT_DOCUMENTS || []);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");  // all | expired | soon | valid
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const flash = (msg, tone = "ok") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2400);
  };

  async function reload() {
    try {
      const r = await fetch("/api/government-documents", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (j?.ok) setItems(j.items || []);
    } catch {}
  }
  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((d) => {
      if (filterType !== "all" && (d.documentType || "other") !== filterType) return false;
      if (filterStatus !== "all") {
        const st = expiryStatus(d.expiryDate);
        if (filterStatus === "expired" && st.tone !== "bad") return false;
        if (filterStatus === "soon"    && st.tone !== "warn") return false;
        if (filterStatus === "valid"   && st.tone !== "ok")   return false;
      }
      if (term) {
        const blob = `${d.title} ${d.notes || ""} ${d.documentType || ""}`.toLowerCase();
        if (!blob.includes(term)) return false;
      }
      return true;
    });
  }, [items, filterType, filterStatus, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filterType, filterStatus, q]);

  const counts = useMemo(() => {
    let total = items.length, expired = 0, soon = 0, missing = 0;
    for (const d of items) {
      const st = expiryStatus(d.expiryDate);
      if (st.tone === "bad")  expired++;
      else if (st.tone === "warn") soon++;
      if (!d.expiryDate) missing++;
    }
    return { total, expired, soon, missing };
  }, [items]);

  async function submitForm(payload) {
    const id = payload.id;
    const url = "/api/government-documents";
    const method = id ? "PATCH" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
    setShowForm(false);
    setEditing(null);
    flash(id ? "Document updated" : "Document added", "ok");
    await reload();
    await refresh?.();
  }

  async function remove(d) {
    if (!confirm(`Remove "${d.title}" from the vault?`)) return;
    setBusy(d.id);
    try {
      const r = await fetch("/api/government-documents", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: d.id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
      flash("Removed", "ok");
      await reload();
      await refresh?.();
    } catch (e) {
      flash(e.message || "Failed", "err");
    } finally {
      setBusy(null);
    }
  }

  const school = resolveSchool(E.SETTINGS);
  const actor  = session?.name || null;

  function exportPdf() {
    const expired = filtered.filter((d) => expiryStatus(d.expiryDate).label === "Expired").length;
    const expiring = filtered.filter((d) => {
      const lbl = expiryStatus(d.expiryDate).label;
      return lbl !== "Expired" && lbl !== "Valid" && lbl !== "—";
    }).length;
    downloadPdf({
      title: "Government Documents Register",
      subtitle: `${filtered.length} document${filtered.length === 1 ? "" : "s"} on file`,
      school, actor,
      dateRange: "Current snapshot",
      orientation: "landscape",
      summary: [
        { label: "Total documents", value: filtered.length },
        { label: "Expired",         value: expired },
        { label: "Expiring soon",   value: expiring },
        { label: "Distinct types",  value: new Set(filtered.map((d) => d.documentType)).size },
      ],
      columns: [
        { key: "i",          label: "#",        align: "right",  width: "32px" },
        { key: "id",         label: "ID",       width: "100px" },
        { key: "title",      label: "Title" },
        { key: "type",       label: "Type",     width: "150px" },
        { key: "expiry",     label: "Expiry",   align: "right",  width: "100px" },
        { key: "status",     label: "Status",   align: "center", width: "100px" },
        { key: "notes",      label: "Notes" },
        { key: "uploaded",   label: "Uploaded", align: "right",  width: "130px" },
      ],
      rows: filtered.map((d, i) => ({
        i: i + 1, id: d.id,
        title: d.title || "—",
        type: DOC_TYPE_LABEL[d.documentType] || d.documentType || "—",
        expiry: d.expiryDate || "—",
        status: expiryStatus(d.expiryDate).label,
        notes: d.notes || "—",
        uploaded: d.createdAt ? new Date(d.createdAt).toLocaleString("en-IN") : "—",
      })),
      filename: `${school.name.replace(/\s+/g, "-").toLowerCase()}-government-documents-${new Date().toISOString().slice(0, 10)}`,
    });
  }

  return (
    <div className="page">
      {toast && (
        <div role="status" style={{
          position: "fixed", bottom: 18, right: 18, zIndex: 9000,
          background: toast.tone === "err" ? "var(--bad, #b13c1c)" : "var(--ok)",
          color: "#fff", padding: "9px 14px", borderRadius: 8,
          fontSize: 12, fontWeight: 700,
        }}>{toast.msg}</div>
      )}

      <div className="page-head">
        <div>
          <div className="page-eyebrow">Governance · Compliance</div>
          <div className="page-title">Government <span className="amber">documents</span></div>
          <div className="page-sub">
            Trust registration, 80G / 12A certificates, building NOC, fire safety,
            licences. Track expiry dates so renewals never lapse.
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={exportPdf} disabled={filtered.length === 0} title="Open a printable, branded PDF report">
            <Icon name="download" size={13} />Export PDF
          </button>
          {isAdmin && (
            <button className="btn accent" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Icon name="plus" size={13} />Add document
            </button>
          )}
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 18 }}>
        <KPI label="Documents on file" value={counts.total} sub="all categories" puck="cream" puckIcon="audit" />
        <KPI label="Expired" value={counts.expired} sub="needs renewal now" puck="rose" puckIcon="warning" />
        <KPI label="Expiring within 30d" value={counts.soon} sub="schedule renewal" puck="peach" puckIcon="warning" />
        <KPI label="No expiry on file" value={counts.missing} sub="add expiry date" puck="sky" puckIcon="settings" />
      </div>

      <div className="card" style={{ marginBottom: 14, padding: "10px 14px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="input"
          placeholder="Search title, notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All types</option>
          {DOC_TYPES.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}
        </select>
        <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="expired">Expired</option>
          <option value="soon">Expiring soon</option>
          <option value="valid">Valid</option>
        </select>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">{filtered.length} document{filtered.length === 1 ? "" : "s"}</div>
            <div className="card-sub">Page {page} of {totalPages}</div>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty" style={{ padding: 36 }}>No documents match the filters.</div>
        ) : (
          <div>
            {paged.map((d) => {
              const st = expiryStatus(d.expiryDate);
              return (
                <div key={d.id} className="lrow" style={{ alignItems: "flex-start", gap: 12, paddingTop: 12, paddingBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon name="reports" size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{d.title}</span>
                      {d.documentType && <span className="chip">{DOC_TYPE_LABEL[d.documentType] || d.documentType}</span>}
                      <span className={`chip ${st.tone}`}><span className="dot" />{st.label}</span>
                    </div>
                    {d.notes && (
                      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>{d.notes}</div>
                    )}
                    <div style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>{d.id}</span>
                      {d.expiryDate && <span>Expiry · {d.expiryDate}</span>}
                      {d.fileUrl && (
                        // Uploaded files (data: URI) carry the original filename
                        // so the download keeps a sensible name; external links
                        // just open in a new tab.
                        /^data:/.test(d.fileUrl) ? (
                          <a
                            href={d.fileUrl}
                            download={d.fileName || `${d.title || "document"}.pdf`}
                            style={{ color: "var(--brand, #1f3f8b)", fontWeight: 700 }}
                            title="Download the uploaded file"
                          >
                            Download file ↓
                          </a>
                        ) : (
                          <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--brand, #1f3f8b)", fontWeight: 700 }}>
                            Open file →
                          </a>
                        )
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="btn sm" onClick={() => { setEditing(d); setShowForm(true); }}>Edit</button>
                      <button className="btn sm" onClick={() => remove(d)} disabled={busy === d.id}>Remove</button>
                    </div>
                  )}
                </div>
              );
            })}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: 12, borderTop: "1px solid var(--rule)" }}>
                <button className="btn sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Previous</button>
                <span style={{ fontSize: 12, fontWeight: 600, padding: "6px 10px" }}>{page} / {totalPages}</span>
                <button className="btn sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <DocFormModal
          existing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSubmit={submitForm}
        />
      )}
    </div>
  );
}

function DocFormModal({ existing, onClose, onSubmit }) {
  // Decide whether the existing fileUrl is an uploaded data URI or an
  // external link, so we can show the right preview.
  const existingIsUpload = !!existing?.fileUrl && /^data:/.test(existing.fileUrl);
  const [form, setForm] = useState({
    id: existing?.id || null,
    title: existing?.title || "",
    documentType: existing?.documentType || "registration",
    fileUrl: existing?.fileUrl || "",
    fileLink: existingIsUpload ? "" : (existing?.fileUrl || ""),
    fileName: existing?.fileName || (existingIsUpload ? "Uploaded file" : ""),
    fileSize: existing?.fileSize || 0,
    fileType: existing?.fileType || "",
    expiryDate: existing?.expiryDate || "",
    notes: existing?.notes || "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Read a chosen file as a base64 data URI. Hard 8 MB cap — anything bigger
  // bloats db.json / Supabase rows; ask the admin to host it on Drive instead.
  async function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const MAX = 8 * 1024 * 1024;
    if (f.size > MAX) {
      setErr(`File is ${(f.size / 1024 / 1024).toFixed(1)} MB — please keep it under 8 MB or paste a Drive / S3 link instead.`);
      e.target.value = "";
      return;
    }
    setErr("");
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(f);
      });
      setForm((s) => ({
        ...s,
        fileUrl: dataUrl,        // stored as the canonical file pointer
        fileLink: "",            // clear the link mode — upload wins
        fileName: f.name,
        fileSize: f.size,
        fileType: f.type || "application/octet-stream",
      }));
    } catch (ex) { setErr(ex.message); }
    finally { setUploading(false); }
  }

  function clearFile() {
    setForm((s) => ({ ...s, fileUrl: "", fileName: "", fileSize: 0, fileType: "" }));
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!form.title.trim()) { setErr("Title required"); return; }
    // Resolve which pointer to send: uploaded file wins; otherwise the
    // pasted external link; otherwise null.
    const finalUrl = form.fileUrl || form.fileLink.trim() || null;
    setBusy(true); setErr("");
    try {
      await onSubmit({
        id: form.id || undefined,
        title: form.title.trim(),
        documentType: form.documentType,
        fileUrl: finalUrl,
        fileName: form.fileName || null,
        fileSize: form.fileSize || null,
        fileType: form.fileType || null,
        expiryDate: form.expiryDate || null,
        notes: form.notes.trim() || null,
      });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  const hasUpload = !!form.fileUrl && /^data:/.test(form.fileUrl);
  const fmtSize = (b) => {
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      zIndex: 250, display: "grid", placeItems: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 520, maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}>
        <div className="card-head">
          <div>
            <div className="card-title">{existing ? "Edit document" : "Add government document"}</div>
            <div className="card-sub">Track legal / compliance documents and their renewal dates.</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Title *">
            <input className="input" required maxLength={120} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. 80G Certificate FY 2025-26" autoFocus />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Type">
              <select className="select" value={form.documentType} onChange={(e) => set("documentType", e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t.k} value={t.k}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Expiry date">
              <input type="date" className="input" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
            </Field>
          </div>
          <Field label="Document file" hint="Upload the scanned PDF / image. Max 8 MB.">
            {!hasUpload ? (
              <label
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 10, padding: "14px 12px",
                  background: "var(--bg-2)",
                  border: "1.5px dashed var(--rule, #d4cfbe)",
                  borderRadius: 8, cursor: "pointer",
                  fontSize: 12.5, color: "var(--ink-2)",
                  transition: "border-color .15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--rule, #d4cfbe)"; }}
              >
                <Icon name="upload" size={14} />
                <span>{uploading ? "Reading file…" : "Click to choose a PDF or image"}</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                  onChange={handleFile}
                  disabled={uploading}
                  style={{ display: "none" }}
                />
              </label>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px",
                background: "var(--ok-soft, #e7f3e8)",
                border: "1px solid var(--ok)",
                borderRadius: 8,
                fontSize: 12.5,
              }}>
                <Icon name="check" size={14} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {form.fileName || "Uploaded file"}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 2 }}>
                    {form.fileType || "file"}{form.fileSize ? ` · ${fmtSize(form.fileSize)}` : ""}
                  </div>
                </div>
                <a
                  href={form.fileUrl}
                  target="_blank" rel="noopener noreferrer"
                  className="btn sm ghost"
                  title="Open uploaded file in a new tab"
                >Preview</a>
                <button type="button" className="btn sm ghost" onClick={clearFile} title="Remove the uploaded file">
                  <Icon name="x" size={11} />
                </button>
              </div>
            )}
          </Field>
          <Field label="Or paste a link" hint="Drive / S3 / SharePoint link — used when the file is too big to upload here.">
            <input
              className="input"
              value={form.fileLink}
              onChange={(e) => set("fileLink", e.target.value)}
              placeholder="https://drive.google.com/…"
              disabled={hasUpload}
            />
          </Field>
          <Field label="Notes">
            <textarea
              className="input" rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value.slice(0, 500))}
              placeholder="Issuing authority, reference number, anything else."
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </Field>
          {err && <div style={{ background: "var(--bad-soft, #fbe1d8)", color: "var(--bad, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700 }}>{err}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn accent" disabled={busy || !form.title.trim()}>
              {busy ? "Saving…" : <><Icon name="check" size={13} />{existing ? "Update" : "Save"}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)" }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 10.5, color: "var(--ink-4)", fontWeight: 700 }}>{hint}</span>}
    </label>
  );
}

