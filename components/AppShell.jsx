"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import Sidebar, { NAV_BY_ROLE } from "./Sidebar";
import MobileShell from "./MobileShell";
import Tweaks from "./Tweaks";
import GlobalSearch from "./GlobalSearch";
import NotificationsPanel from "./NotificationsPanel";

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
import ScreenAttendance from "./screens/Attendance";
import ScreenAccessControl from "./screens/AccessControl";
import ScreenTasks from "./screens/Tasks";

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
  attendance: ScreenAttendance,
  access: ScreenAccessControl,
  tasks: ScreenTasks,
};

const DEFAULT_SCREEN_BY_ROLE = {
  admin: "trust",
  academic_director: "dashboard",
  principal: "dashboard",
  teacher: "academic",
  parent: "dashboard",
};

const ROLE_LABEL = {
  admin: "Admin",
  academic_director: "Academic Director",
  principal: "Principal",
  teacher: "Teacher",
  parent: "Parent",
};

const DEFAULT_SETTINGS = {
  theme: "light",
  view: "desktop",
  density: "compact",
  sidebar: "expanded",
  accent: "amber",
};

export default function AppShell({ initialData, session }) {
  const [data, setData] = useState(initialData);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [current, setCurrent] = useState(DEFAULT_SCREEN_BY_ROLE[session?.role] || "dashboard");
  const [showTweaks, setShowTweaks] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [permissions, setPermissions] = useState(null); // { role: { fid: bool } }
  const userMenuRef = useRef(null);

  // Role comes from the server-issued session — never from localStorage.
  const role = session?.role || "parent";

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("vidyalaya360.tweaks") || "null");
      if (saved) {
        // Drop any persisted role — session is the source of truth now.
        const { role: _drop, ...rest } = saved;
        setSettings((s) => ({ ...s, ...rest }));
      }
      // Per-role last-screen so different logins don't fight over the slot.
      const screen = localStorage.getItem(`vidyalaya360.screen.${role}`);
      if (screen && SCREENS[screen]) {
        const allowed = (NAV_BY_ROLE[role] || []).filter((n) => !n.section).map((n) => n.id);
        if (allowed.includes(screen)) setCurrent(screen);
      }
    } catch {}
    setHydrated(true);
  }, [role]);

  // Fetch the role-permissions matrix once on mount and on every refresh().
  // Cheap call — used by Sidebar to filter NAV_BY_ROLE.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/permissions", { cache: "no-store" });
        const json = await r.json();
        if (!cancelled && json?.ok) setPermissions(json.permissions || {});
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("vidyalaya360.tweaks", JSON.stringify(settings));
  }, [settings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(`vidyalaya360.screen.${role}`, current);
  }, [current, role, hydrated]);

  // Snap to a sensible default whenever:
  //   1. the current screen isn't part of this role's NAV_BY_ROLE (legacy reasons), or
  //   2. the admin just disabled it via Access control (permissions.role[id] === false).
  useEffect(() => {
    const navIds = (NAV_BY_ROLE[role] || []).filter((n) => !n.section).map((n) => n.id);
    const rolePerms = (permissions && permissions[role]) || null;
    const allowedNow = navIds.filter((id) => !rolePerms || rolePerms[id] !== false);
    if (allowedNow.length === 0) return; // edge: nothing allowed → leave alone
    if (!allowedNow.includes(current)) {
      const fallback = allowedNow.includes(DEFAULT_SCREEN_BY_ROLE[role]) ? DEFAULT_SCREEN_BY_ROLE[role] : allowedNow[0];
      setCurrent(fallback);
    }
  }, [role, current, permissions]);

  // Cmd/Ctrl+K toggles tweaks.
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

  // Click-outside for the user menu.
  useEffect(() => {
    if (!showUserMenu) return;
    const onClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showUserMenu]);

  const setSetting = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  const refresh = async () => {
    try {
      const r = await fetch("/api/data", { cache: "no-store" });
      const json = await r.json();
      // Pull permissions in the same beat — Access control's save invokes
      // refresh(), and this is what makes the sidebar update without reload.
      try {
        const pr = await fetch("/api/permissions", { cache: "no-store" });
        const pj = await pr.json();
        if (pj?.ok) setPermissions(pj.permissions || {});
      } catch {}
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
        MOVEMENTS: json.movements || [],
        BROADCASTS: json.broadcasts || [],
        TEMPLATES: json.templates || [],
        RECIPIENT_LISTS: json.recipientLists || [],
        STAFF: json.staff,
        DONORS: json.donors || [],
        CAMPAIGNS: json.campaigns || [],
        DONOR_RECEIPTS: json.donorReceipts || [],
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

  const view = settings.view;
  const Comp = SCREENS[current] || SCREENS.dashboard;

  // Per-role data scoping. Defence-in-depth: API/RLS should enforce too.
  const scopedData = (() => {
    if (role === "parent") {
      // Parent sees ONLY their child. Demo picks the first active student
      // when no linked_id is set; production should always have a linked_id.
      const linkedId = session?.linkedId;
      const myChild = linkedId
        ? (data.ADDED_STUDENTS || []).find((s) => s.id === linkedId)
        : (data.ADDED_STUDENTS || [])[0];
      if (!myChild) {
        return { ...data, ADDED_STUDENTS: [], PENDING_FEES: [], RECENT_FEES: [], DAILY_LOGS: [], ROUTES: [], COMPLAINTS: [] };
      }
      return {
        ...data,
        ADDED_STUDENTS:    [myChild],
        ARCHIVED_STUDENTS: [],
        PENDING_FEES:      (data.PENDING_FEES || []).filter((f) => f.id === myChild.id),
        RECENT_FEES:       (data.RECENT_FEES  || []).filter((f) => (f.studentId || f.id) === myChild.id),
        DAILY_LOGS:        (data.DAILY_LOGS   || []).filter((l) => l.studentId === myChild.id),
        ROUTES:            (data.ROUTES || []).filter((r) => r.code === myChild.transport),
        COMPLAINTS:        (data.COMPLAINTS || []).filter((c) => c.studentId === myChild.id || c.student === myChild.name),
        STAFF: [], AUDIT: [], INVENTORY: [], DONORS: [],
        ENQUIRIES: [], AUTOMATIONS: [],
        SCHOOLS: [], USERS: [], ANOMALIES: [], DONATION_PIPELINE: [],
        COMPLIANCE: [], AI_BRIEF: [],
      };
    }
    if (role === "academic_director") {
      // Academic Director: students, classes, all daily logs across teachers,
      // complaints, communication. NO fees, payroll, donations, inventory.
      return {
        ...data,
        PENDING_FEES: [], RECENT_FEES: [],
        STAFF: [], INVENTORY: [], DONORS: [],
        DONATION_PIPELINE: [], COMPLIANCE: [], AI_BRIEF: [],
        SCHOOLS: [], ANOMALIES: [],
      };
    }
    if (role === "teacher") {
      // Teachers: classroom only. Hide finance/HR/donor data. Scope to the
      // set of classes they're assigned to (session.linkedClasses can hold
      // multiple — a teacher may be class teacher of 2-A AND 5-B). If no
      // assignment exists, fall back to the legacy single linkedId.
      const myClasses = new Set(
        Array.isArray(session?.linkedClasses) && session.linkedClasses.length
          ? session.linkedClasses
          : (session?.linkedId ? [session.linkedId] : [])
      );
      const hasScope = myClasses.size > 0;
      const scopedStudents = hasScope
        ? (data.ADDED_STUDENTS || []).filter((s) => myClasses.has(s.cls))
        : (data.ADDED_STUDENTS || []);
      const scopedStudentIds = new Set(scopedStudents.map((s) => s.id));
      return {
        ...data,
        ADDED_STUDENTS: scopedStudents,
        DAILY_LOGS: hasScope
          ? (data.DAILY_LOGS || []).filter((l) => myClasses.has(l.cls) || scopedStudentIds.has(l.studentId))
          : (data.DAILY_LOGS || []),
        COMPLAINTS: hasScope
          ? (data.COMPLAINTS || []).filter((c) => myClasses.has(c.cls) || scopedStudentIds.has(c.studentId))
          : (data.COMPLAINTS || []),
        PENDING_FEES: [], RECENT_FEES: [],
        STAFF: [], INVENTORY: [], DONORS: [],
        DONATION_PIPELINE: [], COMPLIANCE: [], AI_BRIEF: [],
        SCHOOLS: [], ANOMALIES: [], ENQUIRIES: [],
      };
    }
    return data;
  })();

  const userMenu = (
    <div className="user-menu-wrap" ref={userMenuRef} style={{ position: "relative" }}>
      <button
        className="user-menu-btn"
        onClick={() => setShowUserMenu((s) => !s)}
        title={session?.email}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "5px 10px 5px 5px",
          background: "var(--bg-2)", border: "1px solid var(--line, #e5dfd1)",
          borderRadius: 999, cursor: "pointer", color: "var(--ink)",
          fontSize: 12, fontWeight: 500,
        }}
      >
        <span
          style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            color: "#fff", display: "grid", placeItems: "center",
            fontSize: 10.5, fontWeight: 600,
          }}
        >
          {(session?.name || "U").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
        </span>
        <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {session?.name}
        </span>
        <Icon name="chevronDown" size={11} />
      </button>
      {showUserMenu && (
        <div
          style={{
            position: "absolute", right: 0, top: "calc(100% + 6px)",
            minWidth: 220,
            background: "var(--card, #fff)",
            border: "1px solid var(--line, #e5dfd1)",
            borderRadius: 10, padding: 6, zIndex: 100,
            boxShadow: "0 16px 40px -20px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ padding: "8px 10px 10px", borderBottom: "1px dashed var(--line, #e5dfd1)" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{session?.name}</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{session?.email}</div>
            <div
              style={{
                marginTop: 6, display: "inline-block",
                fontSize: 10, padding: "2px 7px", borderRadius: 4,
                background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 500,
              }}
            >
              {ROLE_LABEL[role] || role}
            </div>
          </div>
          <button
            onClick={async () => {
              try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
              try {
                Object.keys(localStorage).filter((k) => k.startsWith("vidyalaya360.")).forEach((k) => localStorage.removeItem(k));
              } catch {}
              window.location.href = "/login";
            }}
            style={{
              width: "100%", textAlign: "left",
              padding: "8px 10px", marginTop: 4,
              background: "transparent", border: 0, borderRadius: 6,
              cursor: "pointer", color: "var(--ink-2)", fontSize: 12.5,
              display: "flex", alignItems: "center", gap: 8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icon name="x" size={13} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );

  if (view === "mobile") {
    return (
      <div
        data-theme={settings.theme}
        data-density={settings.density}
        data-sidebar="expanded"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "32px 16px", background: "var(--bg-2)" }}
      >
        <MobileShell current={current} setCurrent={setCurrent} role={role}>
          <Comp E={scopedData} refresh={refresh} role={role} session={session} />
        </MobileShell>
        <ViewToggle view={view} setView={(v) => setSetting("view", v)} />
        <Tweaks show={showTweaks} settings={settings} setSetting={setSetting} />
      </div>
    );
  }

  return (
    <div className="app" data-theme={settings.theme} data-density={settings.density} data-sidebar={settings.sidebar}>
      <Sidebar current={current} setCurrent={setCurrent} role={role} user={session} permissions={permissions} />
      <div className="main">
        <div className="topbar">
          <button
            className="icon-btn"
            onClick={() => setSetting("sidebar", settings.sidebar === "collapsed" ? "expanded" : "collapsed")}
            title="Toggle sidebar"
          >
            <Icon name="menu" size={15} />
          </button>
          <GlobalSearch
            E={scopedData}
            role={role}
            setCurrent={setCurrent}
            placeholder={role === "parent" ? "Search fees, messages, transport…" : "Search students, fees, staff, routes…"}
          />
          <div className="topbar-right">
            <button
              className="icon-btn"
              onClick={() => setSetting("theme", settings.theme === "dark" ? "light" : "dark")}
              title="Theme"
            >
              <Icon name={settings.theme === "dark" ? "sun" : "moon"} size={15} />
            </button>
            <NotificationsPanel E={scopedData} role={role} setCurrent={setCurrent} />
            {userMenu}
          </div>
        </div>

        <Comp E={scopedData} refresh={refresh} role={role} session={session} />
      </div>

      <ViewToggle view={view} setView={(v) => setSetting("view", v)} />
      <Tweaks show={showTweaks} settings={settings} setSetting={setSetting} />
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
