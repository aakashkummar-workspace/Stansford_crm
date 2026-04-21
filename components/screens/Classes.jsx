"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI } from "../ui";

export default function ScreenClasses({ E, refresh }) {
  const classes = E.CLASSES || [];
  const addedStudents = E.ADDED_STUDENTS || [];

  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const flash = (msg, tone = "ok") => {
    setToast({ msg, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  // Count students per class/section for the header chips.
  const countByCls = (cls) => addedStudents.filter((s) => s.cls === cls).length;

  // ---------- handlers ----------
  const call = async (method, body) => {
    try {
      const r = await fetch("/api/classes", {
        method, headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      return await r.json().catch(() => ({ ok: false, error: "Bad response" }));
    } catch (e) {
      return { ok: false, error: "Network error — " + e.message };
    }
  };

  const handleAdd = async (form) => {
    const res = await call("POST", { n: Number(form.n), label: form.label, sections: form.sections });
    if (res.ok) { flash(`Added ${res.class.label}`); await refresh?.(); setShowAdd(false); }
    else flash(res.error || "Failed to add", "bad");
  };

  const handleAddSection = async (cls, letter) => {
    const upper = String(letter || "").trim().toUpperCase();
    if (!upper) return;
    if ((cls.sections || []).includes(upper)) { flash(`Section ${upper} already exists in ${cls.label}`, "warn"); return; }
    const res = await call("PATCH", { n: cls.n, sections: [...(cls.sections || []), upper].sort() });
    if (res.ok) { flash(`Added section ${upper} to ${cls.label}`); await refresh?.(); }
    else flash(res.error || "Failed", "bad");
  };

  const handleRemoveSection = async (cls, letter) => {
    const next = (cls.sections || []).filter((s) => s !== letter);
    const res = await call("PATCH", { n: cls.n, sections: next });
    if (res.ok) { flash(`Removed section ${letter} from ${cls.label}`); await refresh?.(); }
    else flash(res.error || "Failed", "bad");
  };

  const handleRemoveClass = async (cls) => {
    const count = addedStudents.filter((s) => s.cls.startsWith(`${cls.n}-`)).length;
    if (count > 0) {
      if (!window.confirm(`${cls.label} still has ${count} student${count === 1 ? "" : "s"} assigned. Delete anyway? (Their records stay but the class disappears from the dropdowns.)`)) return;
    }
    const res = await call("DELETE", { n: cls.n });
    if (res.ok) { flash(`Removed ${cls.label}`); await refresh?.(); }
    else flash(res.error || "Failed", "bad");
  };

  const totalSections = classes.reduce((a, c) => a + (c.sections?.length || 0), 0);

  return (
    <div className="page">
      <Toast toast={toast} />

      <div className="page-head">
        <div>
          <div className="page-eyebrow">People · Setup</div>
          <div className="page-title">Classes &amp; <span className="amber">sections</span></div>
          <div className="page-sub">Define the grades and sections your school runs. Changes here flow through to admissions, the academic tracker, and every dropdown in the app.</div>
        </div>
        <div className="page-actions">
          <button className="btn accent" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={13} />Add class
          </button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 18 }}>
        <KPI label="Classes" value={classes.length} sub={classes.length ? "defined" : "none yet"} puck="mint" puckIcon="academic" />
        <KPI label="Total sections" value={totalSections} sub="across all classes" puck="peach" puckIcon="users" />
        <KPI label="Students enrolled" value={addedStudents.length} sub={addedStudents.length === 1 ? "on roll" : "across classes"} puck="cream" puckIcon="students" />
        <KPI label="Empty classes" value={classes.filter((c) => !(c.sections || []).length).length} sub="need at least one section" puck="rose" puckIcon="warning" />
      </div>

      {classes.length === 0 ? (
        <div className="card"><div className="empty" style={{ padding: 60 }}>No classes defined yet. Click “Add class” to start.</div></div>
      ) : (
        <div className="grid g-3">
          {classes.map((c) => (
            <ClassCard
              key={c.n}
              cls={c}
              studentCount={countByCls}
              onAddSection={(letter) => handleAddSection(c, letter)}
              onRemoveSection={(letter) => handleRemoveSection(c, letter)}
              onRemoveClass={() => handleRemoveClass(c)}
            />
          ))}
        </div>
      )}

      {showAdd && <AddClassModal existing={classes.map((c) => c.n)} onClose={() => setShowAdd(false)} onSubmit={handleAdd} />}
    </div>
  );
}

// ---------- class card ----------
function ClassCard({ cls, studentCount, onAddSection, onRemoveSection, onRemoveClass }) {
  const [adding, setAdding] = useState(false);
  const [letter, setLetter] = useState("");
  const total = (cls.sections || []).reduce((a, s) => a + studentCount(`${cls.n}-${s}`), 0);

  const submit = async (e) => {
    e?.preventDefault();
    if (!letter.trim()) return;
    await onAddSection(letter);
    setLetter("");
    setAdding(false);
  };

  return (
    <div className="card">
      <div className="card-head" style={{ paddingBottom: 14 }}>
        <div>
          <div className="card-title">{cls.label}</div>
          <div className="card-sub">{(cls.sections || []).length} section{(cls.sections || []).length === 1 ? "" : "s"} · {total} student{total === 1 ? "" : "s"}</div>
        </div>
        <div className="card-actions">
          <button className="btn sm ghost" onClick={onRemoveClass} title={`Delete ${cls.label}`}>
            <Icon name="x" size={12} />
          </button>
        </div>
      </div>

      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {(cls.sections || []).length === 0 && (
            <span style={{ fontSize: 12, color: "var(--ink-4)" }}>No sections yet — add one below.</span>
          )}
          {(cls.sections || []).map((s) => {
            const count = studentCount(`${cls.n}-${s}`);
            return (
              <span key={s} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                height: 28, padding: "0 4px 0 10px",
                background: "var(--accent-soft)", color: "var(--accent-2)",
                border: "1px solid var(--accent)",
                borderRadius: 8, fontSize: 12, fontWeight: 500,
              }}>
                Section {s}
                <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>· {count}</span>
                <button
                  className="icon-btn"
                  style={{ width: 22, height: 22, color: "var(--accent-2)" }}
                  onClick={() => onRemoveSection(s)}
                  title={`Remove section ${s}`}
                >
                  <Icon name="x" size={11} />
                </button>
              </span>
            );
          })}
        </div>

        {adding ? (
          <form onSubmit={submit} style={{ display: "flex", gap: 6 }}>
            <input
              className="input"
              autoFocus
              maxLength={2}
              value={letter}
              onChange={(e) => setLetter(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
              placeholder="A / B / C …"
              style={{ flex: 1, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}
            />
            <button type="submit" className="btn sm accent" disabled={!letter.trim()}><Icon name="check" size={12} /></button>
            <button type="button" className="btn sm ghost" onClick={() => { setAdding(false); setLetter(""); }}><Icon name="x" size={12} /></button>
          </form>
        ) : (
          <button className="btn sm" onClick={() => setAdding(true)}>
            <Icon name="plus" size={12} />Add section
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- add-class modal ----------
function AddClassModal({ existing, onClose, onSubmit }) {
  const [form, setForm] = useState({ n: "", label: "", sections: "A, B" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const numError = (() => {
    if (!form.n) return null;
    const n = Number(form.n);
    if (Number.isNaN(n) || n < 1) return "Must be a positive integer";
    if (existing.includes(n)) return `Class ${n} already exists`;
    return null;
  })();
  const valid = form.n && !numError;
  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    const sections = form.sections.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    try {
      await onSubmit({ n: Number(form.n), label: form.label.trim() || `Class ${form.n}`, sections });
    } finally { setBusy(false); }
  };
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
      display: "grid", placeItems: "center", zIndex: 250, padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 460 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Add a class</div>
            <div className="card-sub">Class number, optional label, starting sections</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Class number *">
            <input
              className="input"
              autoFocus
              value={form.n}
              onChange={(e) => setForm((f) => ({ ...f, n: e.target.value.replace(/[^0-9]/g, "") }))}
              placeholder="9"
              style={numError ? { borderColor: "var(--bad)" } : undefined}
            />
            {numError && <span style={{ fontSize: 11, color: "var(--bad)" }}>{numError}</span>}
          </Field>
          <Field label="Label (optional)">
            <input
              className="input"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder={`Class ${form.n || "N"} — defaults to this if blank`}
            />
          </Field>
          <Field label="Sections (comma-separated)">
            <input
              className="input"
              value={form.sections}
              onChange={(e) => setForm((f) => ({ ...f, sections: e.target.value.toUpperCase() }))}
              placeholder="A, B, C"
              style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}
            />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn accent" disabled={busy || !valid}>
              <Icon name="check" size={13} />{busy ? "Adding…" : "Add class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- shared helpers ----------
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
