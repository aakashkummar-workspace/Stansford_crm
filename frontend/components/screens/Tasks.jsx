"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI } from "../ui";

const PRIORITIES = [
  { k: "low",     label: "Low",     tone: "" },
  { k: "normal",  label: "Normal",  tone: "" },
  { k: "high",    label: "High",    tone: "warn" },
  { k: "urgent",  label: "Urgent",  tone: "bad" },
];
const ROLE_LABEL = {
  admin: "Admin",
  academic_director: "Academic Director",
  principal: "Principal",
  teacher: "Teacher",
  trust_accountant: "Trust Accountant",
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

function ResponseChip({ response }) {
  if (response === "yes") return <span className="chip ok"><span className="dot" />Yes</span>;
  if (response === "no") return <span className="chip bad"><span className="dot" />No</span>;
  return <span className="chip"><span className="dot" />Awaiting</span>;
}

export default function ScreenTasks({ E, refresh, role, session }) {
  const isAdmin = role === "admin";
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("all"); // all | awaiting | yes | no
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);
  const [busyId, setBusyId] = useState(null);
  // Local drafts for assignee Yes/No + remarks before Save.
  const [drafts, setDrafts] = useState({}); // { [taskId]: { response, remarks } }

  const showToast = (msg, tone) => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  };

  async function loadTasks() {
    try {
      const r = await fetch("/api/tasks", { cache: "no-store" });
      const json = await r.json();
      if (json.ok) {
        const list = json.tasks || [];
        setTasks(list);
        const next = {};
        for (const t of list) {
          next[t.id] = { response: t.response || null, remarks: t.remarks || "" };
        }
        setDrafts(next);
      }
    } catch (e) { showToast("Couldn't load tasks", "err"); }
  }
  async function loadUsers() {
    if (!isAdmin) return;
    try {
      const r = await fetch("/api/users", { cache: "no-store" });
      const json = await r.json();
      if (json.ok) setUsers((json.users || []).filter((u) => u.role !== "parent"));
    } catch {}
  }
  useEffect(() => { loadTasks(); loadUsers(); }, []); // eslint-disable-line

  // Super Admin keeps an open Tasks tab — re-pull when the window is focused
  // so teacher Yes/No + remarks show up without a full page reload.
  useEffect(() => {
    const reload = () => { loadTasks(); };
    const onVis = () => { if (document.visibilityState === "visible") reload(); };
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []); // eslint-disable-line

  // Numbered list for the assignee: group admin view by person so each
  // teacher sees 1., 2., 3. of their own work in the same table shape.
  const rows = useMemo(() => {
    let list = [...tasks];
    if (filter === "awaiting") list = list.filter((t) => !t.response);
    else if (filter === "yes") list = list.filter((t) => t.response === "yes");
    else if (filter === "no") list = list.filter((t) => t.response === "no");

    if (!isAdmin) {
      return list.map((t, i) => ({ task: t, n: i + 1, groupKey: "me" }));
    }

    // Admin: sort by assignee name, then due date; number within each person.
    list.sort((a, b) => {
      const an = (a.assignedToName || "").localeCompare(b.assignedToName || "");
      if (an !== 0) return an;
      return String(a.dueDate || "").localeCompare(String(b.dueDate || ""));
    });
    const counters = {};
    return list.map((t) => {
      const key = t.assignedTo || t.assignedToName || "—";
      counters[key] = (counters[key] || 0) + 1;
      return { task: t, n: counters[key], groupKey: key };
    });
  }, [tasks, filter, isAdmin]);

  const counts = useMemo(() => ({
    total: tasks.length,
    awaiting: tasks.filter((t) => !t.response).length,
    yes: tasks.filter((t) => t.response === "yes").length,
    no: tasks.filter((t) => t.response === "no").length,
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
    showToast(
      payload.self
        ? "Self-task added"
        : `Task assigned to ${json.task.assignedToName}`,
      "ok",
    );
    await loadTasks();
    await refresh?.();
  }

  const myId = session?.sub || session?.id || session?.email;
  const isSelfCreated = (t) => t.assignedBy === myId || t.assignedBy === session?.email;

  async function handleSaveResponse(task) {
    const draft = drafts[task.id] || { response: null, remarks: "" };
    if (!draft.response) {
      showToast("Choose Yes or No first", "err");
      return;
    }
    setBusyId(task.id);
    try {
      const r = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          response: draft.response,
          remarks: draft.remarks || "",
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed");
      showToast(`Saved · ${draft.response === "yes" ? "Yes" : "No"}`, "ok");
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

  const setDraft = (id, patch) => setDrafts((d) => ({
    ...d,
    [id]: { ...(d[id] || { response: null, remarks: "" }), ...patch },
  }));

  return (
    <div className="page">
      <Toast msg={toast?.msg} tone={toast?.tone} onClose={() => setToast(null)} />

      <div className="page-head">
        <div>
          <div className="page-eyebrow">{isAdmin ? "Governance · Tasks" : "My work"}</div>
          <div className="page-title">{isAdmin ? <>Task <span className="amber">allocation</span></> : <>My <span className="amber">tasks</span></>}</div>
          <div className="page-sub">
            {isAdmin
              ? "Assign work to staff — they answer Yes/No with remarks"
              : "Answer Yes or No, add remarks, or create a self-task — Admin can see your updates"}
          </div>
        </div>
        <div className="page-actions">
          {isAdmin && (
            <button className="btn" onClick={() => loadTasks()} title="Reload teacher Yes/No and remarks">
              <Icon name="refresh" size={13} />Refresh
            </button>
          )}
          {isAdmin ? (
            <button className="btn accent" onClick={() => setShowAdd(true)} disabled={users.length === 0}>
              <Icon name="plus" size={13} />New task
            </button>
          ) : (
            <button className="btn accent" onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={13} />Self task
            </button>
          )}
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label={isAdmin ? "Total tasks" : "All tasks"} value={counts.total} sub="assigned" puck="mint" puckIcon="check" />
        <KPI label="Awaiting" value={counts.awaiting} sub="no Yes/No yet" puck="cream" puckIcon="clock" />
        <KPI label="Yes" value={counts.yes} sub="completed / accepted" puck="sky" puckIcon="check" />
        <KPI label="No" value={counts.no} sub="not done / declined" puck="rose" puckIcon="x" />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">{isAdmin ? "All tasks" : "Tasks for you"}</div>
            <div className="card-sub">{rows.length} shown · numbered per {isAdmin ? "assignee" : "list"}</div>
          </div>
          <div className="card-actions">
            <div className="segmented">
              {[
                { k: "all", label: "All" },
                { k: "awaiting", label: "Awaiting" },
                { k: "yes", label: "Yes" },
                { k: "no", label: "No" },
              ].map((f) => (
                <button key={f.k} className={filter === f.k ? "active" : ""} onClick={() => setFilter(f.k)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Task</th>
                {isAdmin && <th>Assigned to</th>}
                <th>Priority</th>
                <th>Due</th>
                <th>Yes / No</th>
                <th>Remarks</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={isAdmin ? 8 : 7} className="empty">
                  {tasks.length === 0
                    ? (isAdmin ? "No tasks yet. Click \"New task\" to assign work." : "No tasks have been assigned to you yet.")
                    : "No matching tasks."}
                </td></tr>
              )}
              {rows.map(({ task: t, n, groupKey }, idx) => {
                const pri = PRIORITIES.find((p) => p.k === t.priority) || PRIORITIES[1];
                const overdue = t.dueDate && t.response !== "yes" && new Date(t.dueDate) < new Date(new Date().toISOString().slice(0, 10));
                const draft = drafts[t.id] || { response: t.response || null, remarks: t.remarks || "" };
                const dirty = draft.response !== (t.response || null) || (draft.remarks || "") !== (t.remarks || "");
                // Group header when admin view switches assignee
                const prevKey = idx > 0 ? rows[idx - 1].groupKey : null;
                const showGroup = isAdmin && groupKey !== prevKey;
                return (
                  <Fragment key={t.id}>
                    {showGroup && (
                      <tr>
                        <td colSpan={8} style={{
                          background: "var(--bg-2)", fontSize: 11, fontWeight: 600,
                          color: "var(--ink-2)", letterSpacing: 0.03, padding: "8px 12px",
                        }}>
                          {t.assignedToName || "—"}
                          <span style={{ fontWeight: 400, color: "var(--ink-4)", marginLeft: 8 }}>
                            {ROLE_LABEL[t.assignedToRole] || t.assignedToRole}
                          </span>
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>
                        {n}.
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12.5, fontWeight: 500 }}>{t.title}</span>
                          {isSelfCreated(t) && (
                            <span className="chip" style={{ fontSize: 9.5 }} title="Created by the assignee">Self</span>
                          )}
                        </div>
                        {t.description && (
                          <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2, lineHeight: 1.4, maxWidth: 360 }}>{t.description}</div>
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
                      <td>
                        {isAdmin ? (
                          <ResponseChip response={t.response} />
                        ) : (
                          <div className="segmented" style={{ width: "fit-content" }}>
                            <button
                              type="button"
                              className={draft.response === "yes" ? "active" : ""}
                              onClick={() => setDraft(t.id, { response: "yes" })}
                              style={draft.response === "yes" ? { background: "var(--ok-soft)", color: "var(--ok)" } : {}}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              className={draft.response === "no" ? "active" : ""}
                              onClick={() => setDraft(t.id, { response: "no" })}
                              style={draft.response === "no" ? { background: "var(--bad-soft, #fbe1d8)", color: "var(--err, #b13c1c)" } : {}}
                            >
                              No
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ minWidth: 180 }}>
                        {isAdmin ? (
                          <div style={{ fontSize: 12, color: t.remarks ? "var(--ink-2)" : "var(--ink-4)", maxWidth: 260, lineHeight: 1.4 }}>
                            {t.remarks || "—"}
                          </div>
                        ) : (
                          <input
                            className="input"
                            style={{ height: 30, fontSize: 12, minWidth: 160 }}
                            value={draft.remarks}
                            onChange={(e) => setDraft(t.id, { remarks: e.target.value })}
                            placeholder="Status remarks…"
                          />
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          {!isAdmin && (
                            <button
                              className="btn sm accent"
                              onClick={() => handleSaveResponse(t)}
                              disabled={busyId === t.id || !dirty}
                              title="Save Yes/No and remarks for Admin"
                            >
                              <Icon name="check" size={11} />{busyId === t.id ? "Saving…" : "Save"}
                            </button>
                          )}
                          {(isAdmin || isSelfCreated(t)) && (
                            <button className="icon-btn" onClick={() => handleRemove(t)} disabled={busyId === t.id} title="Remove">
                              <Icon name="x" size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AddTaskModal
          users={users}
          selfOnly={!isAdmin}
          selfName={session?.name || "You"}
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
        />
      )}
    </div>
  );
}

function AddTaskModal({ users, onClose, onSubmit, selfOnly = false, selfName = "You" }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", assignedTo: "", priority: "normal", dueDate: "",
  });
  const titleRef = useRef(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
      if (!selfOnly && !form.assignedTo) throw new Error("Pick an assignee");
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim() || null,
        ...(selfOnly
          ? { self: true }
          : { assignedTo: form.assignedTo }),
        priority: form.priority,
        dueDate: form.dueDate || null,
      });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <ModalShell
      title={selfOnly ? "Self task" : "New task"}
      sub={selfOnly ? "Add a task for yourself — Admin can see it" : "Assign work to a staff member"}
      onClose={onClose}
      width={520}
    >
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
        {selfOnly ? (
          <Field label="Assigned to">
            <div className="input" style={{ display: "flex", alignItems: "center", color: "var(--ink-2)", background: "var(--bg-2)" }}>
              {selfName} <span style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-4)" }}>(you)</span>
            </div>
          </Field>
        ) : (
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
        )}
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
            {busy
              ? (selfOnly ? "Adding…" : "Assigning…")
              : <><Icon name="check" size={13} />{selfOnly ? "Add self task" : "Assign task"}</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
