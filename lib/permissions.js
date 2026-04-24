// Role permissions — what each role is allowed to see in the sidebar.
// Mirrors NAV_BY_ROLE on the client; this is the server-side default. Admin
// can flip any of these off via the Access control screen, persisted in
// data/db.json under `rolePermissions`.
//
// Convention: a missing entry == allowed (defensive default for new screens
// that haven't been recorded in the matrix yet).

import { fileRead, fileWrite } from "./db";

// Every screen that COULD be in any role's nav. Used by the Access control
// screen to render toggles, and as the canonical id list. Keep this in sync
// with NAV_BY_ROLE in components/Sidebar.jsx — but it's defensive: extra ids
// here are harmless, missing ones still default to allowed.
export const ALL_FEATURES = [
  { id: "dashboard",     label: "Dashboard / Home / Today",   group: "Overview" },
  { id: "trust",         label: "Trust overview",             group: "Overview" },
  { id: "schools",       label: "Schools",                    group: "Overview" },
  { id: "money",         label: "Money / Finance",            group: "Money" },
  { id: "fees",          label: "Fees & UPI",                 group: "Money" },
  { id: "students",      label: "Students / My students",     group: "People" },
  { id: "classes",       label: "Classes",                    group: "People" },
  { id: "attendance",    label: "Attendance",                 group: "People" },
  { id: "academic",      label: "Academic / Class tracker",   group: "People" },
  { id: "staff",         label: "Staff",                      group: "People" },
  { id: "transport",     label: "Transport",                  group: "Operations" },
  { id: "inventory",     label: "Inventory",                  group: "Operations" },
  { id: "communication", label: "Communication / Messages",   group: "Operations" },
  { id: "enquiries",     label: "Admissions",                 group: "CRM" },
  { id: "complaints",    label: "Complaints / Raise ticket",  group: "CRM" },
  { id: "donors",        label: "Donors",                     group: "CRM" },
  { id: "users",         label: "Users & Roles",              group: "Governance" },
  { id: "audit",         label: "Audit log",                  group: "Governance" },
  { id: "automation",    label: "Automation",                 group: "Governance" },
  { id: "settings",      label: "Settings",                   group: "Governance" },
  { id: "access",        label: "Access control",             group: "Governance" },
  { id: "tasks",         label: "Tasks / My tasks",           group: "Governance" },
  { id: "tc",            label: "Transfer certificates",      group: "People" },
  { id: "chat",          label: "Parent–Teacher chat",        group: "Operations" },
  { id: "meetings",      label: "Meetings / PTAs",            group: "Operations" },
  { id: "volunteers",    label: "Volunteers",                 group: "CRM" },
  { id: "reports",       label: "Reports & Financials",       group: "Governance" },
];

export const ROLES = ["admin", "academic_director", "principal", "teacher", "parent"];

// "Permanent" features — admin can never lock themselves out of these.
const ADMIN_LOCKED_ON = new Set(["access", "dashboard", "trust", "settings"]);

// Read the matrix from the file store, fill missing entries with `true`.
export function readPermissions() {
  let raw = {};
  try {
    const db = fileRead();
    raw = db.rolePermissions && typeof db.rolePermissions === "object" ? db.rolePermissions : {};
  } catch {}
  const out = {};
  for (const role of ROLES) {
    const roleMap = (raw[role] && typeof raw[role] === "object") ? raw[role] : {};
    out[role] = {};
    for (const f of ALL_FEATURES) {
      // Default true (= allowed). Admin's locked features are forced true.
      if (role === "admin" && ADMIN_LOCKED_ON.has(f.id)) {
        out[role][f.id] = true;
      } else {
        out[role][f.id] = roleMap[f.id] === false ? false : true;
      }
    }
  }
  return out;
}

// Write a partial patch — `{ role: { featureId: bool, ... } }`. Returns the
// merged matrix.
export function writePermissions(patch) {
  if (!patch || typeof patch !== "object") throw new Error("patch must be an object");
  const db = fileRead();
  if (!db.rolePermissions || typeof db.rolePermissions !== "object") db.rolePermissions = {};
  for (const role of Object.keys(patch)) {
    if (!ROLES.includes(role)) continue;
    if (!db.rolePermissions[role]) db.rolePermissions[role] = {};
    const roleMap = patch[role] || {};
    for (const fid of Object.keys(roleMap)) {
      // Block accidental admin lock-out.
      if (role === "admin" && ADMIN_LOCKED_ON.has(fid)) continue;
      db.rolePermissions[role][fid] = !!roleMap[fid];
    }
  }
  fileWrite(db);
  return readPermissions();
}

export function isLockedOn(role, featureId) {
  return role === "admin" && ADMIN_LOCKED_ON.has(featureId);
}
