"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip } from "../ui";
import DocumentsPanel from "../DocumentsPanel";

const AVAIL_OPTIONS = ["weekends", "weekdays", "evenings", "anytime"];
const SKILL_SUGGESTIONS = ["Tutoring", "Sports coach", "Library", "Event ops", "Health camp", "IT", "Art / Music", "First aid"];

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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)", display: "grid", placeItems: "center", zIndex: 250, padding: 16, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: width, maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}>
        <div className="card-head">
          <div><div className="card-title">{title}</div>{sub && <div className="card-sub">{sub}</div>}</div>
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

export default function ScreenVolunteers({ E, refresh, role }) {
  const canEdit = role === "admin" || role === "principal";
  const [volunteers, setVolunteers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [logFor, setLogFor] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (m, t) => { setToast({ msg: m, tone: t }); setTimeout(() => setToast(null), 2800); };

  async function load() {
    try {
      const r = await fetch("/api/volunteers", { cache: "no-store" });
      const j = await r.json();
      if (j.ok) setVolunteers(j.volunteers || []);
    } catch {}
  }
  useEffect(() => { load(); }, []);

  const totalHours = useMemo(() => volunteers.reduce((a, v) => a + (Number(v.hours) || 0), 0), [volunteers]);

  async function handleAdd(payload) {
    const r = await fetch("/api/volunteers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json();
    if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
    setShowAdd(false);
    showToast(`Volunteer ${j.volunteer.name} added`, "ok");
    await load();
    await refresh?.();
  }

  async function handleLog(payload) {
    const r = await fetch("/api/volunteers", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json();
    if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
    setLogFor(null);
    showToast(`+${payload.hours}h logged`, "ok");
    await load();
  }

  async function handleRemove(v) {
    if (!confirm(`Remove ${v.name} from volunteers?`)) return;
    const r = await fetch("/api/volunteers", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: v.id }) });
    const j = await r.json();
    if (!r.ok || !j.ok) { showToast(j.error || "Failed", "err"); return; }
    showToast("Removed", "ok");
    await load();
  }

  return (
    <div className="page">
      <Toast msg={toast?.msg} tone={toast?.tone} onClose={() => setToast(null)} />

      <div className="page-head">
        <div>
          <div className="page-eyebrow">CRM · Volunteers</div>
          <div className="page-title">Volunteers <span className="amber">network</span></div>
          <div className="page-sub">Track skills, availability, and contributed hours</div>
        </div>
        {canEdit && (
          <div className="page-actions">
            <button className="btn accent" onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={13} />Add volunteer
            </button>
          </div>
        )}
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Volunteers" value={volunteers.length} sub="on file" puck="mint" puckIcon="users" />
        <KPI label="Total hours" value={totalHours} sub="contributed" puck="cream" puckIcon="clock" />
        <KPI label="Active" value={volunteers.filter((v) => (v.assignments || []).length > 0).length} sub="have logged time" puck="peach" puckIcon="check" />
        <KPI label="Skills covered" value={new Set(volunteers.flatMap((v) => v.skills || [])).size} sub="distinct" puck="sky" puckIcon="academic" />
      </div>

      <div className="card">
        <div className="card-head">
          <div><div className="card-title">Volunteer directory</div></div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr><th>Volunteer</th><th>Contact</th><th>Skills</th><th>Availability</th><th className="num">Hours</th><th></th></tr>
            </thead>
            <tbody>
              {volunteers.length === 0 && <tr><td colSpan={6} className="empty">No volunteers yet. {canEdit && "Click Add volunteer."}</td></tr>}
              {volunteers.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AvatarChip initials={(v.name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("")} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{v.name}</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{v.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                    {v.email || "—"}
                    {v.phone && <div style={{ fontSize: 10.5 }}>{v.phone}</div>}
                  </td>
                  <td style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 220 }}>
                    {(v.skills || []).map((s) => <span key={s} className="chip" style={{ fontSize: 10 }}>{s}</span>)}
                    {(v.skills || []).length === 0 && <span style={{ fontSize: 11, color: "var(--ink-4)" }}>—</span>}
                  </td>
                  <td><span className="chip"><span className="dot" />{v.availability}</span></td>
                  <td className="num" style={{ fontWeight: 500 }}>{v.hours || 0}h</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                      {canEdit && <button className="btn sm" onClick={() => setLogFor(v)}><Icon name="plus" size={11} />Log hours</button>}
                      {canEdit && <button className="icon-btn" onClick={() => handleRemove(v)} title="Remove"><Icon name="x" size={12} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && canEdit && <AddVolunteerModal onClose={() => setShowAdd(false)} onSubmit={handleAdd} />}
      {logFor && canEdit && <LogHoursModal volunteer={logFor} onClose={() => setLogFor(null)} onSubmit={(p) => handleLog({ id: logFor.id, ...p })} />}
    </div>
  );
}

function AddVolunteerModal({ onClose, onSubmit }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", skills: [], availability: "weekends", notes: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSkill = (s) => setForm((f) => ({ ...f, skills: f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s] }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      if (!form.name.trim()) throw new Error("Name required");
      await onSubmit({ ...form, name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.replace(/\D/g, "") || null });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <ModalShell title="Add volunteer" sub="Skills, availability, contact" onClose={onClose}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Name *">
          <input className="input" autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className="input" inputMode="numeric" value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="98XXXXXXXX" />
          </Field>
        </div>
        <Field label="Availability">
          <select className="select" value={form.availability} onChange={(e) => set("availability", e.target.value)}>
            {AVAIL_OPTIONS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Skills" hint="Click to toggle">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SKILL_SUGGESTIONS.map((s) => (
              <button
                key={s} type="button" onClick={() => toggleSkill(s)}
                className={`chip ${form.skills.includes(s) ? "accent" : ""}`}
                style={{ cursor: "pointer", padding: "4px 10px" }}
              >{s}</button>
            ))}
          </div>
        </Field>
        <Field label="Notes (optional)">
          <textarea className="input" style={{ height: 60, padding: "8px 10px", lineHeight: 1.5, resize: "vertical" }} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        {err && <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy}>{busy ? "Adding…" : "Add volunteer"}</button>
        </div>
      </form>
    </ModalShell>
  );
}

function LogHoursModal({ volunteer, onClose, onSubmit }) {
  const [hours, setHours] = useState("");
  const [activity, setActivity] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const h = Number(hours);
      if (!h || h <= 0) throw new Error("Enter a positive number of hours");
      await onSubmit({ hours: h, activity: activity.trim() || null, date });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }
  return (
    <ModalShell title={`Log hours · ${volunteer.name}`} sub={`Currently: ${volunteer.hours || 0}h`} onClose={onClose}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Hours *">
            <input className="input" autoFocus inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value.replace(/[^\d.]/g, ""))} placeholder="2" />
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Activity">
          <input className="input" value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="e.g. Library shelving" />
        </Field>
        {err && <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy}>{busy ? "Saving…" : "Log hours"}</button>
        </div>
      </form>
    </ModalShell>
  );
}
