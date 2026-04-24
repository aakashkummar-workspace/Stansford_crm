"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip, StatusChip } from "../ui";

export default function ScreenStudents({ E, refresh, role }) {
  // Teachers, principals and admin can edit student details. Parents cannot —
  // they can't even see this screen on the current nav, but the gate is
  // defensive.
  const canEdit = role === "principal" || role === "admin" || role === "teacher";

  // ---------- state ----------
  const [classFilter, setClassFilter] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAdmission, setShowAdmission] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [profileOf, setProfileOf] = useState(null);
  const [editingOf, setEditingOf] = useState(null); // student being edited, or null
  const [picked, setPicked] = useState(new Set());
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [view, setView] = useState("active"); // 'active' | 'archived'
  const [confirmArchive, setConfirmArchive] = useState(null); // student awaiting confirmation
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const flash = (msg, tone = "ok") => {
    setToast({ msg, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  // ---------- data ----------
  // The roster is populated entirely from real DB rows (no mock baseline).
  const activeRoster   = (E.ADDED_STUDENTS    || []).map((s) => ({ ...s, __added: true, __status: "active" }));
  const archivedRoster = (E.ARCHIVED_STUDENTS || []).map((s) => ({ ...s, __added: true, __status: "archived" }));
  const roster = view === "archived" ? archivedRoster : activeRoster;

  const visible = roster.filter((s) => {
    if (classFilter === "All") return true;
    return `Class ${s.cls.split("-")[0]}` === classFilter;
  });

  const eligibleIds = visible.map((s) => s.id);
  const allChecked = eligibleIds.length > 0 && eligibleIds.every((id) => picked.has(id));

  // Drop selections that no longer exist
  useEffect(() => {
    setPicked((prev) => {
      const valid = new Set(roster.map((s) => s.id));
      let changed = false;
      const next = new Set();
      prev.forEach((id) => { if (valid.has(id)) next.add(id); else changed = true; });
      return changed ? next : prev;
    });
  }, [roster.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- handlers ----------
  const togglePick = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const togglePickAll = () => {
    if (allChecked) setPicked(new Set());
    else setPicked(new Set(eligibleIds));
  };

  const exportCsv = () => {
    const header = "ID,Name,Class,Parent,Attendance,Fee,Transport,Joined";
    const rows = visible.map(
      (s) => `${s.id},"${s.name}",${s.cls},${s.parent.replace(/,/g, "")},${s.attendance}%,${s.fee},${s.transport},${s.joined}`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${classFilter.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    flash(`Exported ${visible.length} rows to CSV`);
  };

  // Wrap fetch so a network failure (server restart, dev hot-reload mid-click,
  // offline) becomes a toast instead of an unhandled "Failed to fetch" overlay.
  const safeFetch = async (url, init) => {
    try {
      const r = await fetch(url, init);
      const json = await r.json().catch(() => ({}));
      return { ok: r.ok && json.ok !== false, status: r.status, json };
    } catch (e) {
      return { ok: false, status: 0, json: { error: "Network error — couldn't reach the server. Is the dev server still running?" } };
    }
  };

  const handleImportFile = (file) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const csv = ev.target?.result;
      if (typeof csv !== "string") { flash("Could not read file", "bad"); return; }
      const { ok, json } = await safeFetch("/api/students/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      if (ok) {
        flash(`Imported ${json.count} students`);
        await refresh?.();
        setShowImport(false);
      } else {
        flash(json.error || "Import failed", "bad");
      }
    };
    reader.onerror = () => flash("Could not read file", "bad");
    reader.readAsText(file);
  };

  const submitAdmission = async (form) => {
    const { ok, json } = await safeFetch("/api/students", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (ok) {
      flash(`Admitted ${json.student.name} · ${json.student.id}`);
      await refresh?.();
      setShowAdmission(false);
    } else {
      flash(json.error || "Admission failed", "bad");
    }
  };

  // Soft-delete: archives the student. All their fee receipts and daily logs
  // are preserved. The pending fee (if any) is dropped because we no longer
  // expect to collect it.
  const archiveStudent = async (s) => {
    const { ok, json } = await safeFetch("/api/students", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: s.id }),
    });
    if (ok) { flash(`Withdrew ${s.name} · history preserved`); await refresh?.(); }
    else flash(json.error || "Withdraw failed", "bad");
    setOpenMenuFor(null);
    setConfirmArchive(null);
  };

  const restoreStudent = async (s) => {
    const { ok, json } = await safeFetch("/api/students/restore", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: s.id }),
    });
    if (ok) { flash(`Restored ${s.name}`); await refresh?.(); }
    else flash(json.error || "Restore failed", "bad");
    setOpenMenuFor(null);
  };

  const submitEdit = async (payload) => {
    const { ok, json } = await safeFetch("/api/students", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (ok) {
      flash(`Updated ${json.student.name}`);
      await refresh?.();
      setEditingOf(null);
    } else {
      flash(json.error || "Update failed", "bad");
    }
  };

  // ---------- render ----------
  return (
    <div className="page">
      <Toast toast={toast} />

      <div className="page-head">
        <div>
          <div className="page-eyebrow">People · Roster</div>
          <div className="page-title">Students <span className="amber">at school</span></div>
          <div className="page-sub">{roster.length} {roster.length === 1 ? "child" : "children"} on roll · classes 1–8</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setShowImport(true)}><Icon name="upload" size={13} />Import</button>
          <button className="btn" onClick={exportCsv}><Icon name="download" size={13} />Export</button>
          <button className="btn accent" onClick={() => setShowAdmission(true)}><Icon name="plus" size={13} />New admission</button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI
          label="Enrolled" value={roster.length} sub="across 8 classes"
          puck="mint" puckIcon="students"
          details={{
            title: `Enrolled · ${roster.length} students`,
            sub: "Click a student in the table to open their profile",
            items: roster.slice(0, 12).map((s) => ({
              label: s.name,
              value: s.cls,
              sub: `${s.id} · ${s.parent}`,
            })),
          }}
        />
        <KPI
          label="New admissions" value={roster.length} sub="this session"
          puck="peach" puckIcon="enquiry"
          details={{
            title: `Admissions · ${roster.length} this session`,
            sub: "Recent admissions, newest first",
            items: roster.slice(0, 10).map((s) => ({
              label: s.name,
              value: s.joined,
              sub: `${s.cls} · ${s.id}`,
            })),
          }}
        />
        <KPI label="Average attendance" value={roster.length ? `${Math.round(roster.reduce((a, s) => a + (s.attendance || 0), 0) / roster.length)}%` : "—"} sub="across all students" puck="cream" puckIcon="check" />
        <KPI label="Transfer certificates" value={0} sub="processed this month" puck="rose" puckIcon="reports" />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">{view === "archived" ? "Archived students" : "All students"}</div>
            <div className="card-sub">
              {view === "archived"
                ? `${archivedRoster.length} withdrawn · records preserved`
                : "Auto-assigned IDs · auto fee schedule"}
            </div>
          </div>
          <div className="card-actions">
            <div className="segmented">
              <button className={view === "active" ? "active" : ""} onClick={() => setView("active")}>
                Active · {activeRoster.length}
              </button>
              <button className={view === "archived" ? "active" : ""} onClick={() => setView("archived")}>
                Archived · {archivedRoster.length}
              </button>
            </div>
            <div className="segmented" style={{ flexWrap: "wrap" }}>
              {["All", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"].map((f) => (
                <button key={f} className={classFilter === f ? "active" : ""} onClick={() => setClassFilter(f)}>{f}</button>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <button className={`btn sm ${classFilter !== "All" ? "accent" : ""}`} onClick={() => setFilterOpen((v) => !v)}>
                <Icon name="filter" size={12} />
                {classFilter === "All" ? "Filter" : classFilter}
              </button>
              {filterOpen && (
                <FilterMenu
                  value={classFilter}
                  onClose={() => setFilterOpen(false)}
                  onPick={(v) => { setClassFilter(v); setFilterOpen(false); }}
                />
              )}
            </div>
          </div>
        </div>

        {picked.size > 0 && (
          <div style={{
            padding: "10px 18px", display: "flex", alignItems: "center", gap: 12,
            background: "var(--accent-soft)", borderBottom: "1px solid var(--rule-2)",
            fontSize: 12.5,
          }}>
            <span style={{ fontWeight: 500, color: "var(--accent-2)" }}>{picked.size} selected</span>
            <button className="btn sm accent" onClick={() => flash(`WhatsApp template queued for ${picked.size} parents`)}>
              <Icon name="whatsapp" size={11} />Message parents
            </button>
            <button className="btn sm" onClick={() => flash(`SMS queued for ${picked.size} parents`)}>
              <Icon name="sms" size={11} />SMS parents
            </button>
            <button className="btn sm ghost" onClick={() => setPicked(new Set())} style={{ marginLeft: "auto" }}>Clear</button>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 24 }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={togglePickAll}
                    disabled={eligibleIds.length === 0}
                  />
                </th>
                <th>Student</th>
                <th>ID</th>
                <th>Class</th>
                <th>Parent</th>
                <th>Attendance</th>
                <th>Fee</th>
                <th>Transport</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr><td colSpan={10} className="empty">No students match this filter.</td></tr>
              )}
              {visible.map((s) => (
                <tr key={s.id}>
                  <td><input type="checkbox" checked={picked.has(s.id)} onChange={() => togglePick(s.id)} /></td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AvatarChip initials={s.name.split(" ").map((n) => n[0]).join("")} />
                      <span style={{ fontSize: 12.5, fontWeight: 500 }}>
                        {s.name}
                        {s.__added && (
                          <span className="chip ok" style={{ marginLeft: 6, fontSize: 10, height: 18, padding: "0 6px" }}>
                            <span className="dot" />new
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-3)" }}>{s.id}</td>
                  <td><span className="chip">{s.cls}</span></td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>{s.parent}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div className="bar" style={{ width: 60 }}>
                        <span style={{ width: `${s.attendance}%`, background: s.attendance < 85 ? "var(--warn)" : "var(--ok)" }} />
                      </div>
                      <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.attendance}%</span>
                    </div>
                  </td>
                  <td><StatusChip status={s.fee}>{s.fee.charAt(0).toUpperCase() + s.fee.slice(1)}</StatusChip></td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{s.transport}</td>
                  <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{s.joined}</td>
                  <td>
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        if (openMenuFor === s.id) { setOpenMenuFor(null); return; }
                        const rect = e.currentTarget.getBoundingClientRect();
                        setOpenMenuFor(s.id);
                        setMenuAnchor({ x: rect.right, y: rect.bottom });
                      }}
                    >
                      <Icon name="more" size={14} />
                    </button>
                    {openMenuFor === s.id && menuAnchor && (
                      <RowMenu
                        student={s}
                        anchor={menuAnchor}
                        canEdit={canEdit}
                        onClose={() => setOpenMenuFor(null)}
                        onView={() => { setProfileOf(s); setOpenMenuFor(null); }}
                        onEdit={() => { setEditingOf(s); setOpenMenuFor(null); }}
                        onTC={() => { flash(`TC requested for ${s.name} · queued`); setOpenMenuFor(null); }}
                        onMessage={() => { window.open(`https://wa.me/${s.parent.replace(/[^0-9]/g, "")}`, "_blank"); flash("Opened WhatsApp"); setOpenMenuFor(null); }}
                        onWithdraw={() => { setConfirmArchive(s); setOpenMenuFor(null); }}
                        onRestore={() => restoreStudent(s)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmArchive && (
        <ConfirmArchive
          student={confirmArchive}
          onCancel={() => setConfirmArchive(null)}
          onConfirm={() => archiveStudent(confirmArchive)}
        />
      )}
      {showAdmission && <AdmissionModal classes={E.CLASSES || []} routes={E.ROUTES || []} students={E.ADDED_STUDENTS || []} onClose={() => setShowAdmission(false)} onSubmit={submitAdmission} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onFile={handleImportFile} />}
      {profileOf && (
        <ProfileModal
          student={profileOf}
          onClose={() => setProfileOf(null)}
          onMessage={() => { window.open(`https://wa.me/${profileOf.parent.replace(/[^0-9]/g, "")}`, "_blank"); flash("Opened WhatsApp"); }}
          onTC={() => { flash(`TC requested for ${profileOf.name} · queued`); setProfileOf(null); }}
        />
      )}
      {editingOf && canEdit && (
        <EditStudentModal
          student={editingOf}
          classes={E.CLASSES || []}
          onClose={() => setEditingOf(null)}
          onSubmit={submitEdit}
        />
      )}
    </div>
  );
}

// ---------- helpers ----------
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

function FilterMenu({ value, onPick, onClose }) {
  useEffect(() => {
    const onDoc = (e) => {
      if (!e.target.closest(".filter-menu") && !e.target.closest(".btn")) onClose();
    };
    setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => document.removeEventListener("click", onDoc);
  }, [onClose]);
  const opts = ["All", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"];
  return (
    <div className="filter-menu" style={{
      position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
      background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 10,
      boxShadow: "var(--shadow-lg)", padding: 6, minWidth: 160,
    }}>
      <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "6px 10px 4px" }}>
        Filter by class
      </div>
      {opts.map((o) => (
        <button key={o} onClick={() => onPick(o)} className="btn ghost"
          style={{
            width: "100%", justifyContent: "flex-start", height: 30, padding: "0 10px",
            fontSize: 12.5, background: value === o ? "var(--accent-soft)" : "transparent",
            color: value === o ? "var(--accent-2)" : "var(--ink)", fontWeight: value === o ? 500 : 400,
          }}>
          {o}
        </button>
      ))}
    </div>
  );
}

function RowMenu({ student, anchor, canEdit, onClose, onView, onEdit, onTC, onMessage, onWithdraw, onRestore }) {
  // Close on outside click + on scroll/resize (the menu is fixed-positioned
  // relative to the trigger, so anything that moves the trigger should close it).
  useEffect(() => {
    const onDoc = (e) => {
      if (!e.target.closest(".row-menu") && !e.target.closest(".icon-btn")) onClose();
    };
    const onScrollOrResize = () => onClose();
    setTimeout(() => document.addEventListener("click", onDoc), 0);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("click", onDoc);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [onClose]);

  const isArchived = student.__status === "archived";
  const items = [
    { label: "View profile", icon: "user", action: onView },
    ...(canEdit && !isArchived
      ? [{ label: "Edit details", icon: "pencil", action: onEdit }]
      : []),
    { label: "Message parent", icon: "whatsapp", action: onMessage, disabled: isArchived },
    { label: "Issue TC", icon: "book", action: onTC },
    isArchived
      ? { label: "Restore admission", icon: "refresh", action: onRestore }
      : { label: "Withdraw…", icon: "x", action: onWithdraw, danger: true },
  ];

  // Position the menu so its right edge aligns with the trigger's right edge
  // and it sits 6px below. If it would fall off the bottom of the viewport,
  // flip it above the trigger.
  const MENU_W = 200;
  const MENU_H = items.length * 32 + 8; // approx
  const wantsFlip = anchor.y + MENU_H + 16 > window.innerHeight;
  const top = wantsFlip ? Math.max(8, anchor.y - MENU_H - 24) : anchor.y + 6;
  const left = Math.max(8, anchor.x - MENU_W);

  return (
    <div className="row-menu" style={{
      position: "fixed", top, left, zIndex: 200, width: MENU_W,
      background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 9,
      boxShadow: "var(--shadow-lg)", padding: 4,
    }}>
      {items.map((it) => (
        <button
          key={it.label}
          onClick={it.disabled ? undefined : it.action}
          className="btn ghost"
          disabled={it.disabled}
          style={{
            width: "100%", justifyContent: "flex-start", height: 30, padding: "0 10px",
            fontSize: 12.5, color: it.danger && !it.disabled ? "var(--bad)" : it.disabled ? "var(--ink-4)" : "var(--ink)",
            cursor: it.disabled ? "not-allowed" : "pointer",
          }}
        >
          <Icon name={it.icon} size={12} />{it.label}
        </button>
      ))}
    </div>
  );
}

function ModalShell({ title, sub, onClose, children, width = 460 }) {
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

// Edit an existing student's core details. Mirrors the validation used by the
// admission form so back-and-forth edits don't smuggle in bad phone numbers.
function EditStudentModal({ student, classes = [], onClose, onSubmit }) {
  const classList = classes.length ? classes : [{ n: 1, label: "Class 1", sections: ["A", "B"] }];
  const sectionsFor = (n) => {
    const c = classList.find((x) => String(x.n) === String(n));
    return (c && c.sections && c.sections.length) ? c.sections : ["A"];
  };
  const [initialClsN, initialSec] = (() => {
    const [a, b] = String(student.cls || "1-A").split("-");
    return [a || "1", (b || "A").toUpperCase()];
  })();
  const initialPhoneDigits = (student.parent || "").replace(/\D/g, "").slice(-10);

  const [form, setForm] = useState({
    name: student.name || "",
    cls: initialClsN,
    section: initialSec,
    phoneDigits: initialPhoneDigits.length === 10 && /^[6-9]/.test(initialPhoneDigits) ? initialPhoneDigits : "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [touched, setTouched] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Keep the section valid when the class changes.
  useEffect(() => {
    const avail = sectionsFor(form.cls);
    if (!avail.includes(form.section)) setForm((f) => ({ ...f, section: avail[0] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cls]);

  const onPhoneChange = (e) => {
    const d = e.target.value.replace(/\D/g, "").slice(0, 10);
    set("phoneDigits", d);
  };
  const phoneError = (() => {
    if (!form.phoneDigits) return null; // optional — allowed to clear
    if (form.phoneDigits.length !== 10) return "Phone must be exactly 10 digits";
    if (!/^[6-9]/.test(form.phoneDigits)) return "Indian mobile numbers start with 6, 7, 8 or 9";
    return null;
  })();
  const phoneOk = !form.phoneDigits || (form.phoneDigits.length === 10 && /^[6-9]/.test(form.phoneDigits));
  const formValid = form.name.trim() && phoneOk;

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, phone: true });
    if (!formValid) return;
    setBusy(true); setErr("");
    try {
      await onSubmit({
        id: student.id,
        name: form.name.trim(),
        cls: form.cls,
        section: form.section,
        parent: form.phoneDigits
          ? `+91 ${form.phoneDigits.slice(0, 5)} ${form.phoneDigits.slice(5)}`
          : "—",
      });
    } catch (ex) { setErr(ex.message || String(ex)); }
    finally { setBusy(false); }
  };

  return (
    <ModalShell title="Edit student" sub={`${student.id} · joined ${student.joined}`} onClose={onClose}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Student full name *">
          <input
            className="input"
            autoFocus
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            style={touched.name && !form.name.trim() ? { borderColor: "var(--bad)" } : undefined}
          />
          {touched.name && !form.name.trim() && (
            <span style={{ fontSize: 11, color: "var(--bad)" }}>Name is required</span>
          )}
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Class">
            <select className="select" value={form.cls} onChange={(e) => set("cls", e.target.value)}>
              {classList.map((c) => <option key={c.n} value={c.n}>{c.label || `Class ${c.n}`}</option>)}
            </select>
          </Field>
          <Field label="Section">
            <select className="select" value={form.section} onChange={(e) => set("section", e.target.value)}>
              {sectionsFor(form.cls).map((s) => <option key={s} value={s}>Section {s}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Parent mobile (10 digits, Indian)">
          <div style={{
            display: "flex",
            border: "1px solid",
            borderColor: phoneError ? "var(--bad)" : "var(--rule)",
            borderRadius: 9, background: "var(--card)", overflow: "hidden", height: 34,
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", padding: "0 10px",
              background: "var(--card-2)", borderRight: "1px solid var(--rule)",
              fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--ink-3)",
            }}>+91</span>
            <input
              type="tel" inputMode="numeric" maxLength={10}
              value={form.phoneDigits}
              onChange={onPhoneChange}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              placeholder="98765 43210"
              style={{
                flex: 1, border: 0, background: "transparent", outline: "none",
                padding: "0 10px", fontSize: 13,
                fontFamily: "var(--font-mono)", letterSpacing: "0.05em",
              }}
            />
            <span style={{
              display: "inline-flex", alignItems: "center", padding: "0 10px",
              fontSize: 11, fontFamily: "var(--font-mono)",
              color: form.phoneDigits.length === 10 ? "var(--ok)" : "var(--ink-4)",
            }}>{form.phoneDigits.length}/10</span>
          </div>
          {touched.phone && phoneError && (
            <span style={{ fontSize: 11, color: "var(--bad)" }}>{phoneError}</span>
          )}
          {!phoneError && !form.phoneDigits && (
            <span style={{ fontSize: 11, color: "var(--ink-4)" }}>Leave blank to clear the contact.</span>
          )}
        </Field>

        {err && (
          <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>{err}</div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy || !formValid}>
            <Icon name="check" size={13} />{busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function AdmissionModal({ classes = [], routes = [], students = [], onClose, onSubmit }) {
  // Fall back to class 1 if the configured list is empty.
  const classList = classes.length ? classes : [{ n: 1, label: "Class 1", sections: ["A", "B"] }];
  const initialCls = String(classList[0].n);
  const sectionsFor = (n) => {
    const c = classList.find((x) => String(x.n) === String(n));
    return (c && c.sections && c.sections.length) ? c.sections : ["A"];
  };
  const [form, setForm] = useState({ name: "", cls: initialCls, section: sectionsFor(initialCls)[0], phoneDigits: "", transport: "—", pickupStop: "" });
  // Keep the section valid when the class changes.
  useEffect(() => {
    const avail = sectionsFor(form.cls);
    if (!avail.includes(form.section)) setForm((f) => ({ ...f, section: avail[0] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cls]);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // ---- Indian phone helpers ----
  const onPhoneChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 10);
    set("phoneDigits", onlyDigits);
  };
  const phoneError = (() => {
    if (!form.phoneDigits) return null; // optional until user types
    if (form.phoneDigits.length !== 10) return "Phone must be exactly 10 digits";
    if (!/^[6-9]/.test(form.phoneDigits)) return "Indian mobile numbers start with 6, 7, 8 or 9";
    return null;
  })();
  const formattedPhone = form.phoneDigits.length === 10
    ? `+91 ${form.phoneDigits.slice(0, 5)} ${form.phoneDigits.slice(5)}`
    : "";
  const phoneOk = !form.phoneDigits || (form.phoneDigits.length === 10 && /^[6-9]/.test(form.phoneDigits));
  const formValid = form.name.trim() && phoneOk;

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, phone: true });
    if (!formValid) return;
    setBusy(true);
    try {
      await onSubmit({
        name: form.name,
        cls: form.cls,
        section: form.section,
        parent: form.phoneDigits ? formattedPhone : "",
        transport: form.transport,
        pickupStop: form.transport && form.transport !== "—" ? form.pickupStop || "" : "",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="New admission" sub="Auto-assigned ID · auto fee schedule" onClose={onClose}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Student full name *">
          <input
            className="input"
            autoFocus
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            placeholder="e.g. Anaika Sharma"
            style={touched.name && !form.name.trim() ? { borderColor: "var(--bad)" } : undefined}
          />
          {touched.name && !form.name.trim() && (
            <span style={{ fontSize: 11, color: "var(--bad)" }}>Name is required</span>
          )}
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Class">
            <select className="select" value={form.cls} onChange={(e) => set("cls", e.target.value)}>
              {classList.map((c) => <option key={c.n} value={c.n}>{c.label || `Class ${c.n}`}</option>)}
            </select>
          </Field>
          <Field label="Section">
            <select className="select" value={form.section} onChange={(e) => set("section", e.target.value)}>
              {sectionsFor(form.cls).map((s) => <option key={s} value={s}>Section {s}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Parent mobile (10 digits, Indian)">
          <div style={{
            display: "flex",
            border: "1px solid",
            borderColor: phoneError ? "var(--bad)" : "var(--rule)",
            borderRadius: 9,
            background: "var(--card)",
            overflow: "hidden",
            height: 34,
          }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0 10px",
              background: "var(--card-2)",
              borderRight: "1px solid var(--rule)",
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              color: "var(--ink-3)",
            }}>+91</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phoneDigits}
              onChange={onPhoneChange}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              placeholder="98765 43210"
              style={{
                flex: 1,
                border: 0,
                background: "transparent",
                outline: "none",
                padding: "0 10px",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.05em",
              }}
            />
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0 10px",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: form.phoneDigits.length === 10 ? "var(--ok)" : "var(--ink-4)",
            }}>{form.phoneDigits.length}/10</span>
          </div>
          {touched.phone && phoneError && (
            <span style={{ fontSize: 11, color: "var(--bad)" }}>{phoneError}</span>
          )}
          {!phoneError && formattedPhone && (
            <span style={{ fontSize: 11, color: "var(--ok)" }}>Saved as {formattedPhone}</span>
          )}
        </Field>

        {(() => {
          // Compute live availability per route from current student assignments.
          // free = totalCap (sum of stop caps) − number of students already on that route.
          const routeStats = routes.map((r) => {
            const totalCap = (r.stops || []).reduce((a, s) => a + (Number(s.cap) || 0), 0);
            const taken    = students.filter((s) => s.transport === r.code).length;
            const free     = Math.max(0, totalCap - taken);
            return { route: r, totalCap, taken, free };
          });
          const anyFree = routeStats.some((rs) => rs.free > 0);
          return (
            <Field
              label="Transport route"
              hint={routes.length === 0
                ? "No routes set up yet — add routes from Transport screen"
                : anyFree ? "Only routes with free seats are selectable" : "All routes are full — capacity has to be increased on Transport"}
            >
              <select
                className="select"
                value={form.transport}
                onChange={(e) => { set("transport", e.target.value); set("pickupStop", ""); }}
              >
                <option value="—">No transport</option>
                {routeStats.map(({ route: r, totalCap, free }) => (
                  <option
                    key={r.code}
                    value={r.code}
                    disabled={totalCap > 0 && free === 0}
                  >
                    {r.code} · {r.name}
                    {totalCap > 0
                      ? ` · ${free === 0 ? "FULL" : `${free} seats free`} (of ${totalCap})`
                      : " · capacity not set"}
                  </option>
                ))}
              </select>
            </Field>
          );
        })()}

        {form.transport && form.transport !== "—" && (() => {
          const route = routes.find((r) => r.code === form.transport);
          const stops = route?.stops || [];
          if (stops.length === 0) return null;
          // Per-stop availability: how many students are already pinned to this exact stop.
          const stopStats = stops.map((s) => {
            const taken = students.filter((st) => st.transport === route.code && st.pickupStop === s.name).length;
            const cap   = Number(s.cap) || 0;
            const free  = cap > 0 ? Math.max(0, cap - taken) : null; // null = no cap configured
            return { stop: s, taken, cap, free };
          });
          return (
            <Field label="Pickup stop" hint="Stops marked FULL have already hit their per-stop capacity">
              <select
                className="select"
                value={form.pickupStop}
                onChange={(e) => set("pickupStop", e.target.value)}
              >
                <option value="">— pick a stop —</option>
                {stopStats.map(({ stop: s, cap, free }) => (
                  <option
                    key={s.name}
                    value={s.name}
                    disabled={free === 0}
                  >
                    {s.name} · {s.t}
                    {cap > 0
                      ? ` · ${free === 0 ? "FULL" : `${free} of ${cap} free`}`
                      : " · open"}
                  </option>
                ))}
              </select>
            </Field>
          );
        })()}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy || !formValid}>
            <Icon name="check" size={13} />{busy ? "Admitting…" : "Admit student"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ImportModal({ onClose, onFile }) {
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);
  const sampleCsv = "Name,Class,Parent,Transport\nIsha Sharma,3-A,+91 9876543210,R1\nKabir Khan,5-B,+91 9988776655,—\n";
  const downloadSample = () => {
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "students-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <ModalShell title="Import students" sub="Bulk-add via CSV · headers required (Name, Class, Parent, Transport)" onClose={onClose} width={520}>
      <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: "2px dashed var(--rule)", borderRadius: 12, padding: 26,
            textAlign: "center", cursor: "pointer", background: "var(--card-2)",
          }}
        >
          <Icon name="upload" size={22} />
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500 }}>
            {file ? file.name : "Click to select a CSV file"}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}>
            {file ? `${(file.size / 1024).toFixed(1)} KB` : ".csv up to a few hundred rows"}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
          Need a starting point? <a onClick={downloadSample} style={{ color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}>Download a sample template</a>.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn accent" disabled={!file} onClick={() => onFile(file)}>
            <Icon name="upload" size={13} />Import {file ? "" : "(pick a file)"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function ConfirmArchive({ student, onCancel, onConfirm }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);
  const submit = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };
  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
      display: "grid", placeItems: "center", zIndex: 250, padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 460 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Withdraw {student.name}?</div>
            <div className="card-sub">{student.id} · Class {student.cls}</div>
          </div>
          <button className="icon-btn" onClick={onCancel}><Icon name="x" size={14} /></button>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 13, lineHeight: 1.55 }}>
            They&apos;ll move to the <b>Archived</b> list and stop appearing in the active roster, Fees, and Academic.
          </div>
          <div style={{ background: "var(--card-2)", border: "1px solid var(--rule)", borderRadius: 9, padding: 12, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.6 }}>
            <div style={{ fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>Records that stay forever:</div>
            <div>• Paid fee receipts (Money ledger)</div>
            <div>• Daily logs (academic record)</div>
            <div>• Audit log entries</div>
            <div style={{ marginTop: 8, fontWeight: 500, color: "var(--ink)" }}>Cancelled:</div>
            <div>• Any uncollected pending fee for this term</div>
            <div style={{ marginTop: 8, color: "var(--ink-3)" }}>You can restore them any time from the Archived tab.</div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
            <button className="btn" style={{ background: "var(--bad)", borderColor: "var(--bad)", color: "#fff" }} onClick={submit} disabled={busy}>
              <Icon name="x" size={13} />{busy ? "Withdrawing…" : "Withdraw student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileModal({ student, onClose, onMessage, onTC }) {
  // Derive a stable 28-day attendance pattern from the student id
  const heatmap = useMemo(() => {
    const seedChar = student.id.charCodeAt(student.id.length - 1) || 7;
    return Array.from({ length: 28 }, (_, i) => {
      const v = ((seedChar * (i + 1) * 9301 + 49297) % 233280) / 233280;
      if (i % 7 === 6) return { v: -1 };
      if (v < 0.08) return { v: 0 };
      return { v: Math.min(4, Math.floor(v * 5)) };
    });
  }, [student.id]);

  // Activity history — synthesised from what we know about the student
  const feeTone = student.fee === "paid" ? "ok" : student.fee === "overdue" ? "bad" : "warn";
  const timeline = [
    { t: "Today", i: "fees", tone: feeTone, line: `Fee status · ${student.fee}`, sub: student.fee === "paid" ? "Last receipt auto-sent" : "Reminder scheduled" },
    { t: "Yesterday", i: "students", tone: "ok", line: "Attendance recorded", sub: `Present · ${student.attendance}% this term` },
    { t: "3 days ago", i: "book", tone: "info", line: "Homework submitted", sub: "English comprehension · on time" },
    { t: "1 week ago", i: "bus", tone: student.transport === "—" ? "" : "info", line: student.transport === "—" ? "No transport route" : `Boarded ${student.transport}`, sub: student.transport === "—" ? "Self pick-up/drop" : "Morning run · on time" },
    { t: "1 month ago", i: "enquiry", tone: "", line: `Joined ${student.joined}`, sub: "Admission confirmed · onboarding complete" },
  ];

  const phoneDigits = (student.parent || "").replace(/\D/g, "");

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
        display: "grid", placeItems: "center", zIndex: 250, padding: 16, overflowY: "auto",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 720, maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}>
        {/* Header strip with avatar */}
        <div style={{ padding: "22px 24px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--rule-2)" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            color: "var(--accent-ink)",
            display: "grid", placeItems: "center",
            fontWeight: 600, fontSize: 20,
          }}>
            {student.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", fontFamily: "var(--font-serif)" }}>{student.name}</span>
              {student.__added && (
                <span className="chip ok" style={{ fontSize: 10, height: 20 }}><span className="dot" />new admission</span>
              )}
            </div>
            <div style={{ color: "var(--ink-3)", fontSize: 12.5, marginTop: 4, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span className="mono">{student.id}</span>
              <span className="meta-dot">·</span>
              <span>Class {student.cls}</span>
              <span className="meta-dot">·</span>
              <span>Joined {student.joined}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} style={{ alignSelf: "flex-start" }}>
            <Icon name="x" size={14} />
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderBottom: "1px solid var(--rule-2)" }}>
          <Stat label="Attendance" value={`${student.attendance}%`} tone={student.attendance < 85 ? "warn" : "ok"} />
          <Stat label="Fee" value={student.fee.charAt(0).toUpperCase() + student.fee.slice(1)} tone={feeTone} />
          <Stat label="Transport" value={student.transport} />
          <Stat label="Section" value={student.cls.split("-")[1] || "—"} />
        </div>

        {/* Body — two columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          {/* Left: Parent contact + transport */}
          <div style={{ padding: "20px 22px", borderRight: "1px solid var(--rule-2)", display: "flex", flexDirection: "column", gap: 16 }}>
            <ProfileSection title="Parent contact">
              {student.parent && student.parent !== "—" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                    <Icon name="phone" size={14} style={{ color: "var(--ink-3)" }} />
                    <span className="mono">{student.parent}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    <button className="btn sm" onClick={() => window.open(`tel:${student.parent.replace(/\s/g, "")}`, "_self")}>
                      <Icon name="phone" size={11} />Call
                    </button>
                    <button className="btn sm accent" onClick={onMessage}>
                      <Icon name="whatsapp" size={11} />WhatsApp
                    </button>
                    <button className="btn sm" onClick={() => window.open(`sms:${student.parent.replace(/\s/g, "")}`, "_self")}>
                      <Icon name="sms" size={11} />SMS
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>No parent contact on file.</div>
              )}
            </ProfileSection>

            <ProfileSection title="Attendance · 28-day">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <div key={i} style={{ fontSize: 9.5, color: "var(--ink-4)", textAlign: "center" }}>{d}</div>
                ))}
                {heatmap.map((c, i) => {
                  const bg =
                    c.v === -1 ? "var(--rule-2)" :
                    c.v === 0 ? "var(--bad)" :
                    `color-mix(in oklch, var(--accent) ${40 + c.v * 15}%, var(--rule-2))`;
                  return <div key={i} className="hm-cell" style={{ background: bg, opacity: c.v === -1 ? 0.5 : 1 }} />;
                })}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 8 }}>
                {heatmap.filter((c) => c.v > 0).length} present · {heatmap.filter((c) => c.v === 0).length} absent · {heatmap.filter((c) => c.v === -1).length} off days
              </div>
            </ProfileSection>
          </div>

          {/* Right: Timeline */}
          <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
            <ProfileSection title="Recent activity">
              <div style={{ display: "flex", flexDirection: "column" }}>
                {timeline.map((row, i) => (
                  <div key={i} style={{
                    display: "grid",
                    gridTemplateColumns: "28px 1fr auto",
                    gap: 10,
                    padding: "9px 0",
                    borderBottom: i < timeline.length - 1 ? "1px solid var(--rule-2)" : "none",
                  }}>
                    <div className={`act-ico ${row.tone || ""}`} style={{ width: 26, height: 26 }}>
                      <Icon name={row.i} size={12} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5 }}>{row.line}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{row.sub}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{row.t}</div>
                  </div>
                ))}
              </div>
            </ProfileSection>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--rule-2)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onTC}><Icon name="book" size={12} />Issue TC</button>
          {phoneDigits && (
            <button className="btn" onClick={onMessage}><Icon name="whatsapp" size={12} />Message parent</button>
          )}
          <button className="btn accent" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const color = tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "bad" ? "var(--bad)" : "var(--ink)";
  return (
    <div style={{ padding: "14px 18px", borderRight: "1px solid var(--rule-2)" }}>
      <div style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, marginTop: 4, letterSpacing: "-0.02em", color }}>{value}</div>
    </div>
  );
}

function ProfileSection({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.09em", fontWeight: 500, marginBottom: 10 }}>
        {title}
      </div>
      {children}
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
