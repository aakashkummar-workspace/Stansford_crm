"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { KPI, AvatarChip, StatusChip } from "../ui";

const STUDENT_NAMES = [
  ["Aanya", "Sharma"], ["Advait", "Patel"], ["Arjun", "Khan"], ["Ishaan", "Gupta"],
  ["Kiara", "Reddy"], ["Vivaan", "Iyer"], ["Saanvi", "Desai"], ["Aarav", "Nair"],
  ["Myra", "Joshi"], ["Vihaan", "Malhotra"], ["Diya", "Singh"], ["Krish", "Verma"],
  ["Anaya", "Mehta"], ["Reyansh", "Chauhan"], ["Aadhya", "Rao"], ["Shaurya", "Kapoor"],
  ["Zara", "Pillai"], ["Kabir", "Bose"], ["Navya", "Menon"], ["Atharv", "Trivedi"],
  ["Pari", "Shetty"], ["Dhruv", "Agarwal"], ["Riya", "Banerjee"], ["Yash", "Choudhary"],
];

// Deterministic baseline roster (unchanging across reloads)
function baselineRoster() {
  return STUDENT_NAMES.flatMap((n, i) => {
    const cls = (i % 8) + 1;
    const sec = i % 2 === 0 ? "A" : "B";
    const rr = (k) => ((i * k * 9301 + 49297) % 233280) / 233280;
    return [{
      id: `STN-${2000 + i}`,
      name: `${n[0]} ${n[1]}`,
      cls: `${cls}-${sec}`,
      parent: `+91 98${Math.floor(rr(3) * 90000 + 10000)} ${Math.floor(rr(5) * 9000 + 1000)}`,
      fee: rr(7) > 0.22 ? "paid" : rr(7) > 0.1 ? "pending" : "overdue",
      attendance: Math.round(80 + rr(9) * 18),
      transport: rr(11) > 0.4 ? ["R1", "R2", "R3"][i % 3] : "—",
      joined: `Apr ${2020 + (i % 5)}`,
      __seed: true,
    }];
  });
}

export default function ScreenStudents({ E, refresh }) {
  // ---------- state ----------
  const [classFilter, setClassFilter] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAdmission, setShowAdmission] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [picked, setPicked] = useState(new Set());
  const [openMenuFor, setOpenMenuFor] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const flash = (msg, tone = "ok") => {
    setToast({ msg, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  // ---------- data ----------
  const baseline = useMemo(baselineRoster, []);
  const added = (E.ADDED_STUDENTS || []).map((s) => ({ ...s, __added: true }));
  const roster = [...added, ...baseline];

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

  const handleImportFile = (file) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const csv = ev.target?.result;
      if (typeof csv !== "string") { flash("Could not read file", "bad"); return; }
      const r = await fetch("/api/students/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const json = await r.json();
      if (json.ok) {
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
    const r = await fetch("/api/students", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await r.json();
    if (json.ok) {
      flash(`Admitted ${json.student.name} · ${json.student.id}`);
      await refresh?.();
      setShowAdmission(false);
    } else {
      flash(json.error || "Admission failed", "bad");
    }
  };

  const removeStudent = async (s) => {
    if (!s.__added) {
      flash("Built-in roster rows cannot be removed (only admissions added in this session)", "bad");
      return;
    }
    const r = await fetch("/api/students", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: s.id }),
    });
    const json = await r.json();
    if (json.ok) { flash(`Removed ${s.name}`); await refresh?.(); }
    else flash(json.error || "Remove failed", "bad");
    setOpenMenuFor(null);
  };

  // ---------- render ----------
  return (
    <div className="page">
      <Toast toast={toast} />

      <div className="page-head">
        <div>
          <div className="page-eyebrow">People · Roster</div>
          <div className="page-title">Students <span className="amber">at school</span></div>
          <div className="page-sub">{roster.length} children listed · classes 1–8 · academic year 2025–26</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => setShowImport(true)}><Icon name="upload" size={13} />Import</button>
          <button className="btn" onClick={exportCsv}><Icon name="download" size={13} />Export</button>
          <button className="btn accent" onClick={() => setShowAdmission(true)}><Icon name="plus" size={13} />New admission</button>
        </div>
      </div>

      <div className="grid g-4" style={{ marginBottom: 14 }}>
        <KPI label="Enrolled" value={roster.length} delta={`+${added.length || 12} this term`} deltaDir="up" sub="across 8 classes" puck="mint" puckIcon="students" />
        <KPI label="New admissions · YTD" value={63 + added.length} delta="+18%" deltaDir="up" sub="vs last year" puck="peach" puckIcon="enquiry" />
        <KPI label="Average attendance" value="91%" delta="+2%" deltaDir="up" sub="last 30 days" puck="cream" puckIcon="check" />
        <KPI label="Transfer certificates" value="4" delta="2 pending" deltaDir="down" sub="processed this month" puck="rose" puckIcon="reports" />
      </div>

      <div className="card">
        <div className="card-head">
          <div><div className="card-title">All students</div><div className="card-sub">Auto-assigned IDs · auto fee schedule</div></div>
          <div className="card-actions">
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
                  <td style={{ position: "relative" }}>
                    <button className="icon-btn" onClick={() => setOpenMenuFor(openMenuFor === s.id ? null : s.id)}>
                      <Icon name="more" size={14} />
                    </button>
                    {openMenuFor === s.id && (
                      <RowMenu
                        student={s}
                        onClose={() => setOpenMenuFor(null)}
                        onView={() => { flash(`Profile of ${s.name} (read-only demo)`); setOpenMenuFor(null); }}
                        onTC={() => { flash(`TC requested for ${s.name} · queued`); setOpenMenuFor(null); }}
                        onMessage={() => { window.open(`https://wa.me/${s.parent.replace(/[^0-9]/g, "")}`, "_blank"); flash("Opened WhatsApp"); setOpenMenuFor(null); }}
                        onRemove={() => removeStudent(s)}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdmission && <AdmissionModal onClose={() => setShowAdmission(false)} onSubmit={submitAdmission} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onFile={handleImportFile} />}
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

function RowMenu({ student, onClose, onView, onTC, onMessage, onRemove }) {
  useEffect(() => {
    const onDoc = (e) => { if (!e.target.closest(".row-menu") && !e.target.closest(".icon-btn")) onClose(); };
    setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => document.removeEventListener("click", onDoc);
  }, [onClose]);
  const items = [
    { label: "View profile", icon: "user", action: onView },
    { label: "Message parent", icon: "whatsapp", action: onMessage },
    { label: "Issue TC", icon: "book", action: onTC },
    { label: student.__added ? "Remove" : "Remove (locked)", icon: "x", action: onRemove, danger: true, disabled: !student.__added },
  ];
  return (
    <div className="row-menu" style={{
      position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 70,
      background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 9,
      boxShadow: "var(--shadow-lg)", padding: 4, minWidth: 180,
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

function AdmissionModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({ name: "", cls: "1", section: "A", parent: "", transport: "—" });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    await onSubmit(form);
    setBusy(false);
  };
  return (
    <ModalShell title="New admission" sub="Auto-assigned ID · auto fee schedule" onClose={onClose}>
      <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Student full name *">
          <input className="input" autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Anaika Sharma" />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Class">
            <select className="select" value={form.cls} onChange={(e) => set("cls", e.target.value)}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Class {n}</option>)}
            </select>
          </Field>
          <Field label="Section">
            <select className="select" value={form.section} onChange={(e) => set("section", e.target.value)}>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
            </select>
          </Field>
        </div>
        <Field label="Parent contact">
          <input className="input" value={form.parent} onChange={(e) => set("parent", e.target.value)} placeholder="+91 9XXXX XXXXX" />
        </Field>
        <Field label="Transport route">
          <select className="select" value={form.transport} onChange={(e) => set("transport", e.target.value)}>
            <option value="—">No transport</option>
            <option value="R1">R1 · Whitefield – Marathahalli</option>
            <option value="R2">R2 · HSR – Bellandur</option>
            <option value="R3">R3 · Indiranagar – Koramangala</option>
          </select>
        </Field>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn accent" disabled={busy || !form.name.trim()}>
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

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  );
}
