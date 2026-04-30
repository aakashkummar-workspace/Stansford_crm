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
import ScreenUsers from "./screens/Users";
import ScreenAudit from "./screens/Audit";
import ScreenSettings from "./screens/Settings";
import ScreenClasses from "./screens/Classes";
import ScreenAttendance from "./screens/Attendance";
import ScreenAccessControl from "./screens/AccessControl";
import ScreenTasks from "./screens/Tasks";
import ScreenReports from "./screens/Reports";
import ScreenExams from "./screens/Exams";
import ScreenMyAttendance from "./screens/MyAttendance";
import ScreenTc from "./screens/Tc";
import ScreenChat from "./screens/Chat";
import ScreenMeetings from "./screens/Meetings";
import ScreenVolunteers from "./screens/Volunteers";
import ScreenLibrary from "./screens/Library";
import ScreenTimetable from "./screens/Timetable";
import ScreenAccount from "./screens/Account";
import ScreenLeave from "./screens/Leave";
import ScreenRemarksRewards from "./screens/RemarksRewards";
import ScreenGovernmentDocuments from "./screens/GovernmentDocuments";
import ScreenStudentActivities from "./screens/StudentActivities";
import ScreenCustomRoles from "./screens/CustomRoles";
import ScreenMessages from "./screens/Messages";
import ScreenScale from "./screens/Scale";
import ScreenScaleReport from "./screens/ScaleReport";
import ScreenScaleAdmin from "./screens/ScaleAdmin";
import ScreenScaleAdvisory from "./screens/ScaleAdvisory";
import ScreenScaleRitual from "./screens/ScaleRitual";

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
  users: ScreenUsers,
  audit: ScreenAudit,
  settings: ScreenSettings,
  classes: ScreenClasses,
  attendance: ScreenAttendance,
  access: ScreenAccessControl,
  tasks: ScreenTasks,
  reports: ScreenReports,
  exams: ScreenExams,
  my_attendance: ScreenMyAttendance,
  tc: ScreenTc,
  chat: ScreenChat,
  meetings: ScreenMeetings,
  volunteers: ScreenVolunteers,
  library: ScreenLibrary,
  timetable: ScreenTimetable,
  account: ScreenAccount,
  leave: ScreenLeave,
  remarks_rewards: ScreenRemarksRewards,
  government_documents: ScreenGovernmentDocuments,
  student_activities: ScreenStudentActivities,
  custom_roles: ScreenCustomRoles,
  messages: ScreenMessages,
  scale: ScreenScale,
  scale_report: ScreenScaleReport,
  scale_admin: ScreenScaleAdmin,
  scale_advisory: ScreenScaleAdvisory,
  scale_ritual: ScreenScaleRitual,
};

const DEFAULT_SCREEN_BY_ROLE = {
  admin: "trust",
  academic_director: "dashboard",
  principal: "dashboard",
  teacher: "academic",
  parent: "dashboard",
  school_accountant: "dashboard",
  trust_accountant: "trust",
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
  // Mobile-only: when true, the sidebar slides in as an overlay drawer.
  // The hamburger toggles it on screens ≤ 820px; tapping a nav item or
  // the backdrop closes it.
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [permissions, setPermissions] = useState(null); // { role: { fid: bool } }
  const [access, setAccess] = useState({});              // { role: { fid: { canView, canEdit, canDelete } } }
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
  // Cheap call — used by Sidebar to filter NAV_BY_ROLE and by individual
  // screens (Money etc.) to gate Add / Edit buttons via the `access` map.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/permissions", { cache: "no-store" });
        const json = await r.json();
        if (!cancelled && json?.ok) {
          setPermissions(json.permissions || {});
          setAccess(json.access || {});
        }
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
  //   2. the admin just disabled it via Access control (permissions.role[id] === false), or
  //   3. the role is a custom one — its allowed screens come purely from
  //      the permissions matrix (built server-side from role_feature_access).
  useEffect(() => {
    const rolePerms = (permissions && permissions[role]) || null;
    const isCustom = !NAV_BY_ROLE[role];
    let allowedNow;
    if (isCustom) {
      // Custom role: allowed list is "every featureId where permissions === true".
      // Filter to ones we have a screen component for.
      if (!rolePerms) return; // permissions still loading
      allowedNow = Object.entries(rolePerms)
        .filter(([id, on]) => on && SCREENS[id])
        .map(([id]) => id);
    } else {
      const navIds = (NAV_BY_ROLE[role] || []).filter((n) => !n.section).map((n) => n.id);
      allowedNow = navIds.filter((id) => !rolePerms || rolePerms[id] !== false);
    }
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
        if (pj?.ok) {
          setPermissions(pj.permissions || {});
          setAccess(pj.access || {});
        }
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
        INVENTORY_CATEGORIES: json.inventoryCategories || [],
        LIBRARY: json.library || [],
        LOANS: json.libraryLoans || [],
        TIMETABLE: json.timetable || [],
        MOVEMENTS: json.movements || [],
        BROADCASTS: json.broadcasts || [],
        TEMPLATES: json.templates || [],
        RECIPIENT_LISTS: json.recipientLists || [],
        STAFF: json.staff,
        DONORS: json.donors || [],
        CAMPAIGNS: json.campaigns || [],
        DONOR_RECEIPTS: json.donorReceipts || [],
        EXPENSES: json.expenses || [],
        TASKS: json.tasks || [],
        MAINTENANCE_LOGS: json.maintenanceLogs || [],
        TEACHER_ATTENDANCE: json.teacherAttendance || [],
        TRANSPORT_ATTENDANCE: json.transportAttendance || [],
        STAFF_AWARDS: json.staffAwards || [],
        SUBJECTS: json.subjects || [],
        SETTINGS: json.appSettings || {},
        EXAMS: json.exams || [],
        MARKS: json.marks || [],
        TC_REQUESTS: json.tcRequests || [],
        MEETINGS: json.meetings || [],
        VOLUNTEERS: json.volunteers || [],
        CHAT_THREADS: json.chatThreads || [],
        FEE_REMINDERS: json.feeReminders || [],
        INCOME_SERIES: json.incomeSeries,
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
        EXPENSE_CATEGORIES:    json.expenseCategories || [],
        DONOR_FORM_SUBMISSIONS: json.donorFormSubmissions || [],
        LEAVE_REQUESTS:        json.leaveRequests || [],
        REMARKS_REWARDS:       json.remarksRewards || [],
        GOVERNMENT_DOCUMENTS:  json.governmentDocuments || [],
        STUDENT_ACTIVITIES:    json.studentActivities || [],
        CUSTOM_ROLES:          json.customRoles || [],
        SCALE_SESSIONS:        json.scaleSessions || [],
        SCALE_ENTRIES:         json.scaleEntries || [],
        SCALE_SUPPORT_PLANS:   json.scaleSupportPlans || [],
        SCALE_DAILY_RITUALS:   json.scaleDailyRituals || [],
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
        TRANSPORT_ATTENDANCE: (data.TRANSPORT_ATTENDANCE || []).filter((t) => t.studentId === myChild.id),
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
        // Teachers see only their *own* staff record — used by
        // RemarksRewards to resolve "this entry is about me" when the
        // record was stamped with a staff row id rather than a user id.
        // Browsing other staff is still blocked.
        STAFF: (data.STAFF || []).filter(
          (s) => s.email && session?.email && s.email.toLowerCase() === session.email.toLowerCase()
        ),
        INVENTORY: [], DONORS: [],
        DONATION_PIPELINE: [], COMPLIANCE: [], AI_BRIEF: [],
        SCHOOLS: [], ANOMALIES: [], ENQUIRIES: [],
      };
    }
    return data;
  })();
  // Inject the role→feature→{view,edit,delete} access map so every screen
  // can gate Add / Edit / Delete buttons via E.ACCESS without each one
  // having to fetch /api/permissions itself.
  const E = { ...scopedData, ACCESS: access };

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
            onClick={() => { setShowUserMenu(false); setCurrent("account"); }}
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
            <Icon name="user" size={13} />
            My account
          </button>
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
              padding: "8px 10px",
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
          <Comp E={E} refresh={refresh} role={role} session={session} />
        </MobileShell>
        <ViewToggle view={view} setView={(v) => setSetting("view", v)} />
        <Tweaks show={showTweaks} settings={settings} setSetting={setSetting} />
      </div>
    );
  }

  return (
    <div
      className="app"
      data-theme={settings.theme}
      data-density={settings.density}
      data-sidebar={settings.sidebar}
      data-mobile-drawer={mobileDrawerOpen ? "open" : "closed"}
    >
      <Sidebar
        current={current}
        setCurrent={(id) => { setCurrent(id); setMobileDrawerOpen(false); }}
        role={role} user={session} permissions={permissions}
      />
      {/* Backdrop is hidden on desktop via the same CSS that hides the
          drawer there. On mobile, tapping it closes the drawer. */}
      <div
        className="mobile-drawer-backdrop"
        onClick={() => setMobileDrawerOpen(false)}
        aria-hidden={!mobileDrawerOpen}
      />
      <div className="main">
        <div className="topbar">
          <button
            className="icon-btn"
            onClick={() => {
              // On mobile, the hamburger toggles the drawer overlay;
              // on desktop it toggles the collapsed/expanded sidebar.
              if (typeof window !== "undefined" && window.innerWidth <= 820) {
                setMobileDrawerOpen((v) => !v);
              } else {
                setSetting("sidebar", settings.sidebar === "collapsed" ? "expanded" : "collapsed");
              }
            }}
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
            <NotificationsPanel E={scopedData} role={role} setCurrent={setCurrent} />
            {userMenu}
          </div>
        </div>

        <Comp E={E} refresh={refresh} role={role} session={session} />

        <BrandFooter />
      </div>

      <Tweaks show={showTweaks} settings={settings} setSetting={setSetting} />
    </div>
  );
}

function BrandFooter() {
  return (
    <div className="brand-footer">
      <a
        href="https://sirahdigital.in/"
        target="_blank"
        rel="noopener noreferrer"
        className="brand-footer-card"
        aria-label="Developed by Sirah Digital — open website in new tab"
      >
        <span className="brand-footer-mark" aria-hidden="true">
          <Icon name="sparkles" size={14} />
        </span>
        <span className="brand-footer-text">
          <span className="brand-footer-eyebrow">Designed &amp; developed by</span>
          <span className="brand-footer-name">
            Sirah Digital
            <svg className="brand-footer-arrow" viewBox="0 0 14 14" width="11" height="11" aria-hidden="true">
              <path d="M4 10l6-6M5 4h5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </span>
        </span>
      </a>
      <style jsx>{`
        .brand-footer {
          /* margin-top: auto pushes the footer to the bottom of the
             flex column .main wrapper. So on short pages it sits at the
             viewport bottom, and on long pages it follows the content. */
          margin-top: auto;
          padding: 32px 24px 28px;
          display: flex;
          justify-content: center;
        }
        .brand-footer-card {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px 10px 12px;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--card, #ffffff) 0%, var(--bg-2, #f7f5ee) 100%);
          border: 1px solid var(--rule, #e9e3d2);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 18px -10px rgba(31, 63, 139, 0.18);
          text-decoration: none;
          color: var(--ink-2, #1d2433);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .brand-footer-card:hover {
          transform: translateY(-1px);
          border-color: var(--brand, #1f3f8b);
          box-shadow: 0 2px 4px rgba(15, 23, 42, 0.05), 0 12px 28px -12px rgba(31, 63, 139, 0.32);
        }
        .brand-footer-card:hover .brand-footer-arrow {
          transform: translate(2px, -2px);
        }
        .brand-footer-mark {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: #ffffff;
          background: linear-gradient(135deg, var(--brand, #1f3f8b) 0%, var(--accent, #e8530e) 100%);
          flex-shrink: 0;
        }
        .brand-footer-text {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }
        .brand-footer-eyebrow {
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-3, #6b6e74);
        }
        .brand-footer-name {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13.5px;
          font-weight: 700;
          color: var(--brand, #1f3f8b);
          margin-top: 2px;
        }
        .brand-footer-arrow {
          color: var(--brand, #1f3f8b);
          transition: transform 0.18s ease;
        }
      `}</style>
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
