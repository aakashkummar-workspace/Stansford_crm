"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import { resolveSchool, downloadPdf } from "@/lib/export";
import { AvatarChip, KPI } from "../ui";

// Short blurbs shown in the Roles side-panel (admin view only). Listed
// roughly in seniority order so the sidebar reads top-down.
const ROLE_DESC = {
  "Super Admin":        "Full trust-wide access incl. finance, users, audit.",
  "Principal":          "Full access to their school · cannot edit trust settings.",
  "Academic Director":  "Academic modules only · no finance writes.",
  "Accountant":         "Finance modules · issue receipts · read-only students.",
  "Teacher":            "Own classes + students · homework · messaging.",
  "Transport lead":     "Routes, buses, drivers, stops, live boarding.",
  "Parent":             "Their child(ren) only · fees, academics, messages.",
  "Intern":             "Limited access under a mentor.",
};

// Pretty initials for the avatar pill — falls back to "?" if name is empty.
function initialsOf(name) {
  if (!name) return "?";
  return String(name).trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export default function ScreenUsers({ E, role, session, refresh }) {
  const school = resolveSchool(E?.SETTINGS);
  const actor  = session?.name || null;
  const isAdmin = role === "admin";
  const [showAddUser, setShowAddUser] = useState(false);
  const [createdUser, setCreatedUser] = useState(null); // { name, email, password, role } — credential receipt
  const [toast, setToast] = useState(null);
  const flashOk = (msg) => { setToast({ msg, tone: "ok" }); setTimeout(() => setToast(null), 3000); };

  // Custom roles defined on the Custom Roles screen — surfaced here so we
  // can offer them as assignable roles when creating a new user.
  const customRoles = E.CUSTOM_ROLES || [];
  // What the signed-in user is allowed to see:
  //   admin / principal / academic_director → everyone (Staff · Students · Parents)
  //   teacher                                → Students only (their classes)
  //   anyone else                            → nothing (sidebar already gates)
  const isManager = role === "admin" || role === "principal" || role === "academic_director";
  const isTeacher = role === "teacher";

  const allStaff    = E.STAFF || [];
  const allStudents = E.ADDED_STUDENTS || [];

  // Teachers only see students in classes they're linked to. Empty set = no
  // students until office assigns classes (we still render an empty state).
  const teacherClassSet = useMemo(() => {
    if (!isTeacher) return null;
    const arr = Array.isArray(session?.linkedClasses) && session.linkedClasses.length
      ? session.linkedClasses
      : (session?.linkedId ? [session.linkedId] : []);
    return new Set(arr);
  }, [isTeacher, session]);

  const visibleStudents = useMemo(() => {
    if (!teacherClassSet) return allStudents;
    if (teacherClassSet.size === 0) return [];
    return allStudents.filter((s) => teacherClassSet.has(s.cls));
  }, [allStudents, teacherClassSet]);

  // Parents are derived 1:1 from students (auto-provisioned at admission).
  // Show one row per student with the parent contact + login email.
  const parents = useMemo(() => {
    return allStudents.map((s) => ({
      id: `${s.id}-parent`,
      childId: s.id,
      childName: s.name,
      childCls: s.cls,
      // Phone column on the student record is the parent's number.
      phone: s.parent || "—",
      // The auto-provisioned login uses a derived email. We don't have it
      // explicitly on the student record but the `parent` field carries it
      // when it's an email; otherwise show "—".
      email: /@/.test(s.parent || "") ? s.parent : "—",
      name: `Parent of ${s.name}`,
    }));
  }, [allStudents]);

  // Tabs the current role is allowed to flip between.
  const TABS = isManager
    ? [
        { k: "staff",    label: "Staff",    count: allStaff.length },
        { k: "students", label: "Students", count: allStudents.length },
        { k: "parents",  label: "Parents",  count: parents.length },
      ]
    : [
        { k: "students", label: "Students", count: visibleStudents.length },
      ];
  const [tab, setTab] = useState(TABS[0].k);
  const [q, setQ]     = useState("");

  // Filter the current tab's rows by the search box. Each tab matches on a
  // different set of fields so e.g. a class string matches students but not
  // staff (where it's not relevant).
  const filteredStaff = useMemo(() => {
    const n = q.trim().toLowerCase(); if (!n) return allStaff;
    return allStaff.filter((s) => `${s.name} ${s.email || ""} ${s.role || ""} ${s.dept || ""} ${s.id || ""}`.toLowerCase().includes(n));
  }, [allStaff, q]);
  const filteredStudents = useMemo(() => {
    const list = isTeacher ? visibleStudents : allStudents;
    const n = q.trim().toLowerCase(); if (!n) return list;
    return list.filter((s) => `${s.name} ${s.id || ""} ${s.cls || ""} ${s.parent || ""}`.toLowerCase().includes(n));
  }, [allStudents, visibleStudents, isTeacher, q]);
  const filteredParents = useMemo(() => {
    const n = q.trim().toLowerCase(); if (!n) return parents;
    return parents.filter((p) => `${p.name} ${p.childName} ${p.childCls} ${p.phone} ${p.email}`.toLowerCase().includes(n));
  }, [parents, q]);

  // Counts per role for the admin's right-side Roles panel. Staff records
  // already have a `role` string; we add synthetic Student / Parent counts.
  const staffCounts = useMemo(() => {
    const m = {};
    for (const s of allStaff) m[s.role] = (m[s.role] || 0) + 1;
    m["Student"] = allStudents.length;
    m["Parent"]  = parents.length;
    return m;
  }, [allStaff, allStudents.length, parents.length]);

  // Branded PDF export — opens a print-styled report (logo, school header,
  // metadata grid, summary chips, aligned data table, footer) and triggers
  // the browser print dialog so the user can save as PDF or print directly.
  function exportPdf() {
    let title, subtitle, columns, rows, summary, name, orientation = "portrait";
    if (tab === "staff") {
      name = "users-staff";
      title = "Staff & Administrators";
      subtitle = `${filteredStaff.length} staff record${filteredStaff.length === 1 ? "" : "s"} across the school`;
      columns = [
        { key: "i",     label: "#",        align: "right", width: "32px" },
        { key: "id",    label: "ID",       width: "90px" },
        { key: "name",  label: "Name" },
        { key: "role",  label: "Role",     width: "110px" },
        { key: "dept",  label: "Department" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone",    align: "right" },
        { key: "joined",label: "Joined",   align: "right", width: "80px" },
      ];
      rows = filteredStaff.map((s, i) => ({
        i: i + 1, id: s.id, name: s.name, role: s.role || "—",
        dept: s.dept || "—", email: s.email || "—",
        phone: s.phone || "—", joined: s.joiningDate || "—",
      }));
      const roleCounts = rows.reduce((m, r) => { m[r.role] = (m[r.role] || 0) + 1; return m; }, {});
      summary = [
        { label: "Total staff", value: rows.length },
        { label: "Distinct roles", value: Object.keys(roleCounts).length },
        { label: "Departments", value: new Set(rows.map((r) => r.dept).filter((d) => d !== "—")).size },
      ];
      orientation = "landscape";
    } else if (tab === "students") {
      name = "users-students";
      title = "Students Roster";
      subtitle = `${filteredStudents.length} active enrolment${filteredStudents.length === 1 ? "" : "s"}`;
      columns = [
        { key: "i",         label: "#",          align: "right", width: "32px" },
        { key: "id",        label: "Admission" , width: "100px" },
        { key: "name",      label: "Student" },
        { key: "cls",       label: "Class",      align: "center", width: "70px" },
        { key: "parent",    label: "Parent contact" },
        { key: "transport", label: "Transport",  align: "center", width: "90px" },
        { key: "fee",       label: "Fee",        align: "right" },
        { key: "joined",    label: "Joined",     align: "right", width: "80px" },
      ];
      rows = filteredStudents.map((s, i) => ({
        i: i + 1, id: s.id, name: s.name, cls: s.cls,
        parent: s.parent || "—", transport: s.transport || "—",
        fee: s.fee || "—", joined: s.joined || "—",
      }));
      const classes = new Set(rows.map((r) => r.cls).filter(Boolean));
      summary = [
        { label: "Students", value: rows.length },
        { label: "Classes", value: classes.size },
        { label: "On transport", value: rows.filter((r) => r.transport && r.transport !== "—").length },
      ];
      orientation = "landscape";
    } else {
      name = "users-parents";
      title = "Parents Directory";
      subtitle = `${filteredParents.length} parent contact${filteredParents.length === 1 ? "" : "s"}`;
      columns = [
        { key: "i",         label: "#",          align: "right", width: "32px" },
        { key: "childId",   label: "Child ID",   width: "100px" },
        { key: "childName", label: "Child" },
        { key: "childCls",  label: "Class",      align: "center", width: "70px" },
        { key: "phone",     label: "Phone",      align: "right" },
        { key: "email",     label: "Email" },
      ];
      rows = filteredParents.map((p, i) => ({
        i: i + 1, childId: p.childId, childName: p.childName,
        childCls: p.childCls, phone: p.phone || "—", email: p.email || "—",
      }));
      summary = [
        { label: "Parent records", value: rows.length },
        { label: "With phone",     value: rows.filter((r) => r.phone !== "—").length },
        { label: "With email",     value: rows.filter((r) => r.email !== "—").length },
      ];
    }

    const opened = downloadPdf({
      title,
      subtitle,
      columns,
      rows,
      summary,
      school: school,
      actor,
      dateRange: "Current snapshot",
      orientation,
      filename: `${school.name.replace(/\s+/g, "-").toLowerCase()}-${name}-${new Date().toISOString().slice(0, 10)}`,
    });
    if (opened === false) {
      alert("Couldn't open the print window — please allow pop-ups for this site, then try again.");
    }
  }

  // Total accounts headline — what shows on the page sub.
  const totalPeople = isManager
    ? allStaff.length + allStudents.length + parents.length
    : visibleStudents.length;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">{isManager ? "Governance · Directory" : "My classroom · Directory"}</div>
          <div className="page-title">
            {isManager
              ? <>Users <span className="amber">& accounts</span></>
              : <>My <span className="amber">students</span></>}
          </div>
          <div className="page-sub">
            {isManager
              ? `${totalPeople} account${totalPeople === 1 ? "" : "s"} across staff, students and parents.`
              : `${totalPeople} student${totalPeople === 1 ? "" : "s"} in your assigned classes.`}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={exportPdf} title="Open a printable, branded PDF report">
            <Icon name="download" size={13} />Export PDF
          </button>
          {isAdmin && (
            <button className="btn accent" onClick={() => setShowAddUser(true)} title="Create a new login (canonical or custom role)">
              <Icon name="plus" size={13} />Add user
            </button>
          )}
        </div>
      </div>

      {isManager && (
        <div className="grid g-4" style={{ marginBottom: 14 }}>
          {(() => {
            const studentsByCls = {};
            for (const s of allStudents) studentsByCls[s.cls] = (studentsByCls[s.cls] || 0) + 1;
            return (
              <>
                <KPI
                  label="Staff" value={allStaff.length}
                  sub={`${Object.keys(staffCounts).length - 2 || 0} role types`}
                  puck="mint" puckIcon="staff"
                  details={{
                    title: `Staff · ${allStaff.length}`,
                    sub: "By role",
                    items: Object.entries(staffCounts)
                      .filter(([k]) => k !== "all" && k !== "total")
                      .sort((a, b) => b[1] - a[1])
                      .map(([role, n]) => ({ label: role, value: n, sub: `${n} member${n === 1 ? "" : "s"}` })),
                  }}
                />
                <KPI
                  label="Students" value={allStudents.length} sub="active enrolment"
                  puck="cream" puckIcon="students"
                  details={{
                    title: `Students · ${allStudents.length}`,
                    sub: "Per class-section",
                    items: Object.entries(studentsByCls)
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([cls, n]) => ({ label: `Class ${cls}`, value: n, sub: `${n} student${n === 1 ? "" : "s"}` })),
                  }}
                />
                <KPI
                  label="Parents" value={parents.length} sub="auto-provisioned"
                  puck="peach" puckIcon="users"
                  details={{
                    title: `Parents · ${parents.length}`,
                    sub: "Linked parent accounts",
                    items: parents.slice(0, 12).map((p) => ({
                      label: p.name || p.email,
                      value: p.linkedStudentName || p.linkedId || "—",
                      sub: p.email,
                    })),
                  }}
                />
                <KPI
                  label="Total accounts" value={totalPeople} sub="across the trust"
                  puck="sky" puckIcon="trending"
                  details={{
                    title: `Total accounts · ${totalPeople}`,
                    sub: "Breakdown across people",
                    items: [
                      { label: "Staff",    value: allStaff.length,    sub: `${Object.keys(staffCounts).length - 2 || 0} role types` },
                      { label: "Students", value: allStudents.length, sub: "active enrolment" },
                      { label: "Parents",  value: parents.length,     sub: "auto-provisioned" },
                    ],
                  }}
                />
              </>
            );
          })()}
        </div>
      )}

      {/* Tab strip — hidden when there's only one tab (teacher view). */}
      {TABS.length > 1 && (
        <div className="card" style={{ padding: "10px 14px", marginBottom: 14, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500, marginRight: 4 }}>View:</span>
          {TABS.map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{
                padding: "6px 14px", borderRadius: 999,
                background: tab === t.k ? "var(--accent)" : "var(--bg-2)",
                color: tab === t.k ? "#fff" : "var(--ink-2)",
                border: 0, cursor: "pointer", fontSize: 12.5, fontWeight: 500,
              }}
            >{t.label} · {t.count}</button>
          ))}
        </div>
      )}

      <div className={isManager ? "grid g-12" : ""}>
        <div className={`card ${isManager ? "col-8" : ""}`}>
          <div className="card-head">
            <div>
              <div className="card-title">
                {tab === "staff"    && "Staff & administrators"}
                {tab === "students" && (isTeacher ? "My students" : "Students")}
                {tab === "parents"  && "Parents"}
              </div>
              <div className="card-sub">
                {tab === "staff"    && `${filteredStaff.length} of ${allStaff.length} on file`}
                {tab === "students" && `${filteredStudents.length} of ${(isTeacher ? visibleStudents : allStudents).length} on roll`}
                {tab === "parents"  && `${filteredParents.length} of ${parents.length} parent accounts`}
              </div>
            </div>
            <div className="card-actions">
              <div className="input" style={{ display: "inline-flex", alignItems: "center", gap: 6, width: 220, padding: "0 10px" }}>
                <Icon name="search" size={13} style={{ color: "var(--ink-3)" }} />
                <input
                  style={{ border: 0, background: "transparent", outline: "none", fontSize: 12, flex: 1 }}
                  placeholder={tab === "staff" ? "Name, email, dept…" : tab === "students" ? "Name, ID, class…" : "Name, phone…"}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
          </div>

          {tab === "staff" && (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr><th>User</th><th>Role</th><th>Department</th><th>Contact</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 && (
                    <tr><td colSpan={5} className="empty">
                      {allStaff.length === 0 ? "No staff on file yet — add the first one from the Staff screen." : "No matches."}
                    </td></tr>
                  )}
                  {filteredStaff.map((u) => (
                    <tr key={u.id || u.email}>
                      <td>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <AvatarChip initials={u.avatar || initialsOf(u.name)} />
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{u.name}</div>
                            <div style={{ fontSize: 10.5, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="chip">{u.role || "—"}</span></td>
                      <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{u.dept || "—"}</td>
                      <td style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                        <div>{u.email || "—"}</div>
                        {u.phone && <div style={{ fontSize: 10.5, color: "var(--ink-4)" }}>{u.phone}</div>}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{u.joiningDate || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "students" && (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr><th>Student</th><th>Class</th><th>Parent contact</th><th>Fee</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 && (
                    <tr><td colSpan={5} className="empty">
                      {(isTeacher ? visibleStudents : allStudents).length === 0
                        ? (isTeacher ? "No students assigned to your classes yet." : "No students on the roster yet.")
                        : "No matches."}
                    </td></tr>
                  )}
                  {filteredStudents.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <AvatarChip initials={initialsOf(s.name)} />
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{s.name}</div>
                            <div style={{ fontSize: 10.5, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{s.id}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="chip">{s.cls || "—"}</span></td>
                      <td style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{s.parent || "—"}</td>
                      <td>
                        {s.fee === "paid"    ? <span className="chip ok"><span className="dot" />Paid</span> :
                         s.fee === "partial" ? <span className="chip warn"><span className="dot" />Partial</span> :
                         s.fee === "pending" ? <span className="chip warn"><span className="dot" />Pending</span> :
                                               <span style={{ fontSize: 11, color: "var(--ink-4)" }}>—</span>}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--ink-3)" }}>{s.joined || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "parents" && (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr><th>Parent of</th><th>Child class</th><th>Phone</th><th>Login email</th></tr>
                </thead>
                <tbody>
                  {filteredParents.length === 0 && (
                    <tr><td colSpan={4} className="empty">
                      {parents.length === 0 ? "Parents are auto-provisioned on student admission." : "No matches."}
                    </td></tr>
                  )}
                  {filteredParents.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <AvatarChip initials={initialsOf(p.childName)} />
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.childName}</div>
                            <div style={{ fontSize: 10.5, color: "var(--ink-4)", fontFamily: "var(--font-mono)" }}>{p.childId}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="chip">{p.childCls}</span></td>
                      <td style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{p.phone}</td>
                      <td style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{p.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Roles side-panel — admin/principal/director only. Hidden for the
            teacher view since it'd be irrelevant noise. */}
        {isManager && (
          <div className="card col-4">
            <div className="card-head">
              <div><div className="card-title">Roles</div><div className="card-sub">Counts by role across the trust</div></div>
            </div>
            <div>
              {Object.entries(ROLE_DESC).concat([
                ["Student", "Enrolled child · uses parent's account."],
                ["Parent",  "Their child(ren) only · fees, academics, messages."],
              ]).map(([r, desc]) => (
                <div className="lrow" key={r}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {r} <span style={{ color: "var(--ink-4)", fontWeight: 400, marginLeft: 4 }}>· {staffCounts[r] || 0}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddUser && (
        <AddUserModal
          customRoles={customRoles}
          onClose={() => setShowAddUser(false)}
          onCreated={async (created, plainPassword) => {
            setShowAddUser(false);
            setCreatedUser({ ...created, password: plainPassword });
            await refresh?.();
          }}
        />
      )}
      {createdUser && (
        <CredentialsReceipt
          user={createdUser}
          onClose={() => { setCreatedUser(null); flashOk(`User ${createdUser.name} created`); }}
        />
      )}
      {toast && (
        <div role="status" style={{
          position: "fixed", bottom: 18, right: 18, zIndex: 9000,
          background: toast.tone === "err" ? "var(--bad, #b13c1c)" : "var(--ok)",
          color: "#fff", padding: "9px 14px", borderRadius: 8,
          fontSize: 12, fontWeight: 700,
        }}>{toast.msg}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AddUserModal — admin-only form to mint a fresh login. Role dropdown lists
// the 7 canonical roles plus every row from custom_roles, so any role you
// build on the Custom Roles screen is immediately assignable here.
// ---------------------------------------------------------------------------
const CANONICAL_ROLE_OPTIONS = [
  { k: "admin",             label: "Admin" },
  { k: "principal",         label: "Principal" },
  { k: "academic_director", label: "Academic Director" },
  { k: "teacher",           label: "Teacher" },
  { k: "school_accountant", label: "School Accountant" },
  { k: "trust_accountant",  label: "Trust Accountant" },
  { k: "parent",            label: "Parent" },
];

function AddUserModal({ customRoles = [], onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "teacher",
    linkedId: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Suggest a 10-char password — admin can copy or replace it.
  function suggestPassword() {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
    set("password", out);
    setShowPassword(true);
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
          linkedId: form.linkedId.trim() || null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || "Failed to create user");
      await onCreated(j.user, form.password);
    } catch (ex) {
      setErr(ex.message);
      setBusy(false);
    }
  }

  // Show context-specific helper text for the linkedId field — students
  // (parent role), classes (teacher role), or hidden for everyone else.
  const linkedHelp = (() => {
    if (form.role === "teacher") return "Comma-separated class codes (e.g. 2-A, 5-B). Optional.";
    if (form.role === "parent")  return "Student admission ID (e.g. STN-9897). Optional — auto-links on first sign-in.";
    return null;
  })();

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
      display: "grid", placeItems: "center", zIndex: 250, padding: 16, overflowY: "auto",
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 480, maxHeight: "calc(100vh - 32px)", overflowY: "auto" }}>
        <div className="card-head">
          <div>
            <div className="card-title">Add user</div>
            <div className="card-sub">Create a new login. Both built-in and custom roles are assignable.</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <form onSubmit={submit} className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Full name *">
            <input className="input" autoFocus required value={form.name}
              onChange={(e) => set("name", e.target.value)} placeholder="e.g. Priya Sharma" maxLength={120} />
          </Field>
          <Field label="Email *">
            <input className="input" required type="email" value={form.email}
              onChange={(e) => set("email", e.target.value)} placeholder="priya@school.com" maxLength={120} />
          </Field>
          <Field label="Password *" hint="Minimum 6 characters. Share with the user securely.">
            <div style={{ display: "flex", gap: 6 }}>
              <input
                className="input"
                required
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="••••••••"
                style={{ flex: 1 }}
                minLength={6}
              />
              <button type="button" className="btn sm ghost" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? "Hide" : "Show"}
              </button>
              <button type="button" className="btn sm" onClick={suggestPassword} title="Generate a random 10-char password">
                Suggest
              </button>
            </div>
          </Field>
          <Field label="Role *" hint={customRoles.length ? `${customRoles.length} custom role${customRoles.length === 1 ? "" : "s"} also available below` : "Define more roles on the Custom Roles screen."}>
            <select className="select" value={form.role} onChange={(e) => set("role", e.target.value)}>
              <optgroup label="Built-in roles">
                {CANONICAL_ROLE_OPTIONS.map((r) => (
                  <option key={r.k} value={r.k}>{r.label}</option>
                ))}
              </optgroup>
              {customRoles.length > 0 && (
                <optgroup label="Custom roles">
                  {customRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.roleName}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </Field>
          {linkedHelp && (
            <Field label="Linked ID" hint={linkedHelp}>
              <input className="input" value={form.linkedId} onChange={(e) => set("linkedId", e.target.value)}
                placeholder={form.role === "teacher" ? "2-A, 5-B" : "STN-9897"} />
            </Field>
          )}
          {err && (
            <div style={{ background: "var(--err-soft, #fbe1d8)", color: "var(--err, #b13c1c)", padding: "9px 12px", borderRadius: 7, fontSize: 12 }}>
              {err}
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn accent" disabled={busy || !form.name.trim() || !form.email.trim() || form.password.length < 6}>
              {busy ? "Creating…" : <><Icon name="check" size={13} />Create user</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// One-time receipt shown right after creation so the admin can copy the
// credentials and hand them to the new user. The plain password is held in
// state only — never re-fetched from the server.
function CredentialsReceipt({ user, onClose }) {
  const copy = (txt) => {
    try { navigator.clipboard?.writeText(txt); } catch {}
  };
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(20,16,10,0.45)",
      display: "grid", placeItems: "center", zIndex: 250, padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 460 }}>
        <div className="card-head">
          <div>
            <div className="card-title" style={{ color: "var(--ok)" }}>
              <Icon name="check" size={14} /> Account created
            </div>
            <div className="card-sub">Save these credentials — the password won't be shown again.</div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <CredRow label="Name"     value={user.name} />
          <CredRow label="Email"    value={user.email}    onCopy={() => copy(user.email)} />
          <CredRow label="Password" value={user.password} onCopy={() => copy(user.password)} mono />
          <CredRow label="Role"     value={user.role} />
          {user.linkedId && <CredRow label="Linked ID" value={user.linkedId} />}
          <button className="btn accent" style={{ marginTop: 6 }} onClick={() => copy(`Email: ${user.email}\nPassword: ${user.password}\nRole: ${user.role}`)}>
            <Icon name="download" size={12} />Copy all
          </button>
        </div>
      </div>
    </div>
  );
}

function CredRow({ label, value, onCopy, mono }) {
  return (
    <div style={{ background: "var(--bg-2)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ minWidth: 90, fontSize: 10.5, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 12.5, fontWeight: 500, fontFamily: mono ? "var(--font-mono)" : undefined, wordBreak: "break-all" }}>{value || "—"}</div>
      {onCopy && (
        <button type="button" className="btn sm ghost" onClick={onCopy} title={`Copy ${label.toLowerCase()}`}>Copy</button>
      )}
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
