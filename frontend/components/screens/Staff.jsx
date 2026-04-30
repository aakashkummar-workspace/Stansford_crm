"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip } from "../ui";
import DocumentsPanel from "../DocumentsPanel";

const FILTERS = [
  { k: "all", label: "All" },
  { k: "teacher", label: "Teachers" },
  { k: "ops", label: "Ops" },
  { k: "intern", label: "Interns" },
];

function Toast({ msg, tone, onClose }) {
  if (!msg) return null;
  const bg = tone === "ok" ? "var(--ok)" : tone === "err" ? "var(--err, #b13c1c)" : "var(--ink)";
  return (
    <div
      role="status"
      onClick={onClose}
      style={{
        position: "fixed", bottom: 18, right: 18, zIndex: 9000,
        background: bg, color: "#fff",
        padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
        boxShadow: "0 12px 30px -16px rgba(0,0,0,0.35)", cursor: "pointer",
        maxWidth: 360,
      }}
    >
      {msg}
    </div>
  );
}

export default function ScreenStaff({ E, refresh, role }) {
  const canEdit = role === "principal" || role === "admin";
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [docsFor, setDocsFor] = useState(null); // staff being shown in the docs modal
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const allStaff = E.STAFF || [];
  const filtered = useMemo(() => {
    const sorted = [...allStaff].sort((a, b) => (b.score || 0) - (a.score || 0));
    if (filter === "all") return sorted;
    return sorted.filter((s) => (s.role || "").toLowerCase().includes(filter));
  }, [allStaff, filter]);

  const total = allStaff.length;
  const interns = allStaff.filter((s) => /intern/i.test(s.role)).length;
  const avg = total
    ? Math.round(allStaff.reduce((a, s) => a + (s.score || 0), 0) / total)
    : "—";
  const lows = allStaff.filter((s) => s.status === "low").length;

  const showToast = (msg, tone) => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3500);
  };

  async function handleAdd(payload) {
    try {
      const r = await fetch("/api/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed to add staff");
      setShowAdd(false);
      // If a login was auto-provisioned (teachers with email), surface the
      // default password so the principal can share it. Otherwise plain toast.
      if (json.createdLogin) {
        showToast(
          `${json.staff.name} added · login: ${json.createdLogin.email} / ${json.createdLogin.defaultPassword}`,
          "ok",
        );
      } else {
        showToast(`${json.staff.name} added to staff`, "ok");
      }
      await refresh?.();
    } catch (e) {
      showToast(e.message, "err");
      throw e;
    }
  }

  async function handleRemove(s) {
    if (!confirm(`Remove ${s.name} from staff?`)) return;
    try {
      const r = await fetch("/api/staff", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: s.id }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "Failed to remove staff");
      setOpenMenuId(null);
      showToast(`${s.name} removed`, "ok");
      await refresh?.();
    } catch (e) {
      showToast(e.message, "err");
    }
  }

  function downloadMonthlyReport() {
    const month = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const rows = filtered.length ? filtered : allStaff;
    if (!rows.length) {
      showToast("Nothing to export — add staff first", "err");
      return;
    }
    const header = ["#", "ID", "Name", "Role", "Department", "Phone", "Email", "Joining", "Salary (₹)", "Attendance %", "Tasks %", "Score", "Status"];
    const csv = [
      `# Vidyalaya360 — Staff Monthly Report — ${month}`,
      `# Generated: ${new Date().toLocaleString("en-IN")}`,
      header.join(","),
      ...rows.map((s, i) => [
        i + 1,
        s.id,
        csvEscape(s.name),
        csvEscape(s.role),
        csvEscape(s.dept),
        csvEscape(s.phone),
        csvEscape(s.email || ""),
        csvEscape(s.joiningDate || ""),
        s.salary || 0,
        s.attendance ?? 0,
        s.tasks ?? 0,
        s.score ?? 0,
        s.status,
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff-report-${month.replace(/\s+/g, "-").toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded report for ${month}`, "ok");
  }

  function openRowMenu(e, id) {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 140 });
    setOpenMenuId(openMenuId === id ? null : id);
  }
  useEffect(() => {
    const onClick = (e) => {
      if (!e.target.closest?.("[data-row-menu]") && !e.target.closest?.("[data-row-menu-btn]")) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">People · Performance</div>
          <div className="page-title">Staff & <span className="amber">Interns</span></div>
          <div className="page-sub">Performance · attendance · tasks · interns rotations</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={downloadMonthlyReport}>
            <Icon name="download" size={13} />Monthly report
          </button>
          {canEdit && (
            <button className="btn accent" onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={13} />Add staff
            </button>
          )}
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Total staff" value={total} sub="all roles" puck="mint" puckIcon="staff" />
        <KPI label="Interns" value={interns} sub="active" puck="peach" puckIcon="users" />
        <KPI label="Avg performance" value={avg} sub="composite score" puck="cream" puckIcon="trending" />
        <KPI label="Low performers" value={lows} sub="needs review" puck="rose" puckIcon="warning" />
      </div>

      <div className="grid g-12">
        <div className="card col-8">
          <div className="card-head">
            <div>
              <div className="card-title">Performance leaderboard</div>
              <div className="card-sub">Score = 40% attendance + 40% tasks + 20% activity</div>
            </div>
            <div className="card-actions">
              <div className="segmented">
                {FILTERS.map((f) => (
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
                  <th>#</th><th>Name</th><th>Role</th><th>Attendance</th><th>Tasks</th><th>Score</th><th>Status</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="empty">
                      {allStaff.length === 0
                        ? "No staff added yet. Click “Add staff” to start."
                        : `No ${filter} match the current filter.`}
                    </td>
                  </tr>
                )}
                {filtered.map((s, i) => (
                  <tr key={s.id || s.name}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)" }}>{String(i + 1).padStart(2, "0")}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <AvatarChip initials={s.avatar || initialsOf(s.name)} />
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 500 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: "var(--ink-4)" }}>{s.dept}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{s.role}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="bar" style={{ width: 60 }}>
                          <span style={{ width: `${s.attendance || 0}%`, background: (s.attendance || 0) < 85 ? "var(--warn)" : "var(--ok)" }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11 }}>{s.attendance ?? 0}%</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div className="bar" style={{ width: 60 }}>
                          <span style={{ width: `${s.tasks || 0}%`, background: "var(--accent)" }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11 }}>{s.tasks ?? 0}%</span>
                      </div>
                    </td>
                    <td><span className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{s.score ?? 0}</span></td>
                    <td>
                      {s.status === "top" && <span className="chip ok"><span className="dot" />Top performer</span>}
                      {s.status === "ok" && <span className="chip"><span className="dot" />On track</span>}
                      {s.status === "low" && <span className="chip bad"><span className="dot" />Needs review</span>}
                    </td>
                    {canEdit && (
                      <td style={{ width: 36, textAlign: "right" }}>
                        <button
                          data-row-menu-btn
                          className="icon-btn"
                          onClick={(e) => openRowMenu(e, s.id || s.name)}
                          title="Actions"
                        >
                          <Icon name="more" size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-4" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div className="card-head"><div><div className="card-title">Today&apos;s attendance</div></div></div>
            {total === 0 ? (
              <div className="empty">Mark staff in/out to see today&apos;s check-in summary.</div>
            ) : (
              <div style={{ padding: "8px 14px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--ink-3)" }}>Avg attendance this month</span>
                  <span className="mono" style={{ fontWeight: 500 }}>
                    {Math.round(allStaff.reduce((a, s) => a + (s.attendance || 0), 0) / total)}%
                  </span>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-4)" }}>
                  Live punch-in/out is in the roadmap. For now, attendance % is set per staff at hiring time.
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Intern rotations</div></div></div>
            {interns === 0 ? (
              <div className="empty">No intern rotations set up yet.</div>
            ) : (
              <div style={{ padding: "8px 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                {allStaff.filter((s) => /intern/i.test(s.role)).map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>{s.name}</span>
                    <span style={{ color: "var(--ink-3)" }}>{s.dept}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head"><div><div className="card-title">Alerts</div></div></div>
            {lows === 0 ? (
              <div className="empty">No alerts.</div>
            ) : (
              <div style={{ padding: "8px 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                {allStaff.filter((s) => s.status === "low").map((s) => (
                  <div key={s.id} style={{ fontSize: 12, color: "var(--err, #b13c1c)" }}>
                    {s.name} · score {s.score}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {openMenuId && canEdit && (() => {
        const s = allStaff.find((x) => (x.id || x.name) === openMenuId);
        if (!s) return null;
        return (
          <div
            data-row-menu
            style={{
              position: "fixed", top: menuPos.top, left: menuPos.left,
              minWidth: 140, background: "var(--card, #fff)",
              border: "1px solid var(--line, #e5dfd1)", borderRadius: 8,
              padding: 4, zIndex: 200,
              boxShadow: "0 16px 40px -20px rgba(0,0,0,0.25)",
            }}
          >
            <button
              onClick={() => { setDocsFor(s); setOpenMenuId(null); }}
              style={{
                width: "100%", textAlign: "left",
                padding: "7px 10px", background: "transparent",
                border: 0, borderRadius: 5, cursor: "pointer",
                color: "var(--ink-2)", fontSize: 12,
              }}
            >
              View documents
            </button>
            <button
              onClick={() => handleRemove(s)}
              style={{
                width: "100%", textAlign: "left",
                padding: "7px 10px", background: "transparent",
                border: 0, borderRadius: 5, cursor: "pointer",
                color: "var(--err, #b13c1c)", fontSize: 12,
              }}
            >
              Remove from staff
            </button>
          </div>
        );
      })()}

      {showAdd && (
        <AddStaffModal onClose={() => setShowAdd(false)} onSubmit={handleAdd} />
      )}

      {docsFor && (
        <ModalShell title={`Documents · ${docsFor.name}`} sub={`${docsFor.id || ""} · ${docsFor.role}`} onClose={() => setDocsFor(null)} width={520}>
          <div className="card-body">
            <DocumentsPanel entityType="staff" entityId={docsFor.id || docsFor.name} canEdit={canEdit} />
          </div>
        </ModalShell>
      )}

      <Toast msg={toast?.msg} tone={toast?.tone} onClose={() => setToast(null)} />
    </div>
  );
}

function initialsOf(name) {
  if (!name) return "—";
  return String(name).trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function ModalShell({ title, sub, onClose, children, width = 520 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
        display: "grid", placeItems: "center", zIndex: 250, padding: 16,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: width }}>
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

function AddStaffModal({ onClose, onSubmit }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "", role: "Teacher", dept: "", phone: "", email: "",
    salary: "", attendance: 95, tasks: 90,
  });
  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      await onSubmit(form);
    } catch (ex) {
      setErr(ex.message || String(ex));
      setBusy(false);
    }
  }

  return (
    <ModalShell title="New staff" sub="Auto-assigned ID · added to leaderboard" onClose={onClose}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Full name *">
          <input className="input" ref={nameRef} required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Anita Kumar" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Role">
            <select className="select" value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option>Teacher</option>
              <option>Ops</option>
              <option>Intern</option>
            </select>
          </Field>
          <Field label="Department">
            <input
              className="input"
              value={form.dept}
              onChange={(e) => set("dept", e.target.value)}
              placeholder={form.role === "Teacher" ? "Academics" : form.role === "Ops" ? "Operations" : "Internship"}
            />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Phone (10-digit Indian)">
            <input
              className="input"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="98XXXXXXXX"
              inputMode="numeric"
            />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="staff@school.com" />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Salary (₹/month)">
            <input
              className="input"
              value={form.salary}
              onChange={(e) => set("salary", e.target.value.replace(/\D/g, ""))}
              placeholder="35000"
              inputMode="numeric"
            />
          </Field>
          <Field label="Attendance %">
            <input
              className="input"
              type="number" min={0} max={100} value={form.attendance}
              onChange={(e) => set("attendance", e.target.value)}
            />
          </Field>
          <Field label="Tasks %">
            <input
              className="input"
              type="number" min={0} max={100} value={form.tasks}
              onChange={(e) => set("tasks", e.target.value)}
            />
          </Field>
        </div>

        {err && (
          <div style={{
            background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)",
            padding: "9px 12px", borderRadius: 7, fontSize: 12,
          }}>{err}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy}>
            {busy ? "Adding…" : <><Icon name="check" size={13} />Add staff</>}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </span>
      {children}
    </label>
  );
}
