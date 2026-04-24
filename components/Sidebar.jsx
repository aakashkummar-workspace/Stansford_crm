"use client";

import Icon from "./Icon";
import { AvatarChip } from "./ui";

// Nav items per role. Five real roles now (admin replaces the old "super"
// demo; academic_director is brand new).
export const NAV_BY_ROLE = {
  admin: [
    { section: "Trust" },
    { id: "trust",     label: "Overview",     icon: "dashboard" },
    { id: "schools",   label: "Schools",      icon: "school" },
    { id: "money",     label: "Finance",      icon: "money" },
    { id: "donors",    label: "Trust & Donors", icon: "donors" },
    { section: "School" },
    { id: "dashboard",  label: "Dashboard",    icon: "dashboard" },
    { id: "students",   label: "Students",     icon: "students" },
    { id: "classes",    label: "Classes",      icon: "book" },
    { id: "attendance", label: "Attendance",   icon: "check" },
    { id: "academic",   label: "Academic",     icon: "academic" },
    { id: "fees",      label: "Fees & UPI",   icon: "fees" },
    { id: "staff",     label: "Staff",        icon: "staff" },
    { id: "transport", label: "Transport",    icon: "bus" },
    { id: "inventory", label: "Inventory",    icon: "inventory" },
    { id: "complaints",label: "Complaints",   icon: "complaint" },
    { id: "enquiries", label: "Admissions",   icon: "enquiry" },
    { section: "Governance" },
    { id: "access",    label: "Access control",icon: "shield" },
    { id: "tasks",     label: "Tasks",        icon: "check" },
    { id: "users",     label: "Users & Roles",icon: "users" },
    { id: "audit",     label: "Audit log",    icon: "audit" },
    { id: "automation",label: "Automation",   icon: "automation" },
    { id: "settings",  label: "Settings",     icon: "settings" },
  ],
  academic_director: [
    { section: "Academics" },
    { id: "dashboard",  label: "Overview",     icon: "dashboard" },
    { id: "attendance", label: "Attendance",   icon: "check" },
    { id: "academic",   label: "Daily logs",   icon: "academic" },
    { id: "students",   label: "Students",     icon: "students" },
    { id: "classes",    label: "Classes",      icon: "book" },
    { section: "People" },
    { id: "complaints",label: "Complaints",   icon: "complaint" },
    { id: "communication", label: "Messages", icon: "megaphone" },
    { id: "tasks",     label: "My tasks",     icon: "check" },
  ],
  principal: [
    { section: "Overview" },
    { id: "dashboard", label: "Dashboard",    icon: "dashboard" },
    { id: "money",     label: "Money",        icon: "money" },
    { id: "fees",      label: "Fees & Transaction", icon: "fees" },
    { section: "People" },
    { id: "students",   label: "Students",     icon: "students" },
    { id: "classes",    label: "Classes",      icon: "book" },
    { id: "attendance", label: "Attendance",   icon: "check" },
    { id: "academic",   label: "Academic",     icon: "academic" },
    { id: "staff",      label: "Staff",        icon: "staff" },
    { section: "Operations" },
    { id: "transport", label: "Transport",    icon: "bus" },
    { id: "inventory", label: "Inventory",    icon: "inventory" },
    { id: "communication", label: "Communication", icon: "megaphone" },
    { section: "CRM" },
    { id: "enquiries", label: "Admissions",   icon: "enquiry" },
    { id: "complaints",label: "Complaints",   icon: "complaint" },
    { id: "donors",    label: "Donors",       icon: "donors" },
    { section: "System" },
    { id: "automation",label: "Automation",   icon: "automation" },
    { id: "tasks",     label: "My tasks",     icon: "check" },
  ],
  teacher: [
    { section: "My classroom" },
    { id: "dashboard",  label: "Today",        icon: "dashboard" },
    { id: "attendance", label: "Attendance",   icon: "check" },
    { id: "academic",   label: "Class tracker",icon: "academic" },
    { id: "students",   label: "My students",  icon: "students" },
    { id: "communication", label: "Messages",  icon: "megaphone" },
    { section: "Admin" },
    { id: "complaints", label: "Complaints",   icon: "complaint" },
    { id: "tasks",      label: "My tasks",     icon: "check" },
  ],
  parent: [
    { section: "My family" },
    { id: "dashboard", label: "Home",         icon: "home" },
    { id: "academic",  label: "Academics",    icon: "academic" },
    { id: "fees",      label: "Fees",         icon: "fees" },
    { id: "transport", label: "Transport",    icon: "bus" },
    { id: "communication", label: "Messages", icon: "megaphone" },
  ],
};

const ROLE_LABEL = {
  admin: "Admin",
  academic_director: "Academic Director",
  principal: "Principal",
  teacher: "Teacher",
  parent: "Parent",
};

function initialsOf(name) {
  if (!name) return "—";
  const parts = String(name).trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name[0].toUpperCase();
}

export default function Sidebar({ current, setCurrent, role, user, permissions }) {
  const allItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.admin;
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
  const displayName = user?.name || "Signed in";
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">V</div>
        <div className="brand-text">
          <div className="b1">
            Vidyalaya<span className="num">360</span>
          </div>
          <div className="b2">Stansford Intl · HR.Sec.School</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", marginTop: 4, flex: 1 }}>
        {items.map((it, i) => {
          if (it.section) return <div key={i} className="side-section">{it.section}</div>;
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
