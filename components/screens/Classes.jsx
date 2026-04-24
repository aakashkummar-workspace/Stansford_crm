"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI } from "../ui";

export default function ScreenClasses({ E, refresh, role }) {
  const canAssign = role === "principal" || role === "admin" || role === "academic_director";
  const classes = E.CLASSES || [];
  const addedStudents = E.ADDED_STUDENTS || [];

  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const toastTimer = useRef(null);
  const flash = (msg, tone = "ok") => {
    setToast({ msg, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  // Fetch the teacher roster once on mount (and after every assignment) so
  // the picker is up to date.
  const loadTeachers = async () => {
    try {
      const r = await fetch("/api/users?role=teacher", { cache: "no-store" });
      const json = await r.json().catch(() => ({}));
      if (json.ok) setTeachers(json.teachers || []);
    } catch {}
  };
  useEffect(() => { loadTeachers(); }, []);

  // Lookup: section key "2-A" → list of teachers assigned to it. A section
  // typically has one class teacher but the data model now allows several
  // (subject teachers etc.), so we return an array.
  const teachersFor = (key) => teachers.filter((t) =>
    Array.isArray(t.linkedClasses) ? t.linkedClasses.includes(key) : t.linkedId === key
  );
  // Back-compat: first teacher for the section (used as the "primary" chip).
  const teacherFor = (key) => teachersFor(key)[0] || null;

  // Atomic add — picking a teacher for section X adds X to their list,
  // it does NOT move them away from any other section they teach.
  const handleAssignTeacher = async (sectionKey, teacherId) => {
    try {
      const r = await fetch("/api/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: teacherId, addClass: sectionKey }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      const list = json.user.linkedClasses || [];
      flash(`${json.user.name || "Teacher"} now teaches ${list.join(", ") || "—"}`);
      await loadTeachers();
    } catch (e) { flash(e.message || "Failed", "bad"); }
  };

  // Atomic remove — only this section is dropped from the teacher's list.
  const handleUnassignTeacher = async (teacherId, sectionKey) => {
    try {
      const r = await fetch("/api/users", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: teacherId, removeClass: sectionKey }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      const left = (json.user.linkedClasses || []);
      flash(left.length
        ? `${json.user.name} no longer teaches ${sectionKey} (still: ${left.join(", ")})`
        : `${json.user.name} unassigned from all classes`);
      await loadTeachers();
    } catch (e) { flash(e.message || "Failed", "bad"); }
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

  // Edit modal + confirm-dialog state. We use a custom in-app confirm instead
  // of window.confirm so the dialog matches the rest of the UI.
  const [editing, setEditing] = useState(null);  // class object being edited
  const [confirmAsk, setConfirmAsk] = useState(null); // { title, body, danger, onConfirm }

  const handleAdd = async (form) => {
    const res = await call("POST", { n: Number(form.n), label: form.label, sections: form.sections });
    if (res.ok) { flash(`Added ${res.class.label}`); await refresh?.(); setShowAdd(false); }
    else flash(res.error || "Failed to add", "bad");
  };

  const handleEdit = async (cls, form) => {
    const res = await call("PATCH", {
      n: cls.n,
      label: form.label,
      sections: form.sections,
    });
    if (res.ok) { flash(`Updated ${cls.label}`); await refresh?.(); setEditing(null); }
    else flash(res.error || "Failed to update", "bad");
  };

  const handleAddSection = async (cls, letter) => {
    const upper = String(letter || "").trim().toUpperCase();
    if (!upper) return;
    if ((cls.sections || []).includes(upper)) { flash(`Section ${upper} already exists in ${cls.label}`, "warn"); return; }
    const res = await call("PATCH", { n: cls.n, sections: [...(cls.sections || []), upper].sort() });
    if (res.ok) { flash(`Added section ${upper} to ${cls.label}`); await refresh?.(); }
    else flash(res.error || "Failed", "bad");
  };

  // Confirm before removing a section. Surface the student count if any.
  const handleRemoveSection = (cls, letter) => {
    const sectionKey = `${cls.n}-${letter}`;
    const count = addedStudents.filter((s) => s.cls === sectionKey).length;
    setConfirmAsk({
      title: `Remove section ${letter} from ${cls.label}?`,
      body: count > 0
        ? `This section currently has ${count} student${count === 1 ? "" : "s"} on roll. Their records stay but the section disappears from dropdowns.`
        : "This section is empty — safe to remove.",
      danger: count > 0,
      confirmLabel: "Remove section",
      onConfirm: async () => {
        const next = (cls.sections || []).filter((s) => s !== letter);
        const res = await call("PATCH", { n: cls.n, sections: next });
        if (res.ok) { flash(`Removed section ${letter} from ${cls.label}`); await refresh?.(); }
        else flash(res.error || "Failed", "bad");
      },
    });
  };

  // Always confirm before deleting a whole class.
  const handleRemoveClass = (cls) => {
    const count = addedStudents.filter((s) => s.cls.startsWith(`${cls.n}-`)).length;
    setConfirmAsk({
      title: `Delete ${cls.label}?`,
      body: count > 0
        ? `${cls.label} has ${count} student${count === 1 ? "" : "s"} assigned across its sections. Their records stay but the class disappears from dropdowns. This is irreversible.`
        : "This class is empty — safe to delete.",
      danger: true,
      confirmLabel: "Delete class",
      onConfirm: async () => {
        const res = await call("DELETE", { n: cls.n });
        if (res.ok) { flash(`Removed ${cls.label}`); await refresh?.(); }
        else flash(res.error || "Failed", "bad");
      },
    });
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
              teachers={teachers}
              teacherFor={teacherFor}
              canAssign={canAssign}
              onAssignTeacher={handleAssignTeacher}
              onUnassignTeacher={handleUnassignTeacher}
              onAddSection={(letter) => handleAddSection(c, letter)}
              onRemoveSection={(letter) => handleRemoveSection(c, letter)}
              onRemoveClass={() => handleRemoveClass(c)}
              onEditClass={canAssign ? (() => setEditing(c)) : undefined}
            />
          ))}
        </div>
      )}

      {showAdd && <AddClassModal existing={classes.map((c) => c.n)} onClose={() => setShowAdd(false)} onSubmit={handleAdd} />}
      {editing && <EditClassModal cls={editing} onClose={() => setEditing(null)} onSubmit={(form) => handleEdit(editing, form)} />}
      {confirmAsk && (
        <ConfirmDialog
          title={confirmAsk.title}
          body={confirmAsk.body}
          danger={confirmAsk.danger}
          confirmLabel={confirmAsk.confirmLabel || "Confirm"}
          onCancel={() => setConfirmAsk(null)}
          onConfirm={async () => {
            const fn = confirmAsk.onConfirm;
            setConfirmAsk(null);
            await fn?.();
          }}
        />
      )}
    </div>
  );
}

// ---------- class card ----------
function ClassCard({ cls, studentCount, teachers, teacherFor, canAssign, onAssignTeacher, onUnassignTeacher, onAddSection, onRemoveSection, onRemoveClass, onEditClass }) {
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
        <div className="card-actions" style={{ display: "flex", gap: 4 }}>
          {onEditClass && (
            <button className="btn sm ghost" onClick={onEditClass} title={`Edit ${cls.label}`}>
              <Icon name="pencil" size={12} />
            </button>
          )}
          <button className="btn sm ghost" onClick={onRemoveClass} title={`Delete ${cls.label}`}>
            <Icon name="x" size={12} />
          </button>
        </div>
      </div>

      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(cls.sections || []).length === 0 ? (
          <span style={{ fontSize: 12, color: "var(--ink-4)" }}>No sections yet — add one below.</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(cls.sections || []).map((s) => {
              const sectionKey = `${cls.n}-${s}`;
              const count = studentCount(sectionKey);
              const t = teacherFor ? teacherFor(sectionKey) : null;
              return (
                <SectionRow
                  key={s}
                  sectionKey={sectionKey}
                  letter={s}
                  count={count}
                  teacher={t}
                  teachers={teachers || []}
                  canAssign={canAssign}
                  onAssign={(teacherId) => onAssignTeacher(sectionKey, teacherId)}
                  onUnassign={() => t && onUnassignTeacher(t.id, sectionKey)}
                  onRemoveSection={() => onRemoveSection(s)}
                />
              );
            })}
          </div>
        )}

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

// ---------- one row per section, with class-teacher picker ----------
// Shows the section letter + roll count, plus the assigned teacher (or an
// "Assign teacher" picker). Only principal/admin/director see the picker.
function SectionRow({ sectionKey, letter, count, teacher, teachers, canAssign, onAssign, onUnassign, onRemoveSection }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [pickerOpen]);

  const initials = (n) => (n || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 10px",
      background: "var(--bg-2)", border: "1px solid var(--rule-2)", borderRadius: 8,
    }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 24, padding: "0 10px",
        background: "var(--accent-soft)", color: "var(--accent-2)",
        border: "1px solid var(--accent)",
        borderRadius: 6, fontSize: 11.5, fontWeight: 500,
      }}>
        Section {letter}
        <span className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>· {count}</span>
      </span>

      <div ref={ref} style={{ flex: 1, minWidth: 0, position: "relative" }}>
        {teacher ? (
          (() => {
            const list = Array.isArray(teacher.linkedClasses) ? teacher.linkedClasses : (teacher.linkedId ? [teacher.linkedId] : []);
            const others = list.filter((k) => k !== sectionKey);
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--ok), #2f6048)",
                  color: "#fff", display: "grid", placeItems: "center",
                  fontSize: 9.5, fontWeight: 600, flexShrink: 0,
                }}>{initials(teacher.name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{teacher.name}</div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {teacher.email}{others.length ? ` · also teaches ${others.join(", ")}` : ""}
                  </div>
                </div>
                {canAssign && (
                  <>
                    <button className="icon-btn" onClick={() => setPickerOpen((s) => !s)} title="Add another teacher" style={{ width: 24, height: 24 }}>
                      <Icon name="plus" size={11} />
                    </button>
                    <button className="icon-btn" onClick={onUnassign} title={`Remove from ${sectionKey}`} style={{ width: 24, height: 24 }}>
                      <Icon name="x" size={11} />
                    </button>
                  </>
                )}
              </div>
            );
          })()
        ) : canAssign ? (
          <button className="btn sm" onClick={() => setPickerOpen((s) => !s)} style={{ height: 26 }}>
            <Icon name="plus" size={11} />Assign teacher
          </button>
        ) : (
          <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>No class teacher assigned</span>
        )}

        {pickerOpen && canAssign && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0,
            minWidth: 240, background: "var(--card)",
            border: "1px solid var(--rule)", borderRadius: 8,
            padding: 4, zIndex: 60, boxShadow: "var(--shadow-lg)",
            maxHeight: 280, overflowY: "auto",
          }}>
            <div style={{ fontSize: 10.5, color: "var(--ink-4)", padding: "6px 10px 4px", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500 }}>
              Pick a teacher
            </div>
            {teachers.length === 0 ? (
              <div style={{ padding: "10px 12px", fontSize: 11.5, color: "var(--ink-3)" }}>
                No teachers yet. Add a Teacher account first.
              </div>
            ) : (
              teachers.map((t) => {
                const list = Array.isArray(t.linkedClasses) ? t.linkedClasses : (t.linkedId ? [t.linkedId] : []);
                const here = list.includes(sectionKey);
                const otherClasses = list.filter((c) => c !== sectionKey);
                return (
                  <button
                    key={t.id}
                    onClick={() => { onAssign(t.id); setPickerOpen(false); }}
                    disabled={here}
                    style={{
                      width: "100%", textAlign: "left",
                      padding: "8px 10px", background: here ? "var(--bg-2)" : "transparent",
                      border: 0, borderRadius: 6, cursor: here ? "default" : "pointer",
                      color: "var(--ink-2)", fontSize: 12,
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                    onMouseEnter={(e) => !here && (e.currentTarget.style.background = "var(--bg-2)")}
                    onMouseLeave={(e) => !here && (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: "linear-gradient(135deg, var(--ok), #2f6048)",
                      color: "#fff", display: "grid", placeItems: "center",
                      fontSize: 9, fontWeight: 600, flexShrink: 0,
                    }}>{initials(t.name)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>{t.name}</div>
                      <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>
                        {t.email}{otherClasses.length ? ` · also teaches ${otherClasses.join(", ")}` : ""}
                      </div>
                    </div>
                    {here && <span className="chip ok" style={{ fontSize: 9.5 }}><span className="dot" />Already here</span>}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <button
        className="icon-btn"
        style={{ width: 24, height: 24 }}
        onClick={onRemoveSection}
        title={`Remove section ${letter}`}
      >
        <Icon name="x" size={11} />
      </button>
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

// ---------- edit-class modal ----------
function EditClassModal({ cls, onClose, onSubmit }) {
  const [form, setForm] = useState({
    label: cls.label || `Class ${cls.n}`,
    sections: (cls.sections || []).join(", "),
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const sections = form.sections.split(/[,\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    try {
      await onSubmit({ label: form.label.trim() || `Class ${cls.n}`, sections });
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
            <div className="card-title">Edit {cls.label}</div>
            <div className="card-sub">Class number {cls.n} · rename or change its sections</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Label">
            <input className="input" autoFocus value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder={`Class ${cls.n}`} />
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
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>
            Tip: removing a section here is the same as clicking × on its chip — students stay on the books, but the section won't appear in dropdowns.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn accent" disabled={busy}>
              <Icon name="check" size={13} />{busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- in-app confirm dialog ----------
function ConfirmDialog({ title, body, danger, confirmLabel = "Confirm", onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.55)",
      display: "grid", placeItems: "center", zIndex: 300, padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ padding: "18px 18px 6px", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{
            width: 36, height: 36, borderRadius: 9,
            background: danger ? "var(--bad-soft)" : "var(--accent-soft)",
            color:      danger ? "var(--bad)"      : "var(--accent)",
            display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            <Icon name={danger ? "warning" : "check"} size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.3 }}>{title}</div>
            {body && <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 6, lineHeight: 1.5 }}>{body}</div>}
          </div>
        </div>
        <div style={{ padding: "12px 18px 18px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn"
            onClick={onConfirm}
            style={danger ? {
              background: "var(--bad)",
              color: "#fff",
              borderColor: "var(--bad)",
            } : {
              background: "var(--accent)",
              color: "var(--accent-ink, #fff)",
              borderColor: "var(--accent)",
            }}
          >
            {confirmLabel}
          </button>
        </div>
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
