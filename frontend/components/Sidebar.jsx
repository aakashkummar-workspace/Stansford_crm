"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import { AvatarChip } from "./ui";

// Nav items per role. Five real roles now (admin replaces the old "super"
// demo; academic_director is brand new).
export const NAV_BY_ROLE = {
  admin: [
    { section: "Trust" },
    { id: "trust",     label: "Overview",     icon: "dashboard" },
    { id: "money",     label: "Finance",      icon: "money" },
    { id: "donors",    label: "Trust & Donors", icon: "donors" },
    { section: "School" },
    { id: "dashboard",  label: "Dashboard",    icon: "dashboard" },
    { id: "students",   label: "Students",     icon: "students" },
    { id: "classes",    label: "Classes",      icon: "book" },
    { id: "timetable",  label: "Timetable",    icon: "clock" },
    { id: "attendance", label: "Attendance",   icon: "check" },
    { id: "academic",   label: "Academic",     icon: "academic" },
    { id: "exams",      label: "Exams & Marks", icon: "reports" },
    { id: "fees",      label: "Fees & UPI",   icon: "fees" },
    { id: "tc",        label: "Transfer certificates", icon: "reports" },
    { id: "staff",     label: "Staff",        icon: "staff" },
    { id: "transport", label: "Transport",    icon: "bus" },
    { id: "inventory", label: "Inventory",    icon: "inventory" },
    { id: "library",   label: "Library",      icon: "book" },
    { id: "complaints",label: "Complaints",   icon: "complaint" },
    { id: "enquiries", label: "Admissions",   icon: "enquiry" },
    { id: "meetings",  label: "Meetings",     icon: "clock" },
    { id: "volunteers",label: "Volunteers",   icon: "users" },
    { id: "reports",   label: "Reports",      icon: "reports" },
    { section: "People & workflow" },
    { id: "scale",                 label: "SCALE session",         icon: "academic" },
    { id: "scale_report",          label: "SCALE reports",         icon: "reports" },
    { id: "scale_admin",           label: "SCALE admin",           icon: "shield" },
    { id: "scale_advisory",        label: "Parent advisory",       icon: "send" },
    { id: "messages",              label: "Parent messages",       icon: "send" },
    { id: "leave",                 label: "Leave requests",        icon: "calendar" },
    { id: "remarks_rewards",       label: "Remarks & rewards",     icon: "shield" },
    { id: "student_activities",    label: "Student activities",    icon: "academic" },
    { section: "Governance" },
    { id: "access",                label: "Access control",        icon: "shield" },
    { id: "custom_roles",          label: "Custom roles",          icon: "users" },
    { id: "tasks",                 label: "Tasks",                 icon: "check" },
    { id: "users",                 label: "Users & Roles",         icon: "users" },
    { id: "government_documents",  label: "Government documents",  icon: "reports" },
    { id: "audit",                 label: "Audit log",             icon: "audit" },
    { id: "settings",              label: "Settings",              icon: "settings" },
    { id: "account",               label: "My account",            icon: "user" },
  ],
  academic_director: [
    { section: "Academics" },
    { id: "dashboard",  label: "Overview",     icon: "dashboard" },
    { id: "attendance", label: "Attendance",   icon: "check" },
    { id: "academic",   label: "Daily logs",   icon: "academic" },
    { id: "exams",      label: "Exams & Marks", icon: "reports" },
    { id: "students",   label: "Students",     icon: "students" },
    { id: "classes",    label: "Classes",      icon: "book" },
    { id: "timetable",  label: "Timetable",    icon: "clock" },
    { section: "People" },
    { id: "complaints",label: "Complaints",   icon: "complaint" },
    { id: "communication", label: "Messages", icon: "megaphone" },
    { id: "scale",                label: "SCALE session",         icon: "academic" },
    { id: "scale_report",         label: "SCALE reports",         icon: "reports" },
    { id: "scale_admin",          label: "SCALE admin",           icon: "shield" },
    { id: "scale_advisory",       label: "Parent advisory",       icon: "send" },
    { id: "leave",                label: "Leave requests",        icon: "calendar" },
    { id: "remarks_rewards",      label: "Remarks & rewards",     icon: "shield" },
    { id: "student_activities",   label: "Student activities",    icon: "academic" },
    { id: "tasks",     label: "My tasks",     icon: "check" },
    { section: "Account" },
    { id: "account",   label: "My account",   icon: "user" },
  ],
  principal: [
    { section: "Overview" },
    { id: "dashboard", label: "Dashboard",    icon: "dashboard" },
    { id: "money",     label: "Money",        icon: "money" },
    { id: "fees",      label: "Fees & Transaction", icon: "fees" },
    { section: "People" },
    { id: "students",   label: "Students",     icon: "students" },
    { id: "classes",    label: "Classes",      icon: "book" },
    { id: "timetable",  label: "Timetable",    icon: "clock" },
    { id: "attendance", label: "Attendance",   icon: "check" },
    { id: "academic",   label: "Academic",     icon: "academic" },
    { id: "exams",      label: "Exams & Marks", icon: "reports" },
    { id: "staff",      label: "Staff",        icon: "staff" },
    { section: "Operations" },
    { id: "transport", label: "Transport",    icon: "bus" },
    { id: "inventory", label: "Inventory",    icon: "inventory" },
    { id: "library",   label: "Library",      icon: "book" },
    { id: "communication", label: "Communication", icon: "megaphone" },
    { section: "CRM" },
    { id: "enquiries", label: "Admissions",   icon: "enquiry" },
    { id: "complaints",label: "Complaints",   icon: "complaint" },
    { id: "donors",    label: "Donors",       icon: "donors" },
    { id: "volunteers",label: "Volunteers",   icon: "users" },
    { section: "Records" },
    { id: "tc",        label: "Transfer certs", icon: "reports" },
    { id: "meetings",  label: "Meetings",     icon: "clock" },
    { id: "reports",   label: "Reports",      icon: "reports" },
    { section: "Workflow" },
    { id: "scale",                label: "SCALE session",         icon: "academic" },
    { id: "scale_report",         label: "SCALE reports",         icon: "reports" },
    { id: "scale_admin",          label: "SCALE admin",           icon: "shield" },
    { id: "scale_advisory",       label: "Parent advisory",       icon: "send" },
    { id: "messages",             label: "Parent messages",       icon: "send" },
    { id: "leave",                label: "Leave requests",        icon: "calendar" },
    { id: "remarks_rewards",      label: "Remarks & rewards",     icon: "shield" },
    { id: "student_activities",   label: "Student activities",    icon: "academic" },
    { id: "government_documents", label: "Government documents",  icon: "reports" },
    { section: "System" },
    { id: "tasks",     label: "My tasks",     icon: "check" },
    { id: "account",   label: "My account",   icon: "user" },
  ],
  teacher: [
    { section: "My classroom" },
    { id: "dashboard",     label: "Today",          icon: "dashboard" },
    { id: "my_attendance", label: "My attendance",  icon: "check" },
    { id: "attendance",    label: "Class attendance", icon: "check" },
    { id: "timetable",     label: "Timetable",      icon: "clock" },
    { id: "academic",      label: "Class tracker",  icon: "academic" },
    { id: "exams",      label: "Exams & Marks", icon: "reports" },
    { id: "students",   label: "My students",  icon: "students" },
    { id: "communication", label: "Broadcasts", icon: "megaphone" },
    { id: "meetings",   label: "Meetings",     icon: "clock" },
    { id: "library",    label: "Library",      icon: "book" },
    { section: "Workflow" },
    { id: "scale",                label: "SCALE session",         icon: "academic" },
    { id: "scale_report",         label: "SCALE report",          icon: "reports" },
    { id: "scale_advisory",       label: "Parent advisory",       icon: "send" },
    { id: "leave",                label: "Leave",                 icon: "calendar" },
    { id: "remarks_rewards",      label: "Remarks & rewards",     icon: "shield" },
    { id: "student_activities",   label: "Student activities",    icon: "academic" },
    { section: "Admin" },
    { id: "users",      label: "Directory",    icon: "users" },
    { id: "complaints", label: "Complaints",   icon: "complaint" },
    { id: "tasks",      label: "My tasks",     icon: "check" },
    { id: "account",    label: "My account",   icon: "user" },
  ],
  parent: [
    { section: "My family" },
    { id: "dashboard",    label: "Home",         icon: "home" },
    { id: "academic",     label: "Academics",    icon: "academic" },
    { id: "scale_report", label: "SCALE report", icon: "reports" },
    { id: "scale_ritual", label: "Daily ritual", icon: "check" },
    { id: "timetable",    label: "Timetable",    icon: "clock" },
    { id: "fees",         label: "Fees",         icon: "fees" },
    { id: "transport",    label: "Transport",    icon: "bus" },
    { id: "communication", label: "Broadcasts",   icon: "megaphone" },
    { id: "messages",     label: "Message admin", icon: "send" },
    { id: "meetings",     label: "Meetings",     icon: "clock" },
    { id: "library",      label: "Library",      icon: "book" },
    { section: "Workflow" },
    { id: "leave",                label: "Leave requests",        icon: "calendar" },
    { id: "remarks_rewards",      label: "Recognition",           icon: "shield" },
    { id: "student_activities",   label: "Achievements",          icon: "academic" },
    { section: "Account" },
    { id: "account",   label: "My account",   icon: "user" },
  ],
  // School Accountant — school finance only. No trust ledger, no
  // donations, no academic / staff modules.
  school_accountant: [
    { section: "School finance" },
    { id: "dashboard",  label: "Overview",      icon: "dashboard" },
    { id: "fees",       label: "Fees & UPI",    icon: "fees" },
    { id: "money",      label: "School expenses", icon: "money" },
    { id: "reports",    label: "Reports",       icon: "reports" },
    { section: "Records" },
    { id: "students",   label: "Students",      icon: "students" },
    { id: "audit",      label: "Audit log",     icon: "audit" },
    { section: "Account" },
    { id: "account",    label: "My account",    icon: "user" },
  ],
  // Trust Accountant — trust finance only. Donations, trust expenses,
  // donor-form approvals.
  trust_accountant: [
    { section: "Trust finance" },
    { id: "trust",      label: "Overview",      icon: "dashboard" },
    { id: "money",      label: "Trust expenses", icon: "money" },
    { id: "donors",     label: "Donors",        icon: "donors" },
    { id: "reports",    label: "Reports",       icon: "reports" },
    { section: "Records" },
    { id: "audit",      label: "Audit log",     icon: "audit" },
    { section: "Account" },
    { id: "account",    label: "My account",    icon: "user" },
  ],
};

const ROLE_LABEL = {
  admin: "Admin",
  academic_director: "Academic Director",
  principal: "Principal",
  teacher: "Teacher",
  parent: "Parent",
  school_accountant: "School Accountant",
  trust_accountant: "Trust Accountant",
};

function initialsOf(name) {
  if (!name) return "—";
  const parts = String(name).trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name[0].toUpperCase();
}

// Master catalog of every screen the app ships with — used to build a
// synthetic nav for custom-role users (whose role doesn't appear in
// NAV_BY_ROLE). The "section" buckets group features in a way that reads
// naturally on the sidebar.
const FEATURE_NAV_CATALOG = [
  { section: "Trust" },
  { id: "trust",                 label: "Overview",            icon: "dashboard" },
  { id: "money",                 label: "Finance",             icon: "money" },
  { id: "donors",                label: "Trust & Donors",      icon: "donors" },
  { section: "School" },
  { id: "dashboard",             label: "Dashboard",           icon: "dashboard" },
  { id: "students",              label: "Students",            icon: "students" },
  { id: "classes",               label: "Classes",             icon: "book" },
  { id: "timetable",             label: "Timetable",           icon: "clock" },
  { id: "attendance",            label: "Attendance",          icon: "check" },
  { id: "academic",              label: "Academic",            icon: "academic" },
  { id: "exams",                 label: "Exams & Marks",       icon: "reports" },
  { id: "fees",                  label: "Fees & UPI",          icon: "fees" },
  { id: "tc",                    label: "Transfer certificates", icon: "reports" },
  { id: "staff",                 label: "Staff",               icon: "staff" },
  { section: "Operations" },
  { id: "transport",             label: "Transport",           icon: "bus" },
  { id: "inventory",             label: "Inventory",           icon: "inventory" },
  { id: "library",               label: "Library",             icon: "book" },
  { id: "complaints",            label: "Complaints",          icon: "complaint" },
  { id: "enquiries",             label: "Admissions",          icon: "enquiry" },
  { id: "meetings",              label: "Meetings",            icon: "clock" },
  { id: "volunteers",            label: "Volunteers",          icon: "users" },
  { id: "reports",               label: "Reports",             icon: "reports" },
  { id: "communication",         label: "Communication",       icon: "megaphone" },
  { id: "messages",              label: "Parent messages",     icon: "send" },
  { section: "Workflow" },
  { id: "leave",                 label: "Leave requests",      icon: "calendar" },
  { id: "remarks_rewards",       label: "Remarks & rewards",   icon: "shield" },
  { id: "student_activities",    label: "Student activities",  icon: "academic" },
  { section: "Governance" },
  { id: "access",                label: "Access control",      icon: "shield" },
  { id: "tasks",                 label: "Tasks",               icon: "check" },
  { id: "users",                 label: "Users & Roles",       icon: "users" },
  { id: "custom_roles",          label: "Custom roles",        icon: "users" },
  { id: "government_documents",  label: "Government documents",icon: "reports" },
  { id: "audit",                 label: "Audit log",           icon: "audit" },
  { id: "settings",              label: "Settings",            icon: "settings" },
  { section: "Account" },
  { id: "account",               label: "My account",          icon: "user" },
];

// True if the role isn't one of the seven canonical ones — i.e. it's a
// custom role created on the Custom Roles screen. Custom role ids are
// generated as "role-<slug>-<token>".
function isCustomRoleKey(role) {
  return typeof role === "string" && (role.startsWith("role-") || !NAV_BY_ROLE[role]);
}

export default function Sidebar({ current, setCurrent, role, user, permissions }) {
  // For canonical roles use the hard-coded NAV_BY_ROLE list. For custom
  // roles, fall back to the catalog above and let the permissions-based
  // filter below decide what survives — if the admin hasn't granted any
  // feature yet, only "My account" will show (that's enforced server-side
  // in /api/permissions for safety).
  const allItems = NAV_BY_ROLE[role] || (isCustomRoleKey(role) ? FEATURE_NAV_CATALOG : NAV_BY_ROLE.admin);
  // Apply admin-controlled feature toggles. A missing entry == allowed (so new
  // screens default to visible). Section headers are kept iff at least one item
  // following them survives.
  const rolePerms = (permissions && permissions[role]) || null;
  const items = (() => {
    if (!rolePerms) return allItems;
    const kept = [];
    let pendingSection = null;
    for (const it of allItems) {
      if (it.section) { pendingSection = it; continue; }
      if (rolePerms[it.id] === false) continue;
      if (pendingSection) { kept.push(pendingSection); pendingSection = null; }
      kept.push(it);
    }
    return kept;
  })();

  // Group the flat items[] into [{ name, items: [...] }] blocks so each
  // category becomes a collapsible dropdown. Items that come before any
  // section header (rare, but possible) bucket under the synthetic "" group.
  const groups = useMemo(() => {
    const out = [];
    let cur = { name: "", items: [] };
    for (const it of items) {
      if (it.section) {
        if (cur.items.length || cur.name) out.push(cur);
        cur = { name: it.section, items: [] };
      } else {
        cur.items.push(it);
      }
    }
    if (cur.items.length || cur.name) out.push(cur);
    return out;
  }, [items]);

  // Per-role collapsed state, persisted to localStorage so a closed group
  // stays closed across reloads. Default: every group expanded.
  const storageKey = `vidyalaya360.sidebar.collapsed.${role}`;
  const [collapsed, setCollapsed] = useState(() => new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setCollapsed(new Set(JSON.parse(raw) || []));
      else setCollapsed(new Set());
    } catch { setCollapsed(new Set()); }
  }, [storageKey]);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify([...collapsed])); } catch {}
  }, [collapsed, storageKey]);

  // Auto-expand the group that contains the active item — fires only on
  // navigation (`current` change), not on every re-render. If we also
  // reacted to `groups` changing, manual collapses would immediately get
  // undone because `groups` is a fresh array on every render and the
  // active section always contains the currently-active item.
  useEffect(() => {
    let targetSection = null;
    for (const g of groups) {
      if (g.name && g.items.find((it) => it.id === current)) {
        targetSection = g.name;
        break;
      }
    }
    if (!targetSection) return;
    setCollapsed((prev) => {
      if (!prev.has(targetSection)) return prev; // already expanded
      const next = new Set(prev);
      next.delete(targetSection);
      return next;
    });
  // Intentional: only re-run when navigation happens. groups/collapsed are
  // read freshly inside but not deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const toggleGroup = (name) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  const displayName = user?.name || "Signed in";
  return (
    <aside className="sidebar">
      <div className="brand">
        {/* Brand mark uses the school's actual logo (served from /public/logo.png).
            The wrapping div keeps the rounded square frame consistent with the
            rest of the design system. */}
        <div className="brand-mark" style={{ background: "#fff", padding: 2, overflow: "hidden" }}>
          <img src="/logo.png" alt="Sanfort International School" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        </div>
        <div className="brand-text">
          <div className="b1">
            Sanfort<span className="num"> International</span>
          </div>
          <div className="b2">Sanvi Educational &amp; Charitable Trust</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", marginTop: 4, flex: 1 }}>
        {groups.map((group, gi) => {
          const isCollapsed = group.name && collapsed.has(group.name);
          return (
            <div key={gi}>
              {group.name && (
                <button
                  type="button"
                  className="side-section"
                  onClick={() => toggleGroup(group.name)}
                  title={isCollapsed ? `Expand ${group.name}` : `Collapse ${group.name}`}
                  style={{
                    width: "100%",
                    background: "none",
                    border: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    textAlign: "left",
                    padding: "10px 14px 4px",
                  }}
                >
                  <Icon
                    name="chevronDown"
                    size={10}
                    style={{
                      transition: "transform 120ms ease",
                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      opacity: 0.7,
                    }}
                  />
                  <span style={{ flex: 1 }}>{group.name}</span>
                  {isCollapsed && group.items.length > 0 && (
                    <span style={{
                      fontSize: 9.5,
                      color: "var(--ink-4)",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 400,
                    }}>{group.items.length}</span>
                  )}
                </button>
              )}
              {!isCollapsed && group.items.map((it) => {
                const active = current === it.id;
                return (
                  <div key={it.id} className={`side-item ${active ? "active" : ""}`} onClick={() => setCurrent(it.id)}>
                    <Icon name={it.icon} size={16} className="side-icon" />
                    <span className="side-lbl">{it.label}</span>
                    {it.live && (
                      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, color: "var(--ok)", fontSize: 10.5, fontWeight: 500 }}>
                        <span className="pulse-dot" />
                        Live
                      </span>
                    )}
                    {it.badge && <span className={`side-badge ${it.badgeAlert ? "alert" : ""}`}>{it.badge}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="side-foot">
        <AvatarChip initials={initialsOf(displayName)} />
        <div style={{ minWidth: 0, flex: 1 }} className="side-lbl">
          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{ROLE_LABEL[role] || role}</div>
        </div>
      </div>
    </aside>
  );
}
