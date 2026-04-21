// Unified async data API.
// Two backends behind one interface:
//   - Supabase (when NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY/anon key are set)
//   - Local JSON file at data/db.json (zero-config fallback for dev)
//
// All exported helpers are async so callers can await them.

import fs from "fs";
import path from "path";
import {
  supabase, supabaseEnabled,
  toStudent, toPendingFee,
  fromStudent, fromPendingFee, fromRecentFee, fromDailyLog,
  fromAudit, fromActivity, fromComplaint, fromEnquiry, fromRoute,
} from "./supabase.js";

export const BACKEND = supabaseEnabled ? "supabase" : "file";

// ----------------------------------------------------------------------------
// File-store helpers (only used when supabaseEnabled === false)
// ----------------------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const EMPTY_DB = {
  addedStudents: [],
  pendingFees: [],
  recentFees: [],
  complaints: [],
  enquiries: [],
  dailyLogs: [],
  routes: [],
  audit: [],
  activities: [],
};

function fileEnsure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify(EMPTY_DB, null, 2));
}
function fileRead() {
  fileEnsure();
  const raw = fs.readFileSync(DB_PATH, "utf8");
  const data = JSON.parse(raw);
  let touched = false;
  for (const k of Object.keys(EMPTY_DB)) {
    if (!(k in data)) { data[k] = EMPTY_DB[k]; touched = true; }
  }
  if (touched) fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  return data;
}
function fileWrite(data) {
  fileEnsure();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Empty arrays for tables not (yet) backed by Supabase.
const STATIC_EMPTIES = {
  classes: [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }, { n: 6 }, { n: 7 }, { n: 8 }].map(
    (c) => ({ n: c.n, label: `Class ${c.n}`, sections: ["A", "B"], students: 0 })
  ),
  kpis: {
    students: { value: 0, delta: "", deltaDir: "", sub: "" },
    collected: { value: 0, delta: "", deltaDir: "", sub: "" },
    pending: { value: 0, delta: "", deltaDir: "", sub: "" },
    balance: { value: 0, delta: "", deltaDir: "", sub: "" },
    income: { value: 0, delta: "", deltaDir: "", sub: "" },
    expense: { value: 0, delta: "", deltaDir: "", sub: "" },
    staff: { value: 0, delta: "", deltaDir: "", sub: "" },
    interns: { value: 0, delta: "", deltaDir: "", sub: "" },
    complaints: { value: 0, delta: "", deltaDir: "", sub: "" },
    enquiries: { value: 0, delta: "", deltaDir: "", sub: "" },
    transport: { value: "—", delta: "", deltaDir: "", sub: "" },
    donors: { value: 0, delta: "", deltaDir: "", sub: "" },
  },
  trustKpis: {
    students: { value: "0", delta: "", sub: "" },
    collected: { value: "0%", delta: "", sub: "" },
    donations: { value: "₹0", delta: "", sub: "" },
    teacherNPS: { value: "—", delta: "", sub: "" },
  },
  classStrength: [], staff: [], inventory: [], donors: [], incomeSeries: [],
  automations: [], schools: [], anomalies: [], donationPipeline: [],
  compliance: [], aiBrief: [], roles: [
    { k: "super", label: "Super Admin", icon: "shield" },
    { k: "principal", label: "Principal", icon: "school" },
    { k: "teacher", label: "Teacher", icon: "book" },
    { k: "parent", label: "Parent", icon: "heart" },
  ],
  users: [],
};

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

// Helper: query one Supabase table, swallow errors so a missing table or
// unrun migration doesn't crash the whole response. We log a warning so you
// can see what's missing in the server console.
async function safeSelect(table, build) {
  try {
    const q = build(supabase.from(table).select("*"));
    const r = await q;
    if (r.error) {
      console.warn(`[db] ${table}: ${r.error.message}`);
      return [];
    }
    return r.data || [];
  } catch (e) {
    console.warn(`[db] ${table}: ${e.message}`);
    return [];
  }
}

export async function readAllData() {
  if (supabaseEnabled) {
    const [s, pf, rf, cm, eq, dl, rt, al, ac, cls] = await Promise.all([
      safeSelect("students",     (q) => q.order("created_at", { ascending: false })),
      safeSelect("pending_fees", (q) => q.order("created_at", { ascending: false })),
      safeSelect("recent_fees",  (q) => q.order("paid_at",    { ascending: false })),
      safeSelect("complaints",   (q) => q.order("created_at", { ascending: false })),
      safeSelect("enquiries",    (q) => q.order("created_at", { ascending: false })),
      safeSelect("daily_logs",   (q) => q.order("posted_at",  { ascending: false })),
      safeSelect("routes",       (q) => q),
      safeSelect("audit_log",    (q) => q.order("created_at", { ascending: false }).limit(100)),
      safeSelect("activities",   (q) => q.order("created_at", { ascending: false }).limit(50)),
      safeSelect("classes",      (q) => q.order("n",          { ascending: true })),
    ]);
    const allStudents = s.map(fromStudent);
    const liveClasses = cls.map((c) => ({
      n: c.n, label: c.label || `Class ${c.n}`,
      sections: Array.isArray(c.sections) ? c.sections : [],
      students: 0,
    }));
    return {
      ...STATIC_EMPTIES,
      // If the classes table has rows, use them; otherwise fall back to the
      // structural default (Class 1-8 with A/B) so new installs still work.
      classes: liveClasses.length ? liveClasses : STATIC_EMPTIES.classes,
      // Active roster goes to addedStudents; archived ones available separately.
      addedStudents:    allStudents.filter((x) => x.status !== "archived"),
      archivedStudents: allStudents.filter((x) => x.status === "archived"),
      pendingFees:   pf.map(fromPendingFee),
      recentFees:    rf.map(fromRecentFee),
      complaints:    cm.map(fromComplaint),
      enquiries:     eq.map(fromEnquiry),
      dailyLogs:     dl.map(fromDailyLog),
      routes:        rt.map(fromRoute),
      audit:         al.map(fromAudit),
      activities:    ac.map(fromActivity),
    };
  }
  const db = fileRead();
  const all = db.addedStudents || [];
  return {
    ...STATIC_EMPTIES,
    ...db,
    classes: (db.classes && db.classes.length) ? db.classes : STATIC_EMPTIES.classes,
    addedStudents:    all.filter((x) => (x.status ?? "active") !== "archived"),
    archivedStudents: all.filter((x) => x.status === "archived"),
  };
}

// ---------- classes ----------
export async function addClass(row) {
  const n = Number(row.n);
  const label = String(row.label || `Class ${n}`).trim();
  const sections = Array.isArray(row.sections) ? row.sections : [];
  if (!n || Number.isNaN(n) || n < 1) throw new Error("Class number must be a positive integer");
  if (supabaseEnabled) {
    const ins = await supabase.from("classes").insert({ n, label, sections }).select().maybeSingle();
    if (ins.error) throw new Error(ins.error.message);
    return { n, label, sections };
  }
  const db = fileRead();
  if (!Array.isArray(db.classes)) db.classes = [];
  if (db.classes.find((c) => Number(c.n) === n)) throw new Error(`Class ${n} already exists`);
  db.classes.push({ n, label, sections });
  db.classes.sort((a, b) => Number(a.n) - Number(b.n));
  fileWrite(db);
  return { n, label, sections };
}

export async function updateClass(n, patch) {
  const num = Number(n);
  if (supabaseEnabled) {
    const body = {};
    if (typeof patch.label === "string") body.label = patch.label;
    if (Array.isArray(patch.sections)) body.sections = patch.sections;
    const r = await supabase.from("classes").update(body).eq("n", num).select().maybeSingle();
    if (r.error) throw new Error(r.error.message);
    return r.data;
  }
  const db = fileRead();
  const idx = (db.classes || []).findIndex((c) => Number(c.n) === num);
  if (idx === -1) return null;
  db.classes[idx] = { ...db.classes[idx], ...patch };
  fileWrite(db);
  return db.classes[idx];
}

export async function removeClass(n) {
  const num = Number(n);
  if (supabaseEnabled) {
    const r = await supabase.from("classes").delete().eq("n", num);
    if (r.error) throw new Error(r.error.message);
    return true;
  }
  const db = fileRead();
  db.classes = (db.classes || []).filter((c) => Number(c.n) !== num);
  fileWrite(db);
  return true;
}

// ---------- audit + activity (used by other helpers) ----------
export async function logAudit(who, action, entity) {
  const id = "AUD-" + String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
  const whenLabel = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  if (supabaseEnabled) {
    await supabase.from("audit_log").insert({
      id, who, action, entity, when_label: whenLabel, ip: null,
    });
    return { id, who, action, entity, when: whenLabel };
  }
  const db = fileRead();
  const row = { id, who, action, entity, when: whenLabel, ip: "10.0.1.45" };
  db.audit.unshift(row);
  fileWrite(db);
  return row;
}

export async function addActivity(row) {
  if (supabaseEnabled) {
    await supabase.from("activities").insert({
      t: row.t, tone: row.tone, title: row.title, sub: row.sub, ts: row.ts || "now",
    });
    return;
  }
  const db = fileRead();
  db.activities.unshift({ ts: "now", ...row });
  fileWrite(db);
}

// ---------- students ----------
export async function addStudent(row) {
  if (supabaseEnabled) {
    const ins = await supabase.from("students").insert(toStudent(row)).select().single();
    if (ins.error) throw new Error(ins.error.message);
    return fromStudent(ins.data);
  }
  const db = fileRead();
  db.addedStudents.unshift(row);
  fileWrite(db);
  return row;
}

// Soft-delete (archive) a student. Production rule: never lose records.
//   - The student row is kept; status flips to 'archived' and archived_at is set.
//   - Their PAID receipts (recent_fees) and DAILY LOGS are kept forever — they
//     belong to the school's permanent record.
//   - Their PENDING fee is removed because we no longer expect to collect it.
//   - The audit-log "Archived student" row is appended by the API route.
//   - Restore via restoreStudent() simply clears the flag.
export async function archiveStudent(id) {
  if (supabaseEnabled) {
    const sel = await supabase.from("students").select("*").eq("id", id).maybeSingle();
    if (!sel.data) return null;
    if (sel.data.status === "archived") return fromStudent(sel.data);
    await supabase.from("students")
      .update({ status: "archived", archived_at: new Date().toISOString() })
      .eq("id", id);
    await supabase.from("pending_fees").delete().eq("id", id);
    return fromStudent({ ...sel.data, status: "archived" });
  }
  const db = fileRead();
  const idx = db.addedStudents.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  if (db.addedStudents[idx].status === "archived") return db.addedStudents[idx];
  db.addedStudents[idx] = { ...db.addedStudents[idx], status: "archived", archivedAt: new Date().toISOString() };
  db.pendingFees = db.pendingFees.filter((f) => f.id !== id);
  fileWrite(db);
  return db.addedStudents[idx];
}

export async function restoreStudent(id) {
  if (supabaseEnabled) {
    const sel = await supabase.from("students").select("*").eq("id", id).maybeSingle();
    if (!sel.data) return null;
    await supabase.from("students")
      .update({ status: "active", archived_at: null })
      .eq("id", id);
    return fromStudent({ ...sel.data, status: "active" });
  }
  const db = fileRead();
  const idx = db.addedStudents.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  db.addedStudents[idx] = { ...db.addedStudents[idx], status: "active", archivedAt: null };
  fileWrite(db);
  return db.addedStudents[idx];
}

// Backwards-compat alias so any older code paths that still call removeStudent
// archive instead of cascade-deleting.
export const removeStudent = archiveStudent;

// ---------- fees ----------
export async function addPendingFee(row) {
  if (supabaseEnabled) {
    await supabase.from("pending_fees").insert(toPendingFee(row));
    return;
  }
  const db = fileRead();
  db.pendingFees.unshift(row);
  fileWrite(db);
}

export async function payPendingFee(id, method) {
  if (supabaseEnabled) {
    const sel = await supabase.from("pending_fees").select("*").eq("id", id).maybeSingle();
    if (!sel.data) return null;
    const f = sel.data;
    await supabase.from("pending_fees").delete().eq("id", id);
    const paidRow = {
      id: f.id, name: f.name, cls: f.cls, amount: f.amount,
      method, time: "just now", status: "paid",
    };
    await supabase.from("recent_fees").insert(paidRow);
    await supabase.from("students").update({ fee: "paid" }).eq("id", id);
    return paidRow;
  }
  const db = fileRead();
  const idx = db.pendingFees.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  const fee = db.pendingFees[idx];
  db.pendingFees.splice(idx, 1);
  const paid = {
    id: fee.id, name: fee.name, cls: fee.cls, amount: fee.amount,
    method, time: "just now", status: "paid",
  };
  db.recentFees.unshift(paid);
  const sIdx = db.addedStudents.findIndex((s) => s.id === id);
  if (sIdx !== -1) db.addedStudents[sIdx].fee = "paid";
  fileWrite(db);
  return paid;
}

export async function findPendingFeesByIds(ids) {
  if (supabaseEnabled) {
    const r = await supabase.from("pending_fees").select("*").in("id", ids);
    return (r.data || []).map(fromPendingFee);
  }
  const db = fileRead();
  return db.pendingFees.filter((f) => ids.includes(f.id));
}

// ---------- complaints ----------
export async function patchComplaintStatus(id, status) {
  if (supabaseEnabled) {
    const r = await supabase.from("complaints").update({ status }).eq("id", id).select().maybeSingle();
    return r.data ? fromComplaint(r.data) : null;
  }
  const db = fileRead();
  const idx = db.complaints.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  db.complaints[idx] = { ...db.complaints[idx], status };
  fileWrite(db);
  return db.complaints[idx];
}

// ---------- enquiries ----------
export async function patchEnquiryStatus(id, status) {
  if (supabaseEnabled) {
    const r = await supabase.from("enquiries").update({ status }).eq("id", id).select().maybeSingle();
    return r.data ? fromEnquiry(r.data) : null;
  }
  const db = fileRead();
  const idx = db.enquiries.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  db.enquiries[idx] = { ...db.enquiries[idx], status };
  fileWrite(db);
  return db.enquiries[idx];
}

export async function addEnquiry(row) {
  if (supabaseEnabled) {
    const ins = await supabase.from("enquiries").insert(row).select().single();
    if (ins.error) throw new Error(ins.error.message);
    return fromEnquiry(ins.data);
  }
  const db = fileRead();
  db.enquiries.unshift(row);
  fileWrite(db);
  return row;
}

// ---------- transport ----------
export async function setStopBoarding(code, stopName, action) {
  if (supabaseEnabled) {
    const sel = await supabase.from("routes").select("*").eq("code", code).maybeSingle();
    if (!sel.data) return null;
    const route = sel.data;
    const stops = route.stops || [];
    const sIdx = stops.findIndex((s) => s.name === stopName);
    if (sIdx === -1) return null;
    const stop = { ...stops[sIdx] };
    if (action === "board" && stop.boarded + stop.absent < stop.cap) stop.boarded += 1;
    else if (action === "absent") {
      if (stop.boarded + stop.absent < stop.cap) stop.absent += 1;
      else if (stop.boarded > 0) { stop.boarded -= 1; stop.absent += 1; }
    }
    const newStops = [...stops];
    newStops[sIdx] = stop;
    await supabase.from("routes").update({ stops: newStops }).eq("code", code);
    return { ...fromRoute(route), stops: newStops };
  }
  const db = fileRead();
  const route = db.routes.find((r) => r.code === code);
  if (!route) return null;
  const stop = route.stops.find((s) => s.name === stopName);
  if (!stop) return null;
  if (action === "board" && stop.boarded + stop.absent < stop.cap) stop.boarded += 1;
  else if (action === "absent") {
    if (stop.boarded + stop.absent < stop.cap) stop.absent += 1;
    else if (stop.boarded > 0) { stop.boarded -= 1; stop.absent += 1; }
  }
  fileWrite(db);
  return route;
}

// ---------- daily logs ----------
export async function upsertDailyLog(row) {
  const dbRow = {
    student_id: row.studentId, student_name: row.studentName, cls: row.cls,
    date: row.date, classwork: row.classwork, homework: row.homework, topics: row.topics,
    handwriting_note: row.handwritingNote, handwriting_grade: row.handwritingGrade,
    behaviour: row.behaviour, extra: row.extra, posted_by: row.postedBy,
    posted_at: new Date().toISOString(),
  };
  if (supabaseEnabled) {
    const r = await supabase.from("daily_logs")
      .upsert(dbRow, { onConflict: "student_id,date" })
      .select().single();
    if (r.error) throw new Error(r.error.message);
    return { fresh: true, log: fromDailyLog(r.data) };
  }
  const db = fileRead();
  if (!Array.isArray(db.dailyLogs)) db.dailyLogs = [];
  const idx = db.dailyLogs.findIndex((l) => l.studentId === row.studentId && l.date === row.date);
  const fresh = idx === -1;
  const log = {
    studentId: row.studentId, studentName: row.studentName, cls: row.cls,
    date: row.date, classwork: row.classwork, homework: row.homework, topics: row.topics,
    handwritingNote: row.handwritingNote, handwritingGrade: row.handwritingGrade,
    behaviour: row.behaviour, extra: row.extra,
    postedBy: row.postedBy, postedAt: new Date().toISOString(),
  };
  if (fresh) db.dailyLogs.unshift(log); else db.dailyLogs[idx] = log;
  fileWrite(db);
  return { fresh, log };
}
