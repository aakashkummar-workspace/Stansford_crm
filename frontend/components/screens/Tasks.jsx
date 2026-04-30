"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI } from "../ui";

const PRIORITIES = [
  { k: "low",     label: "Low",     tone: "" },
  { k: "normal",  label: "Normal",  tone: "" },
  { k: "high",    label: "High",    tone: "warn" },
  { k: "urgent",  label: "Urgent",  tone: "bad" },
];
const STATUS_LABEL = { pending: "Pending", in_progress: "In progress", done: "Done" };
const STATUS_TONE  = { pending: "", in_progress: "warn", done: "ok" };
const ROLE_LABEL = {
  admin: "Admin",
  academic_director: "Academic Director",
  principal: "Principal",
  teacher: "Teacher",
};

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

export default function ScreenTasks({ E, refresh, role, session }) {
  const isAdmin = role === "admin";
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all"); // all | pending | in_progress | done
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (msg, tone) => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  };

  // Tasks come straight from /api/tasks (admin sees all; everyone else only
  // their own — server enforces). Re-pulled on every successful mutation.
  async function loadTasks() {
    try {
      const r = await fetch("/api/tasks", { cache: "no-store" });
      const json = await r.json();
      if (json.ok) setTasks(json.tasks || []);
    } catch (e) { showToast("Couldn't load tasks", "err"); }
  }
  // Admin needs the list of assignable users (every role except parent).
  async function loadUsers() {
    if (!isAdmin) return;
    try {
      const r = await fetch("/api/users", { cache: "no-store" });
      const json = await r.json();
      if (json.ok) setUsers((json.users || []).filter((u) => u.role !== "parent"));
    } catch {}
  }
  useEffect(() => { loadTasks(); loadUsers(); }, []); // eslint-disable-line

  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter((t) => t.status === filter);
  }, [tasks, filter]);

  const counts = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  }), [tasks]);

  async function handleAdd(payload) {
    const r = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok || !json.ok) throw new Error(json.error || "Failed to create task");
    setShowAdd(false);
    showToast(`Task assigned to ${json.task.assignedToName}`, "ok");
    await loadTasks();
    await refresh?.();
  }

  async function handleStatus(task, status) {
    setBusyId(task.id);
    try {
      const r = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: task.id, status }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast(`Marked as ${STATUS_LABEL[status]}`, "ok");
      await loadTasks();
      await refresh?.();
    } catch (e) { showToast(e.message, "err"); }
    finally { setBusyId(null); }
  }

  async function handleRemove(task) {
    if (!confirm(`Remove task "${task.title}"?`)) return;
    setBusyId(task.id);
    try {
      const r = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: task.id }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast("Task removed", "ok");
      await loadTasks();
      await refresh?.();
    } catch (e) { showToast(e.message, "err"); }
    finally { setBusyId(null); }
  }

  return (
    <div className="page">
      <Toast msg={toast?.msg} tone={toast?.tone} onClose={() => setToast(null)} />

      <div className="page-head">
        <div>
          <div className="page-eyebrow">{isAdmin ? "Governance · Tasks" : "My work"}</div>
          <div className="page-title">{isAdmin ? <>Task <span className="amber">allocation</span></> : <>My <span className="amber">tasks</span></>}</div>
          <div className="page-sub">
            {isAdmin
              ? "Assign work to staff — academic director, principal, teachers"
              : "Tasks assigned to you by Admin"}
          </div>
        </div>
        {isAdmin && (
          <div className="page-actions">
            <button className="btn accent" onClick={() => setShowAdd(true)} disabled={users.length === 0}>
              <Icon name="plus" size={13} />New task
            </button>
          </div>
        )}
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label={isAdmin ? "Total tasks" : "All tasks"} value={counts.total} sub="across roles" puck="mint" puckIcon="check" />
        <KPI label="Pending" value={counts.pending} sub={counts.pending ? "needs to be picked up" : "nothing waiting"} puck="cream" puckIcon="clock" />
        <KPI label="In progress" value={counts.in_progress} sub="being worked on" puck="peach" puckIcon="refresh" />
        <KPI label="Done" value={counts.done} sub="closed" puck="sky" puckIcon="check" />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">{isAdmin ? "All tasks" : "Tasks for you"}</div>
            <div className="card-sub">{filtered.length} shown</div>
          </div>
          <div className="card-actions">
            <div className="segmented">
              {["all", "pending", "in_progress", "done"].map((k) => (
                <button key={k} className={filter === k ? "active" : ""} onClick={() => setFilter(k)}>
                  {k === "all" ? "All" : STATUS_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                {isAdmin && <th>Assigned to</th>}
                <th>Priority</th>
                <th>Due</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={isAdmin ? 6 : 5} className="empty">
                  {tasks.length === 0
                    ? (isAdmin ? "No tasks yet. Click \"New task\" to assign work." : "No tasks have been assigned to you yet.")
                    : `No ${STATUS_LABEL[filter]?.toLowerCase() || "matching"} tasks.`}
                </td></tr>
              )}
              {filtered.map((t) => {
                const pri = PRIORITIES.find((p) => p.k === t.priority) || PRIORITIES[1];
                const overdue = t.dueDate && t.status !== "done" && new Date(t.dueDate) < new Date(new Date().toISOString().slice(0, 10));
                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontSize: 12.5, fontWeight: 500 }}>{t.title}</div>
                      {t.description && (
                        <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2, lineHeight: 1.4, maxWidth: 420 }}>{t.description}</div>
                      )}
                      <div style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 3, fontFamily: "var(--font-mono)" }}>
                        {t.id} · by {t.assignedByName}
                      </div>
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{t.assignedToName}</div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{ROLE_LABEL[t.assignedToRole] || t.assignedToRole}</div>
                      </td>
                    )}
                    <td><span className={`chip ${pri.tone}`}><span className="dot" />{pri.label}</span></td>
                    <td style={{ fontSize: 11.5, color: overdue ? "var(--err, #b13c1c)" : "var(--ink-3)", whiteSpace: "nowrap" }}>
                      {t.dueDate || "—"}{overdue ? " · overdue" : ""}
                    </td>
                    <td><span className={`chip ${STATUS_TONE[t.status]}`}><span className="dot" />{STATUS_LABEL[t.status]}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        {/* Assignee + admin can flip status */}
                        {t.status === "pending" && (
                          <button className="btn sm" onClick={() => handleStatus(t, "in_progress")} disabled={busyId === t.id}>
                            <Icon name="refresh" size={11} />Start
                          </button>
                        )}
                        {t.status === "in_progress" && (
                          <button className="btn sm accent" onClick={() => handleStatus(t, "done")} disabled={busyId === t.id}>
                            <Icon name="check" size={11} />Done
                          </button>
                        )}
                        {t.status === "done" && (
                          <button className="btn sm ghost" onClick={() => handleStatus(t, "in_progress")} disabled={busyId === t.id} title="Reopen">
                            <Icon name="refresh" size={11} />Reopen
                          </button>
                        )}
                        {isAdmin && (
                          <button className="icon-btn" onClick={() => handleRemove(t)} disabled={busyId === t.id} title="Remove">
                            <Icon name="x" size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && isAdmin && (
        <AddTaskModal users={users} onClose={() => setShowAdd(false)} onSubmit={handleAdd} />
      )}
    </div>
  );
}

function AddTaskModal({ users, onClose, onSubmit }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", assignedTo: "", priority: "normal", dueDate: "",
  });
  const titleRef = useRef(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Group users by role for the dropdown.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const u of users) {
      const role = u.role || "staff";
      if (!map.has(role)) map.set(role, []);
      map.get(role).push(u);
    }
    return [...map.entries()];
  }, [users]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setErr(""); setBusy(true);
    try {
      if (!form.title.trim()) throw new Error("Title is required");
      if (!form.assignedTo) throw new Error("Pick an assignee");
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim() || null,
        assignedTo: form.assignedTo,
        priority: form.priority,
        dueDate: form.dueDate || null,
      });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <ModalShell title="New task" sub="Assign work to a staff member" onClose={onClose} width={520}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Title *">
          <input ref={titleRef} className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Submit Q2 attendance report" />
        </Field>
        <Field label="Description (optional)">
          <textarea
            className="input"
            style={{ width: "100%", height: 80, padding: "8px 10px", lineHeight: 1.5, resize: "vertical" }}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="More context, deliverables, links…"
          />
        </Field>
        <Field label="Assign to *" hint="Parents are not assignable">
          <select className="select" value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>
            <option value="">— pick a user —</option>
            {grouped.map(([roleK, list]) => (
              <optgroup key={roleK} label={ROLE_LABEL[roleK] || roleK}>
                {list.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Priority">
            <select className="select" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => <option key={p.k} value={p.k}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Due date (optional)">
            <input className="input" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </Field>
        </div>

        {err && (
          <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>{err}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy}>
            {busy ? "Assigning…" : <><Icon name="check" size={13} />Assign task</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
