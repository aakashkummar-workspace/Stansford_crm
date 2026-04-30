"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import { KPI } from "../ui";
import { resolveSchool, downloadPdf } from "@/lib/export";

const CATEGORIES = [
  "Academic", "Discipline", "Sports", "Arts", "Leadership",
  "Punctuality", "Attendance", "Community service", "Other",
];

const TYPE_TONE = { reward: "ok", remark: "bad" };

export default function ScreenRemarksRewards({ E, role, session, refresh }) {
  const isManager = role === "admin" || role === "principal";
  const canWrite  = isManager || role === "academic_director" || role === "teacher";
  // Build a set of identifiers that all map to "this is about me" — the
  // signed-in user's account id plus the staff row id linked to that
  // user's email. This makes the "About you" chip robust whether the
  // record was written with the user id (new path) or the staff row id
  // (legacy path) as targetId.
  const myIds = useMemo(() => {
    const set = new Set();
    if (session?.sub) set.add(session.sub);
    const myStaff = (E.STAFF || []).find(
      (s) => s.email && session?.email && s.email.toLowerCase() === session.email.toLowerCase()
    );
    if (myStaff?.id) set.add(myStaff.id);
    return set;
  }, [session?.sub, session?.email, E.STAFF]);
  const [items, setItems] = useState(E.REMARKS_REWARDS || []);
  const [filterTarget, setFilterTarget] = useState("all"); // all|student|teacher
  const [filterType,   setFilterType]   = useState("all"); // all|reward|remark
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState(null);
  const flash = (msg, tone = "ok") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2400);
  };

  async function reload() {
    try {
      const r = await fetch("/api/remarks-rewards", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (j?.ok) setItems(j.items || []);
    } catch {}
  }
  useEffect(() => { reload(); }, []);

  const studentMap = useMemo(() => {
    const m = new Map();
    for (const s of (E.ADDED_STUDENTS || [])) m.set(s.id, s);
    return m;
  }, [E.ADDED_STUDENTS]);
  const userMap = useMemo(() => {
    const m = new Map();
    for (const u of (E.USERS || [])) m.set(u.id, u);
    for (const s of (E.STAFF || [])) m.set(s.id, s);
    return m;
  }, [E.USERS, E.STAFF]);
  const targetName = (r) => {
    if (r.targetType === "student") return studentMap.get(r.targetId)?.name || r.targetId;
    if (r.targetType === "teacher") return userMap.get(r.targetId)?.name || r.targetId;
    return r.targetId;
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((r) => {
      if (filterTarget !== "all" && r.targetType !== filterTarget) return false;
      if (filterType   !== "all" && r.type       !== filterType)   return false;
      if (term) {
        const blob = `${targetName(r)} ${r.category || ""} ${r.description || ""} ${r.actionTaken || ""}`.toLowerCase();
        if (!blob.includes(term)) return false;
      }
      return true;
    });
  }, [items, filterTarget, filterType, q, studentMap, userMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [filterTarget, filterType, q]);

  const counts = useMemo(() => ({
    total: items.length,
    rewards: items.filter((r) => r.type === "reward").length,
    remarks: items.filter((r) => r.type === "remark").length,
    students: items.filter((r) => r.targetType === "student").length,
  }), [items]);

  async function submitNew(payload) {
    const r = await fetch("/api/remarks-rewards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
    setShowForm(false);
    flash(`${payload.type === "reward" ? "Reward" : "Remark"} added`, "ok");
    await reload();
    await refresh?.();
  }

  async function remove(id) {
    if (!confirm("Remove this entry from the record?")) return;
    setBusy(id);
    try {
      const r = await fetch("/api/remarks-rewards", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || "Failed");
      flash("Entry removed", "ok");
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
    downloadPdf({
      title: "Remarks & Rewards",
      subtitle: `${filtered.length} record${filtered.length === 1 ? "" : "s"}`,
      school, actor,
      dateRange: "Current snapshot",
      orientation: "landscape",
      summary: [
        { label: "Total",   value: filtered.length },
        { label: "Rewards", value: filtered.filter((r) => r.type === "reward").length },
        { label: "Remarks", value: filtered.filter((r) => r.type === "remark").length },
        { label: "Targets", value: new Set(filtered.map((r) => targetName(r))).size },
      ],
      columns: [
        { key: "i",          label: "#",          align: "right",  width: "32px" },
        { key: "id",         label: "ID",         width: "100px" },
        { key: "type",       label: "Type",       align: "center", width: "80px" },
        { key: "targetType", label: "Target",     align: "center", width: "80px" },
        { key: "name",       label: "Name" },
        { key: "category",   label: "Category",   width: "100px" },
        { key: "description",label: "Description" },
        { key: "actionTaken",label: "Action taken" },
        { key: "createdAt",  label: "Created",    align: "right",  width: "130px" },
      ],
      rows: filtered.map((r, i) => ({
        i: i + 1, id: r.id,
        type: (r.type || "—").replace(/^./, (c) => c.toUpperCase()),
        targetType: r.targetType || "—",
        name: targetName(r) || "—",
        category: r.category || "—",
        description: r.description || "—",
        actionTaken: r.actionTaken || "—",
        createdAt: r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "—",
      })),
      filename: `${school.name.replace(/\s+/g, "-").toLowerCase()}-remarks-rewards-${new Date().toISOString().slice(0, 10)}`,
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
          <div className="page-eyebrow">People · Recognition</div>
          <div className="page-title">Remarks &amp; <span className="amber">rewards</span></div>
          <div className="page-sub">
            Recognise positive behaviour and capture concerns — for both students and staff.
            Every entry is permanent and visible to the people it concerns.
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={exportPdf} disabled={filtered.length === 0} title="Open a printable, branded PDF report">
            <Icon name="download" size={13} />Export PDF
          </button>
          {canWrite && (
            <button className="btn accent" onClick={() => setShowForm(true)}>
              <Icon name="plus" size={13} />New entry
            </button>
          )}
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 18 }}>
        <KPI label="Total entries" value={counts.total} sub="this term" puck="cream" puckIcon="audit" />
        <KPI label="Rewards" value={counts.rewards} sub="positive entries" puck="mint" puckIcon="check" />
        <KPI label="Remarks" value={counts.remarks} sub="needs follow-up" puck="rose" puckIcon="warning" />
        <KPI label="On students" value={counts.students} sub={`${counts.total - counts.students} on staff`} puck="peach" puckIcon="students" />
      </div>

      <div className="card" style={{ marginBottom: 14, padding: "10px 14px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="input"
          placeholder="Search name, category, description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select className="select" value={filterTarget} onChange={(e) => setFilterTarget(e.target.value)}>
          <option value="all">Students &amp; staff</option>
          <option value="student">Students only</option>
          <option value="teacher">Staff only</option>
        </select>
        <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">Rewards &amp; remarks</option>
          <option value="reward">Rewards only</option>
          <option value="remark">Remarks only</option>
        </select>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">{filtered.length} entr{filtered.length === 1 ? "y" : "ies"}</div>
            <div className="card-sub">Page {page} of {totalPages}</div>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty" style={{ padding: 36 }}>No entries match the filters.</div>
        ) : (
          <div>
            {paged.map((r) => (
              <div key={r.id} className="lrow" style={{ alignItems: "flex-start", gap: 12, paddingTop: 12, paddingBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: r.type === "reward" ? "var(--ok-soft, #e3f2e7)" : "var(--bad-soft, #fbe1d8)",
                  color:      r.type === "reward" ? "var(--ok)" : "var(--bad, #b13c1c)",
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  <Icon name={r.type === "reward" ? "check" : "warning"} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {r.targetType === "teacher" && myIds.has(r.targetId) ? (
                      <>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-2, var(--accent))" }}>You</span>
                        <span className="chip accent"><span className="dot" />About you</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{targetName(r)}</span>
                        <span className="chip">{r.targetType}</span>
                      </>
                    )}
                    <span className={`chip ${TYPE_TONE[r.type] || "info"}`}>
                      <span className="dot" />{r.type}
                    </span>
                    {r.category && <span className="chip">{r.category}</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 5, lineHeight: 1.5 }}>
                    {r.description}
                  </div>
                  {r.actionTaken && (
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3 }}>
                      <strong>Action:</strong> {r.actionTaken}
                    </div>
                  )}
                  <div style={{ fontSize: 10.5, color: "var(--ink-4)", marginTop: 3 }}>
                    {r.id} · {r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "—"}
                  </div>
                </div>
                {isManager && (
                  <button
                    className="btn sm"
                    onClick={() => remove(r.id)}
                    disabled={busy === r.id}
                    style={{ flexShrink: 0 }}
                  >Remove</button>
                )}
              </div>
            ))}
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
        <NewEntryModal
          role={role}
          students={E.ADDED_STUDENTS || []}
          staff={E.STAFF || []}
          users={E.USERS || []}
          onClose={() => setShowForm(false)}
          onSubmit={submitNew}
        />
      )}
    </div>
  );
}

function NewEntryModal({ role, students, staff, users = [], onClose, onSubmit }) {
  const isTeacher = role === "teacher";
  const isAcademicDirector = role === "academic_director";
  const canTargetTeacher = !isTeacher && !isAcademicDirector;

  // Build the staff dropdown list with each option's *user account id* as
  // the value (matched via email). Falls back to the staff row id when
  // there's no linked user account so the picker still works for staff
  // who haven't been provisioned a login yet.
  const staffOptions = (staff || []).map((s) => {
    const user = (users || []).find(
      (u) => u.email && s.email && u.email.toLowerCase() === s.email.toLowerCase()
    );
    return {
      value: user?.id || s.id,        // prefer user id so teacher's filter matches
      label: `${s.name}${s.role ? ` — ${s.role}` : ""}${user ? "" : " · no login"}`,
      hasLogin: !!user,
    };
  });

  const [form, setForm] = useState({
    targetType: "student",
    targetId: students[0]?.id || "",
    type: "reward",
    category: "Academic",
    description: "",
    actionTaken: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // When the target type changes, reset the id to the first option.
  useEffect(() => {
    if (form.targetType === "student") set("targetId", students[0]?.id || "");
    else                                set("targetId", staffOptions[0]?.value || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.targetType]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!form.targetId)    { setErr("Pick a target"); return; }
    if (!form.description.trim()) { setErr("Describe what happened"); return; }
    setBusy(true); setErr("");
    try { await onSubmit(form); }
    catch (ex) { setErr(ex.message); setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      zIndex: 250, display: "grid", placeItems: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 520, maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}>
        <div className="card-head">
          <div>
            <div className="card-title">New entry</div>
            <div className="card-sub">This goes onto the permanent record.</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Type">
              <div className="segmented">
                <button type="button" className={form.type === "reward" ? "active" : ""} onClick={() => set("type", "reward")}>Reward</button>
                <button type="button" className={form.type === "remark" ? "active" : ""} onClick={() => set("type", "remark")}>Remark</button>
              </div>
            </Field>
            <Field label="Target">
              <div className="segmented">
                <button type="button" className={form.targetType === "student" ? "active" : ""} onClick={() => set("targetType", "student")}>Student</button>
                <button type="button" className={form.targetType === "teacher" ? "active" : ""} onClick={() => set("targetType", "teacher")} disabled={!canTargetTeacher}>Staff</button>
              </div>
            </Field>
          </div>
          <Field label={form.targetType === "student" ? "Student" : "Staff member"}>
            <select className="select" value={form.targetId} onChange={(e) => set("targetId", e.target.value)} required>
              {form.targetType === "student"
                ? students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.cls}</option>)
                : staffOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select className="select" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Description">
            <textarea
              className="input" rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value.slice(0, 1000))}
              placeholder="What happened, when, who saw it."
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </Field>
          <Field label="Action taken (optional)">
            <input
              className="input"
              value={form.actionTaken}
              onChange={(e) => set("actionTaken", e.target.value)}
              placeholder="e.g. Letter to parent · Counselling · Award letter"
            />
          </Field>
          {err && <div style={{ background: "var(--bad-soft, #fbe1d8)", color: "var(--bad, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700 }}>{err}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn accent" disabled={busy}>
              {busy ? "Saving…" : <><Icon name="check" size={13} />Save entry</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-3)" }}>{label}</span>
      {children}
    </label>
  );
}

