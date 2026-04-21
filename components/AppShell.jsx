"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import Sidebar, { NAV_BY_ROLE } from "./Sidebar";
import MobileShell from "./MobileShell";
import Tweaks, { ROLES } from "./Tweaks";

import ScreenDashboard from "./screens/Dashboard";
import ScreenTrust from "./screens/Trust";
import ScreenSchools from "./screens/Schools";
import ScreenMoney from "./screens/Money";
import ScreenFees from "./screens/Fees";
import ScreenStudents from "./screens/Students";
import ScreenAcademic from "./screens/Academic";
import ScreenStaff from "./screens/Staff";
import ScreenTransport from "./screens/Transport";
import ScreenInventory from "./screens/Inventory";
import ScreenCommunication from "./screens/Communication";
import ScreenEnquiries from "./screens/Enquiries";
import ScreenComplaints from "./screens/Complaints";
import ScreenDonors from "./screens/Donors";
import ScreenAutomation from "./screens/Automation";
import ScreenUsers from "./screens/Users";
import ScreenAudit from "./screens/Audit";
import ScreenSettings from "./screens/Settings";
import ScreenClasses from "./screens/Classes";

const SCREENS = {
  dashboard: ScreenDashboard,
  trust: ScreenTrust,
  schools: ScreenSchools,
  money: ScreenMoney,
  fees: ScreenFees,
  students: ScreenStudents,
  academic: ScreenAcademic,
  staff: ScreenStaff,
  transport: ScreenTransport,
  inventory: ScreenInventory,
  communication: ScreenCommunication,
  enquiries: ScreenEnquiries,
  complaints: ScreenComplaints,
  donors: ScreenDonors,
  automation: ScreenAutomation,
  users: ScreenUsers,
  audit: ScreenAudit,
  settings: ScreenSettings,
  classes: ScreenClasses,
};

const DEFAULT_SCREEN_BY_ROLE = {
  super: "trust",
  principal: "dashboard",
  teacher: "academic",
  parent: "dashboard",
};

const DEFAULT_SETTINGS = {
  theme: "light",
  role: "principal",
  view: "desktop",
  density: "compact",
  sidebar: "expanded",
  accent: "amber",
};

export default function AppShell({ initialData }) {
  const [data, setData] = useState(initialData);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [current, setCurrent] = useState("dashboard");
  const [showTweaks, setShowTweaks] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("vidyalaya360.tweaks") || "null");
      if (saved) setSettings((s) => ({ ...s, ...saved }));
      const screen = localStorage.getItem("vidyalaya360.screen");
      if (screen && SCREENS[screen]) setCurrent(screen);
      else setCurrent(DEFAULT_SCREEN_BY_ROLE[(saved && saved.role) || "principal"] || "dashboard");
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("vidyalaya360.tweaks", JSON.stringify(settings));
  }, [settings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("vidyalaya360.screen", current);
  }, [current, hydrated]);

  // Snap to default screen when role changes if current isn't in this role's nav
  useEffect(() => {
    if (!hydrated) return;
    const allowed = (NAV_BY_ROLE[settings.role] || []).filter((n) => !n.section).map((n) => n.id);
    if (!allowed.includes(current)) setCurrent(DEFAULT_SCREEN_BY_ROLE[settings.role] || "dashboard");
  }, [settings.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cmd/Ctrl + K toggles tweaks panel
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setShowTweaks((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setSetting = (k, v) => setSettings((s) => ({ ...s, [k]: v }));
  const refresh = async () => {
    try {
      const r = await fetch("/api/data", { cache: "no-store" });
      const json = await r.json();
      setData({
        KPIS: json.kpis,
        CLASSES: json.classes,
        CLASS_STRENGTH: json.classStrength,
        RECENT_FEES: json.recentFees,
        PENDING_FEES: json.pendingFees,
        ACTIVITIES: json.activities,
        ROUTES: json.routes,
        COMPLAINTS: json.complaints,
        ENQUIRIES: json.enquiries,
        INVENTORY: json.inventory,
        STAFF: json.staff,
        DONORS: json.donors,
        INCOME_SERIES: json.incomeSeries,
        AUTOMATIONS: json.automations,
        SCHOOLS: json.schools,
        TRUST_KPIS: json.trustKpis,
        ANOMALIES: json.anomalies,
        DONATION_PIPELINE: json.donationPipeline,
        COMPLIANCE: json.compliance,
        AI_BRIEF: json.aiBrief,
        ROLES: json.roles,
        USERS: json.users,
        AUDIT: json.audit,
        ADDED_STUDENTS: json.addedStudents || [],
        ARCHIVED_STUDENTS: json.archivedStudents || [],
        DAILY_LOGS: json.dailyLogs || [],
      });
    } catch {}
  };

  const role = settings.role;
  const view = settings.view;
  const Comp = SCREENS[current] || SCREENS.dashboard;

  // For the Parent role, restrict every piece of data to this parent's child.
  // Demo picks the first active student as "this parent's child"; in a
  // real deployment the parent would be authenticated and linked to a
  // specific student_id on the students table.
  const scopedData = (() => {
    if (role !== "parent") return data;
    const myChild = (data.ADDED_STUDENTS || [])[0];
    if (!myChild) return { ...data, ADDED_STUDENTS: [], PENDING_FEES: [], RECENT_FEES: [], DAILY_LOGS: [], ROUTES: [] };
    return {
      ...data,
      ADDED_STUDENTS:    [myChild],
      ARCHIVED_STUDENTS: [],
      PENDING_FEES:      (data.PENDING_FEES || []).filter((f) => f.id === myChild.id),
      RECENT_FEES:       (data.RECENT_FEES  || []).filter((f) => f.id === myChild.id),
      DAILY_LOGS:        (data.DAILY_LOGS   || []).filter((l) => l.studentId === myChild.id),
      ROUTES:            (data.ROUTES || []).filter((r) => r.code === myChild.transport),
      // Hide all admin-level data from the parent view.
      STAFF: [], AUDIT: [], INVENTORY: [], DONORS: [],
      ENQUIRIES: [], COMPLAINTS: [], AUTOMATIONS: [],
      SCHOOLS: [], USERS: [], ANOMALIES: [], DONATION_PIPELINE: [],
      COMPLIANCE: [], AI_BRIEF: [],
    };
  })();

  if (view === "mobile") {
    return (
      <div
        data-theme={settings.theme}
        data-density={settings.density}
        data-sidebar="expanded"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px 16px", background: "var(--bg-2)" }}
      >
        <MobileShell current={current} setCurrent={setCurrent} role={role}>
          <Comp E={scopedData} refresh={refresh} role={role} />
        </MobileShell>
        <RolePill role={role} setRole={(r) => setSetting("role", r)} />
        <ViewToggle view={view} setView={(v) => setSetting("view", v)} />
        <Tweaks show={showTweaks} settings={settings} setSetting={setSetting} />
      </div>
    );
  }

  return (
    <div className="app" data-theme={settings.theme} data-density={settings.density} data-sidebar={settings.sidebar}>
      <Sidebar current={current} setCurrent={setCurrent} role={role} />
      <div className="main">
        <div className="topbar">
          <button
            className="icon-btn"
            onClick={() => setSetting("sidebar", settings.sidebar === "collapsed" ? "expanded" : "collapsed")}
            title="Toggle sidebar"
          >
            <Icon name="menu" size={15} />
          </button>
          <div className="topbar-search">
            <Icon name="search" size={14} />
            <input placeholder={role === "parent" ? "Search fees, messages, transport…" : "Search students, fees, staff, routes…"} />
            <span className="kbd">⌘F</span>
          </div>
          <div className="topbar-right">
            {role !== "parent" && (
              <span className="live-pill">
                <span className="pulse-dot" />
                Live
              </span>
            )}
            <button
              className="icon-btn"
              onClick={() => setSetting("theme", settings.theme === "dark" ? "light" : "dark")}
              title="Theme"
            >
              <Icon name={settings.theme === "dark" ? "sun" : "moon"} size={15} />
            </button>
            <button className="icon-btn has-dot" title="Notifications">
              <Icon name="bell" size={15} />
            </button>
            <button className="icon-btn" onClick={() => setShowTweaks((s) => !s)} title="Tweaks">
              <Icon name="sliders" size={15} />
            </button>
          </div>
        </div>

        <Comp E={data} refresh={refresh} role={role} />
      </div>

      <RolePill role={role} setRole={(r) => setSetting("role", r)} />
      <ViewToggle view={view} setView={(v) => setSetting("view", v)} />
      <Tweaks show={showTweaks} settings={settings} setSetting={setSetting} />
    </div>
  );
}

function RolePill({ role, setRole }) {
  return (
    <div className="role-pill">
      {ROLES.map((r) => (
        <button key={r.k} className={role === r.k ? "active" : ""} onClick={() => setRole(r.k)}>
          <Icon name={r.icon} size={12} />
          {r.label}
        </button>
      ))}
    </div>
  );
}

function ViewToggle({ view, setView }) {
  return (
    <div className="view-toggle">
      <button className={view === "desktop" ? "active" : ""} onClick={() => setView("desktop")}>
        Desktop
      </button>
      <button className={view === "mobile" ? "active" : ""} onClick={() => setView("mobile")}>
        Mobile
      </button>
    </div>
  );
}
