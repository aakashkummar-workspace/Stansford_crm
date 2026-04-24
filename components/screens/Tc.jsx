"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI } from "../ui";

const STATUS_LABEL = { requested: "Requested", approved: "Approved", issued: "Issued", rejected: "Rejected" };
const STATUS_TONE  = { requested: "", approved: "warn", issued: "ok", rejected: "bad" };

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

export default function ScreenTc({ E, refresh, role }) {
  const canEdit = role === "admin" || role === "principal";
  const [requests, setRequests] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [printingTc, setPrintingTc] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (m, t) => { setToast({ msg: m, tone: t }); setTimeout(() => setToast(null), 3000); };

  async function load() {
    try {
      const r = await fetch("/api/tc", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) setRequests(j.requests || []);
    } catch {}
  }
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    total: requests.length,
    requested: requests.filter((r) => r.status === "requested").length,
    issued: requests.filter((r) => r.status === "issued").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }), [requests]);

  async function handleAdd(payload) {
    const r = await fetch("/api/tc", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
    setShowAdd(false);
    showToast(`TC request ${j.request.id} created`, "ok");
    await load();
    await refresh?.();
  }

  async function patch(tc, status) {
    try {
      const r = await fetch("/api/tc", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: tc.id, status }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
      showToast(`TC ${status === "issued" ? "issued — " + j.request.serialNo : status}`, "ok");
      await load();
    } catch (e) { showToast(e.message, "err"); }
  }

  async function remove(tc) {
    if (!confirm(`Remove TC request ${tc.id}?`)) return;
    try {
      const r = await fetch("/api/tc", {
        method: "DELETE", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: tc.id }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
      showToast("Removed", "ok");
      await load();
    } catch (e) { showToast(e.message, "err"); }
  }

  return (
    <div className="page">
      <Toast msg={toast?.msg} tone={toast?.tone} onClose={() => setToast(null)} />

      <div className="page-head">
        <div>
          <div className="page-eyebrow">People · Records</div>
          <div className="page-title">Transfer <span className="amber">Certificates</span></div>
          <div className="page-sub">Request → approve → issue printable TC with auto serial number</div>
        </div>
        {canEdit && (
          <div className="page-actions">
            <button className="btn accent" onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={13} />New TC request
            </button>
          </div>
        )}
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Total requests" value={counts.total} sub="all-time" puck="mint" puckIcon="reports" />
        <KPI label="Awaiting" value={counts.requested} sub={counts.requested ? "needs action" : "none pending"} puck="cream" puckIcon="clock" />
        <KPI label="Issued" value={counts.issued} sub="printed & handed over" puck="peach" puckIcon="check" />
        <KPI label="Rejected" value={counts.rejected} sub="declined" puck="rose" puckIcon="x" />
      </div>

      <div className="card">
        <div className="card-head">
          <div><div className="card-title">All TC requests</div><div className="card-sub">Newest first</div></div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr><th>TC #</th><th>Student</th><th>Class</th><th>Reason</th><th>Status</th><th>Serial</th><th></th></tr>
            </thead>
            <tbody>
              {requests.length === 0 && <tr><td colSpan={7} className="empty">No TC requests yet.</td></tr>}
              {requests.map((tc) => (
                <tr key={tc.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>{tc.id}</td>
                  <td>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{tc.studentName}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{tc.studentId}</div>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{tc.cls}</td>
                  <td style={{ fontSize: 11.5, color: "var(--ink-3)", maxWidth: 240 }}>{tc.reason || "—"}</td>
                  <td><span className={`chip ${STATUS_TONE[tc.status]}`}><span className="dot" />{STATUS_LABEL[tc.status]}</span></td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{tc.serialNo || "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      {canEdit && tc.status === "requested" && (
                        <>
                          <button className="btn sm" onClick={() => patch(tc, "approved")}>Approve</button>
                          <button className="btn sm ghost" onClick={() => patch(tc, "rejected")}>Reject</button>
                        </>
                      )}
                      {canEdit && tc.status === "approved" && (
                        <button className="btn sm accent" onClick={() => patch(tc, "issued")}>
                          <Icon name="check" size={11} />Issue
                        </button>
                      )}
                      {tc.status === "issued" && (
                        <button className="btn sm" onClick={() => setPrintingTc(tc)}>
                          <Icon name="download" size={11} />Print
                        </button>
                      )}
                      {canEdit && (
                        <button className="icon-btn" onClick={() => remove(tc)} title="Remove"><Icon name="x" size={12} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && canEdit && (
        <AddTcModal students={E.ADDED_STUDENTS || []} onClose={() => setShowAdd(false)} onSubmit={handleAdd} />
      )}
      {printingTc && (
        <PrintTcModal tc={printingTc} onClose={() => setPrintingTc(null)} />
      )}
    </div>
  );
}

function AddTcModal({ students, onClose, onSubmit }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ studentId: "", reason: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const stu = students.find((s) => s.id === form.studentId);
      if (!stu) throw new Error("Pick a student");
      await onSubmit({
        studentId: stu.id,
        studentName: stu.name,
        cls: stu.cls,
        reason: form.reason.trim() || null,
      });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <ModalShell title="New TC request" sub="Mark a student for transfer / TC issuance" onClose={onClose}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Student *" hint={`${students.length} students on roll`}>
          <select className="select" value={form.studentId} onChange={(e) => set("studentId", e.target.value)}>
            <option value="">— pick a student —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {s.cls} · {s.id}</option>
            ))}
          </select>
        </Field>
        <Field label="Reason (optional)" hint="e.g. Family relocation, change of school">
          <textarea
            className="input"
            style={{ width: "100%", height: 72, padding: "8px 10px", lineHeight: 1.5, resize: "vertical" }}
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
            placeholder="Reason for transfer…"
          />
        </Field>
        {err && <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy || !form.studentId}>
            {busy ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function PrintTcModal({ tc, onClose }) {
  const print = () => {
    const w = window.open("", "_blank", "width=820,height=1100");
    if (!w) return;
    const doc = w.document;
    doc.title = `TC ${tc.serialNo}`;
    const style = doc.createElement("style");
    style.textContent = `
      body { font-family: ui-serif, Georgia, "Times New Roman", serif; padding: 60px 60px; color: #20140c; }
      .head { text-align: center; border-bottom: 2px solid #20140c; padding-bottom: 12px; margin-bottom: 24px; }
      .school { font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
      .sub { font-size: 12px; color: #555; margin-top: 4px; }
      .title { text-align: center; font-size: 20px; font-weight: 600; margin: 22px 0 6px; text-decoration: underline; }
      .serial { text-align: right; font-size: 12px; color: #555; margin-bottom: 8px; }
      .row { padding: 6px 0; font-size: 13px; border-bottom: 1px dotted #ccc; display: flex; }
      .row .lbl { color: #666; width: 220px; flex-shrink: 0; }
      .body { font-size: 13px; line-height: 1.7; margin-top: 18px; }
      .sign { margin-top: 80px; display: flex; justify-content: space-between; font-size: 12px; color: #444; }
      .sign div { border-top: 1px solid #20140c; padding-top: 6px; min-width: 200px; text-align: center; }
    `;
    doc.head.appendChild(style);
    doc.body.innerHTML = `
      <div class="head">
        <div class="school">Stansford International HR.Sec.School</div>
        <div class="sub">Run by Stansford Educational Trust &middot; Vidyalaya360</div>
      </div>
      <div class="serial">Serial No: <b>${tc.serialNo}</b><br/>Date: ${new Date(tc.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
      <div class="title">TRANSFER CERTIFICATE</div>
      <div class="row"><span class="lbl">1. Name of the student</span><span>${tc.studentName}</span></div>
      <div class="row"><span class="lbl">2. Student ID</span><span>${tc.studentId}</span></div>
      <div class="row"><span class="lbl">3. Class &amp; Section last attended</span><span>${tc.cls}</span></div>
      <div class="row"><span class="lbl">4. Date of admission to school</span><span>—</span></div>
      <div class="row"><span class="lbl">5. Date of leaving the school</span><span>${new Date(tc.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span></div>
      <div class="row"><span class="lbl">6. Reason for leaving</span><span>${tc.reason || "—"}</span></div>
      <div class="row"><span class="lbl">7. Conduct &amp; character</span><span>Good</span></div>
      <div class="row"><span class="lbl">8. Whether qualified for promotion</span><span>Yes</span></div>
      <div class="row"><span class="lbl">9. Any dues outstanding</span><span>None</span></div>

      <div class="body">
        Certified that the above particulars are correct as per the school records and that the student bearing the
        above-named details has been granted Transfer Certificate to enable continuance of studies elsewhere.
      </div>

      <div class="sign">
        <div>Class Teacher</div>
        <div>Principal</div>
        <div>School Seal</div>
      </div>
    `;
    w.focus();
    setTimeout(() => w.print(), 250);
  };

  return (
    <ModalShell title={`Transfer Certificate · ${tc.serialNo}`} sub={`${tc.studentName} (${tc.cls})`} onClose={onClose} width={500}>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ background: "var(--bg-2)", padding: 14, borderRadius: 10, fontSize: 12, lineHeight: 1.6 }}>
          Issued <b>{new Date(tc.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</b> by <b>{tc.issuedBy}</b><br/>
          Reason: {tc.reason || "—"}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn ghost" onClick={onClose}>Close</button>
          <button className="btn accent" onClick={print}><Icon name="download" size={13} />Print TC</button>
        </div>
      </div>
    </ModalShell>
  );
}
