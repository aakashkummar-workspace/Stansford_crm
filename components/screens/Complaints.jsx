"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, StatusChip } from "../ui";

export default function ScreenComplaints({ E, refresh, role }) {
  const isParent = role === "parent";
  const isStaff = role === "principal" || role === "teacher" || role === "super";

  const [status, setStatus] = useState("All");
  const complaints = E.COMPLAINTS || [];
  const filtered = status === "All" ? complaints : complaints.filter((c) => c.status === status);

  // Toast feedback
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const flash = (msg, tone = "ok") => {
    setToast({ msg, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const child = isParent ? (E.ADDED_STUDENTS || [])[0] : null;
  const [showForm, setShowForm] = useState(false);

  const change = async (id, newStatus) => {
    try {
      const r = await fetch("/api/complaints", {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const json = await r.json().catch(() => ({}));
      if (json.ok) { flash(`Complaint → ${newStatus}`); await refresh?.(); }
      else flash(json.error || "Update failed", "bad");
    } catch (e) { flash("Network error", "bad"); }
  };

  const submitNew = async (form) => {
    try {
      const r = await fetch("/api/complaints", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          student: child ? child.name : "",
          studentId: child ? child.id : null,
          cls: child ? child.cls : "",
          parent: form.parent || (child ? `Parent of ${child.name}` : ""),
          issue: form.issue,
          type: form.type,
          submittedBy: "parent",
          assigned: form.type === "leave_request" ? "Class Teacher" : "Admin Desk",
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (json.ok) {
        flash(form.type === "leave_request" ? "Leave request submitted" : "Complaint submitted");
        await refresh?.();
        setShowForm(false);
      } else flash(json.error || "Could not submit", "bad");
    } catch (e) { flash("Network error", "bad"); }
  };

  return (
    <div className="page">
      <Toast toast={toast} />

      <div className="page-head">
        <div>
          <div className="page-eyebrow">{isParent ? "Family · Raise ticket" : "CRM · Complaints"}</div>
          <div className="page-title">
            {isParent ? <>Talk to <span className="amber">the school</span></> : <>Parent <span className="amber">complaints</span></>}
          </div>
          <div className="page-sub">
            {isParent
              ? "Raise a concern, or submit a leave request for your child. We respond as soon as possible."
              : "Open · in progress · resolved · auto-routed by category"}
          </div>
        </div>
        <div className="page-actions">
          {isParent ? (
            <button className="btn accent" onClick={() => setShowForm(true)}><Icon name="plus" size={13} />New ticket</button>
          ) : (
            <>
              <button className="btn"><Icon name="download" size={13} />Export</button>
              <button className="btn accent"><Icon name="plus" size={13} />Log complaint</button>
            </>
          )}
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label={isParent ? "My open" : "Open"} value={complaints.filter((c) => c.status === "Open").length} sub="needs action" puck="rose" puckIcon="warning" />
        <KPI label="In progress" value={complaints.filter((c) => c.status === "In Progress").length} sub="being handled" puck="peach" puckIcon="clock" />
        <KPI label="Resolved" value={complaints.filter((c) => c.status === "Resolved").length} sub="closed out" puck="mint" puckIcon="check" />
        <KPI label={isParent ? "Leave requests" : "Parent CSAT"}
          value={isParent ? complaints.filter((c) => c.type === "leave_request").length : "—"}
          sub={isParent ? "submitted by you" : "needs survey data"}
          puck="cream" puckIcon={isParent ? "calendar" : "heart"} />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">{isParent ? "Your tickets" : "Complaint queue"}</div>
            <div className="card-sub">{isParent ? "Tickets you've raised, with their current status" : "Auto-routed by category"}</div>
          </div>
          <div className="card-actions">
            <div className="segmented">
              {["All", "Open", "In Progress", "Resolved"].map((s) => (
                <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                {!isParent && <th>Student · Parent</th>}
                <th>Type</th>
                <th>Issue</th>
                {!isParent && <th>Assigned</th>}
                <th>Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={isParent ? 6 : 8} className="empty">
                  {isParent
                    ? `You haven't raised any tickets yet. Click "New ticket" to start.`
                    : "No complaints match this filter."}
                </td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-3)" }}>{c.id}</td>
                  {!isParent && (
                    <td>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{c.student} <span style={{ color: "var(--ink-4)", fontWeight: 400 }}>{c.cls}</span></div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{c.parent}</div>
                    </td>
                  )}
                  <td>
                    {c.type === "leave_request"
                      ? <span className="chip info"><Icon name="calendar" size={10} />Leave</span>
                      : <span className="chip"><span className="dot" />Issue</span>}
                  </td>
                  <td style={{ fontSize: 13, maxWidth: 420 }}>{c.issue}</td>
                  {!isParent && <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{c.assigned}</td>}
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{c.date}</td>
                  <td><StatusChip status={c.status} /></td>
                  <td>
                    {isStaff && (
                      <div style={{ display: "flex", gap: 4 }}>
                        {c.status === "Open" && <button className="btn sm" onClick={() => change(c.id, "In Progress")}>Start</button>}
                        {c.status === "In Progress" && <button className="btn sm accent" onClick={() => change(c.id, "Resolved")}>Resolve</button>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && child && (
        <NewTicketModal
          child={child}
          onClose={() => setShowForm(false)}
          onSubmit={submitNew}
        />
      )}
      {showForm && !child && (
        <NewTicketModal
          child={{ id: null, name: "", cls: "" }}
          onClose={() => setShowForm(false)}
          onSubmit={submitNew}
        />
      )}
    </div>
  );
}

// ---------- new ticket modal (parent) ----------
function NewTicketModal({ child, onClose, onSubmit }) {
  const [type, setType] = useState("general");
  const [issue, setIssue] = useState("");
  const [parentName, setParentName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!issue.trim()) return;
    setBusy(true);
    try { await onSubmit({ type, issue: issue.trim(), parent: parentName.trim() || (child.name ? `Parent of ${child.name}` : "Parent") }); }
    finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
      display: "grid", placeItems: "center", zIndex: 250, padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 520 }}>
        <div className="card-head">
          <div>
            <div className="card-title">{type === "leave_request" ? "Submit a leave request" : "Raise a ticket"}</div>
            <div className="card-sub">{child.name ? `${child.name} · Class ${child.cls}` : "For your child"}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Type">
            <div className="segmented">
              <button type="button" className={type === "general" ? "active" : ""} onClick={() => setType("general")}>
                <Icon name="complaint" size={11} />Complaint / issue
              </button>
              <button type="button" className={type === "leave_request" ? "active" : ""} onClick={() => setType("leave_request")}>
                <Icon name="calendar" size={11} />Leave request
              </button>
            </div>
          </Field>
          <Field label="Your name (optional)">
            <input className="input" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder={child.name ? `Parent of ${child.name}` : "Your name"} />
          </Field>
          <Field label={type === "leave_request" ? "Reason and dates" : "Describe the issue"}>
            <textarea
              className="input"
              autoFocus
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              style={{ width: "100%", height: 96, padding: "8px 10px", lineHeight: 1.5, resize: "vertical", fontFamily: "var(--font-sans)" }}
              placeholder={type === "leave_request"
                ? "e.g. Family wedding 24-26 May, please grant 3 days leave"
                : "What happened? When? Any details that help the school act."}
            />
          </Field>
          <div style={{ background: "var(--card-2)", border: "1px solid var(--rule-2)", borderRadius: 9, padding: 10, fontSize: 11.5, color: "var(--ink-3)" }}>
            We'll respond as soon as possible. You'll see status updates (Open → In Progress → Resolved) on this page.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn accent" disabled={busy || !issue.trim()}>
              <Icon name="send" size={13} />{busy ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const bg = toast.tone === "bad" ? "var(--bad)" : toast.tone === "warn" ? "var(--warn)" : "var(--ok)";
  return (
    <div style={{
      position: "fixed", top: 76, left: "50%", transform: "translateX(-50%)",
      zIndex: 300, background: bg, color: "#fff", padding: "10px 18px",
      borderRadius: 999, fontSize: 12.5, fontWeight: 500, boxShadow: "var(--shadow-lg)",
    }}>{toast.msg}</div>
  );
}
