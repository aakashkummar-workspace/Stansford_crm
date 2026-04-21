// JSON-file-backed datastore with seeded defaults.
// All API routes read/write through this module.

import fs from "fs";
import path from "path";
import * as SEED from "./seed.js";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const SEED_DATA = {
  classes: SEED.CLASSES,
  kpis: SEED.KPIS,
  classStrength: SEED.CLASS_STRENGTH,
  recentFees: SEED.RECENT_FEES,
  pendingFees: SEED.PENDING_FEES,
  activities: SEED.ACTIVITIES,
  routes: SEED.ROUTES,
  complaints: SEED.COMPLAINTS,
  enquiries: SEED.ENQUIRIES,
  inventory: SEED.INVENTORY,
  staff: SEED.STAFF,
  donors: SEED.DONORS,
  incomeSeries: SEED.INCOME_SERIES,
  automations: SEED.AUTOMATIONS,
  schools: SEED.SCHOOLS,
  trustKpis: SEED.TRUST_KPIS,
  anomalies: SEED.ANOMALIES,
  donationPipeline: SEED.DONATION_PIPELINE,
  compliance: SEED.COMPLIANCE,
  aiBrief: SEED.AI_BRIEF,
  roles: SEED.ROLES,
  users: SEED.USERS,
  audit: SEED.AUDIT,
  addedStudents: [],
};

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify(SEED_DATA, null, 2));
}

export function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, "utf8");
  const data = JSON.parse(raw);
  // Top-up missing keys after a schema addition
  let touched = false;
  for (const k of Object.keys(SEED_DATA)) {
    if (!(k in data)) {
      data[k] = SEED_DATA[k];
      touched = true;
    }
  }
  if (touched) fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  return data;
}

export function writeDb(data) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function patch(table, predicate, mutation) {
  const db = readDb();
  const arr = db[table];
  if (!Array.isArray(arr)) throw new Error(`Table ${table} not found or not a list`);
  const idx = arr.findIndex(predicate);
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...mutation };
  writeDb(db);
  return arr[idx];
}

export function append(table, row) {
  const db = readDb();
  if (!Array.isArray(db[table])) db[table] = [];
  db[table].unshift(row);
  writeDb(db);
  return row;
}

export function logAudit(who, action, entity) {
  const db = readDb();
  const id = "AUD-" + String(Math.floor(Math.random() * 1e5)).padStart(5, "0");
  const row = { id, who, action, entity, when: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), ip: "10.0.1.45" };
  db.audit.unshift(row);
  writeDb(db);
  return row;
}
