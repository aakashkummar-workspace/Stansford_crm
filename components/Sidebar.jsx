"use client";

import Icon from "./Icon";
import { AvatarChip } from "./ui";

export const NAV_BY_ROLE = {
  super: [
    { section: "Trust" },
    { id: "trust", label: "Overview", icon: "dashboard" },
    { id: "schools", label: "Schools", icon: "school", badge: "3" },
    { id: "money", label: "Finance", icon: "money" },
    { id: "donors", label: "Trust & Donors", icon: "donors" },
    { section: "Governance" },
    { id: "users", label: "Users & Roles", icon: "users" },
    { id: "audit", label: "Audit log", icon: "audit" },
    { id: "settings", label: "Settings", icon: "settings" },
  ],
  principal: [
    { section: "Overview" },
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "money", label: "Money", icon: "money" },
    { id: "fees", label: "Fees & UPI", icon: "fees" },
    { section: "People" },
    { id: "students", label: "Students", icon: "students", badge: "445" },
    { id: "academic", label: "Academic", icon: "academic" },
    { id: "staff", label: "Staff", icon: "staff", badge: "38" },
    { section: "Operations" },
    { id: "transport", label: "Transport", icon: "bus", live: true },
    { id: "inventory", label: "Inventory", icon: "inventory", badge: "4", badgeAlert: true },
    { id: "communication", label: "Communication", icon: "megaphone" },
    { section: "CRM" },
    { id: "enquiries", label: "Admissions", icon: "enquiry", badge: "24" },
    { id: "complaints", label: "Complaints", icon: "complaint", badge: "6", badgeAlert: true },
    { id: "donors", label: "Donors", icon: "donors" },
    { section: "System" },
    { id: "automation", label: "Automation", icon: "automation" },
  ],
  teacher: [
    { section: "My classroom" },
    { id: "dashboard", label: "Today", icon: "dashboard" },
    { id: "academic", label: "Class tracker", icon: "academic" },
    { id: "students", label: "My students", icon: "students" },
    { id: "communication", label: "Messages", icon: "megaphone" },
    { section: "Admin" },
    { id: "complaints", label: "Complaints", icon: "complaint" },
  ],
  parent: [
    { section: "My family" },
    { id: "dashboard", label: "Home", icon: "home" },
    { id: "academic", label: "Academics", icon: "academic" },
    { id: "fees", label: "Fees", icon: "fees" },
    { id: "transport", label: "Transport", icon: "bus" },
    { id: "communication", label: "Messages", icon: "megaphone" },
    { id: "complaints", label: "Raise ticket", icon: "complaint" },
  ],
};

export default function Sidebar({ current, setCurrent, role }) {
  const items = NAV_BY_ROLE[role] || NAV_BY_ROLE.super;
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">V</div>
        <div className="brand-text">
          <div className="b1">
            Vidyalaya<span className="num">360</span>
          </div>
          <div className="b2">Saraswati Trust · 3</div>
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
        <AvatarChip initials="RI" />
        <div style={{ minWidth: 0, flex: 1 }} className="side-lbl">
          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Rajesh Iyer</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "capitalize" }}>{role === "super" ? "Super Admin" : role}</div>
        </div>
      </div>
    </aside>
  );
}
