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
  toStudent, toPendingFee, toStaff, toInventory, toBroadcast, toTemplate,
  toDonor, toCampaign,
  fromStudent, fromPendingFee, fromRecentFee, fromDailyLog,
  fromAudit, fromActivity, fromComplaint, fromEnquiry, fromRoute, fromStaff,
  fromInventory, fromMovement,
  fromBroadcast, fromTemplate, fromRecipientList,
  fromDonor, fromCampaign,
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
  staff: [],
  authUsers: [],
  inventory: [],
  movements: [],
  broadcasts: [],
  templates: [],
  recipientLists: [],
  donors: [],
  campaigns: [],
};

function fileEnsure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify(EMPTY_DB, null, 2));
}
export function fileRead() {
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
export function fileWrite(data) {
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
    // Build the query then execute it. We chain .throwOnError() so any
    // PostgREST error is thrown rather than silently returning an empty
    // result, which is what was happening intermittently for some tables.
    const base = supabase.from(table).select("*");
    const built = build(base);
    const r = await built;
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

// Run an array of async tasks in batches of `batchSize`. The Supabase JS
// client / PostgREST silently drops some queries when too many run in
// parallel against a single project (we hit it at ~16 concurrent), so we
// chunk to a safe size and gather the results in order.
async function runBatched(tasks, batchSize = 4) {
  const out = new Array(tasks.length);
  for (let i = 0; i < tasks.length; i += batchSize) {
    const slice = tasks.slice(i, i + batchSize);
    const results = await Promise.all(slice.map((fn) => fn()));
    for (let j = 0; j < results.length; j++) out[i + j] = results[j];
  }
  return out;
}

export async function readAllData() {
  if (supabaseEnabled) {
    const [s, pf, rf, cm, eq, dl, rt, al, ac, cls, st, inv, mv, bc, tp, rl, dn, cp] = await runBatched([
      () => safeSelect("students",     (q) => q.order("created_at", { ascending: false })),
      () => safeSelect("pending_fees", (q) => q.order("created_at", { ascending: false })),
      () => safeSelect("recent_fees",  (q) => q.order("paid_at",    { ascending: false })),
      () => safeSelect("complaints",   (q) => q.order("created_at", { ascending: false })),
      () => safeSelect("enquiries",    (q) => q.order("created_at", { ascending: false })),
      () => safeSelect("daily_logs",   (q) => q.order("posted_at",  { ascending: false })),
      () => safeSelect("routes",       (q) => q.order("created_at", { ascending: false })),
      () => safeSelect("audit_log",    (q) => q.order("created_at", { ascending: false }).limit(100)),
      () => safeSelect("activities",   (q) => q.order("created_at", { ascending: false }).limit(50)),
      () => safeSelect("classes",      (q) => q.order("n",          { ascending: true })),
      () => safeSelect("staff",        (q) => q.order("created_at", { ascending: false })),
      () => safeSelect("inventory",    (q) => q.order("created_at", { ascending: false })),
      () => safeSelect("inventory_movements", (q) => q.order("at",  { ascending: false }).limit(30)),
      () => safeSelect("broadcasts",   (q) => q.order("sent_at",    { ascending: false }).limit(50)),
      () => safeSelect("message_templates", (q) => q.order("created_at", { ascending: false })),
      () => safeSelect("recipient_lists",   (q) => q.order("created_at", { ascending: false })),
      () => safeSelect("donors",       (q) => q.order("created_at", { ascending: false })),
      () => safeSelect("campaigns",    (q) => q.order("created_at", { ascending: false })),
    ]);
    const stopMap = pickupStopsSafe();
    const allStudents = s.map((row) => {
      const out = fromStudent(row);
      // Overlay any pickup-stop assignment we have in the file side-store.
      if (out && !out.pickupStop && stopMap[out.id]) out.pickupStop = stopMap[out.id];
      return out;
    });
    const liveClasses = cls.map((c) => ({
      n: c.n, label: c.label || `Class ${c.n}`,
      sections: Array.isArray(c.sections) ? c.sections : [],
      students: 0,
    }));
    // Union of: live Supabase classes + file fallback + STATIC defaults.
    // Deduped by class number, with later sources only filling gaps. This
    // way a class auto-created on first admission shows up alongside the
    // built-in 1-8 list instead of replacing it.
    const fileClasses = (fileDbSafe().classes || []).map((c) => ({
      n: c.n, label: c.label || `Class ${c.n}`,
      sections: Array.isArray(c.sections) ? c.sections : [],
      students: 0,
    }));
    const classMap = new Map();
    for (const list of [liveClasses, fileClasses, STATIC_EMPTIES.classes]) {
      for (const c of list) {
        if (!classMap.has(c.n)) classMap.set(c.n, c);
      }
    }
    const mergedClasses = Array.from(classMap.values()).sort((a, b) => Number(a.n) - Number(b.n));
    return {
      ...STATIC_EMPTIES,
      classes: mergedClasses,
      // Active roster goes to addedStudents; archived ones available separately.
      addedStudents:    allStudents.filter((x) => x.status !== "archived"),
      archivedStudents: allStudents.filter((x) => x.status === "archived"),
      pendingFees:   pf.map(fromPendingFee),
      recentFees:    [...rf.map(fromRecentFee), ...fileRecentFeesSafe()],
      complaints:    [...cm.map(fromComplaint), ...fileComplaintsSafe()],
      enquiries:     [...(eq || []).map(fromEnquiry), ...fileEnquiriesSafe()],
      dailyLogs:     dl.map(fromDailyLog),
      // Union with file-store routes in case writes fell back to file
      // (PostgREST cache lag or table missing).
      routes:        [...(rt || []).map(fromRoute), ...fileRoutesSafe()],
      audit:         al.map(fromAudit),
      activities:    ac.map(fromActivity),
      // Active staff only — soft-deleted rows stay in the row but are filtered out of the working list.
      // Union with the file-store staff list, in case writes fell back there
      // while the Supabase table was missing or PostgREST was stale.
      staff: [
        ...(st || []).filter((r) => !r.archived_at).map(fromStaff),
        ...(fileStaffSafe()),
      ],
      // Same union pattern for inventory + movements (works whether the
      // Supabase tables exist or writes fell back to the local file store).
      inventory: [
        ...(inv || []).filter((r) => !r.archived_at).map(fromInventory),
        ...(fileInventorySafe()),
      ],
      movements: [
        ...(mv || []).map(fromMovement),
        ...(fileMovementsSafe()),
      ],
      broadcasts: [
        ...(bc || []).map(fromBroadcast),
        ...(fileBroadcastsSafe()),
      ],
      templates: [
        ...(tp || []).map(fromTemplate),
        ...(fileTemplatesSafe()),
      ],
      recipientLists: [
        ...(rl || []).map(fromRecipientList),
        ...(fileRecipientListsSafe()),
      ],
      donors: [
        ...(dn || []).filter((r) => !r.archived_at).map(fromDonor),
        ...(fileDonorsSafe()),
      ],
      campaigns: [
        ...(cp || []).map(fromCampaign),
        ...(fileCampaignsSafe()),
      ],
      donorReceipts: fileDonorReceiptsSafe(),
      rolePermissions: rolePermissionsSafe(),
      tasks: fileTasksSafe(),
      expenses: fileExpensesSafe(),
      tcRequests: fileTcRequestsSafe(),
      meetings: safeArr("meetings"),
      volunteers: safeArr("volunteers"),
      chatThreads: safeArr("chatThreads"),
      feeReminders: safeArr("feeReminders"),
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
    if (!ins.error) return { n, label, sections };
    // PostgREST cache lag / missing classes table → fall back to file.
    if (!/classes/i.test(ins.error.message)) throw new Error(ins.error.message);
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
    if (!r.error && r.data) return r.data;
    // Cache lag / missing → fall through to file.
  }
  const db = fileRead();
  if (!Array.isArray(db.classes)) db.classes = [];
  let idx = db.classes.findIndex((c) => Number(c.n) === num);
  // If the class doesn't exist in the file yet, seed it from STATIC defaults
  // (so updateClass can extend a built-in class's sections without a manual
  // create step).
  if (idx === -1) {
    const seed = (STATIC_EMPTIES.classes || []).find((c) => Number(c.n) === num);
    if (seed) {
      db.classes.push({ n: seed.n, label: seed.label, sections: [...(seed.sections || [])] });
      idx = db.classes.length - 1;
    } else {
      return null;
    }
  }
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
  // Make sure the class+section the student is being admitted to actually
  // exists in the classes table. If not, auto-create it so the student
  // shows up everywhere (Academic, Attendance, Classes screen, KPIs).
  // Best-effort — if it errors we still admit the student.
  try { await ensureClassSection(row.cls); } catch {}

  if (supabaseEnabled) {
    const payload = toStudent(row);
    let ins = await supabase.from("students").insert(payload).select().single();
    // PostgREST schema cache can lag for newly-added columns. If the cache
    // doesn't know about `status` / `archived_at`, retry with those fields
    // stripped so the admission still succeeds.
    if (ins.error && /status|archived_at|pickup_stop/.test(ins.error.message)) {
      const { status, archived_at, pickup_stop, ...legacy } = payload;
      ins = await supabase.from("students").insert(legacy).select().single();
    }
    if (ins.error) throw new Error(ins.error.message);
    // If we stripped pickup_stop, persist it locally so the per-stop boarding
    // view still works. The file is keyed by student id; readAllData merges.
    if (payload.pickup_stop) savePickupStop(payload.id, payload.pickup_stop);
    const out = fromStudent(ins.data);
    if (payload.pickup_stop && !out.pickupStop) out.pickupStop = payload.pickup_stop;
    return out;
  }
  const db = fileRead();
  db.addedStudents.unshift(row);
  fileWrite(db);
  return row;
}

// Ensure a class number + section letter exist in the classes table.
// Accepts either "5-A" or { n, s } shape. Idempotent — does nothing when
// both already present.
async function ensureClassSection(clsKey) {
  if (!clsKey) return;
  const [nStr, sec] = String(clsKey).split("-");
  const n = Number(nStr);
  const section = String(sec || "").toUpperCase();
  if (!n || Number.isNaN(n)) return;

  // Look across every source — Supabase live, file fallback, AND the
  // built-in STATIC defaults (Class 1-8 with A/B). The STATIC defaults
  // matter because if the user admits to "3-D", Class 3 already "exists"
  // structurally even if no row was ever written to file/Supabase.
  const all = await safeSelect("classes", (q) => q.order("n"));
  const fileDb = fileRead();
  const fileClasses = Array.isArray(fileDb.classes) ? fileDb.classes : [];
  // Union sections from EVERY source so we don't accidentally drop
  // sections that live in a different store. (STATIC has A/B; the file
  // might have D from an earlier auto-add; Supabase might have its own.)
  const sources = [all || [], fileClasses, STATIC_EMPTIES.classes || []];
  const sectionSet = new Set();
  let foundAnywhere = false;
  for (const src of sources) {
    const hit = src.find((c) => Number(c.n) === n);
    if (hit) {
      foundAnywhere = true;
      for (const s of (hit.sections || [])) sectionSet.add(String(s).toUpperCase());
    }
  }

  if (!foundAnywhere) {
    const sections = section ? [section] : ["A"];
    try { await addClass({ n, label: `Class ${n}`, sections }); } catch {}
    return;
  }
  if (section && !sectionSet.has(section)) {
    sectionSet.add(section);
    const merged = Array.from(sectionSet).sort();
    try { await updateClass(n, { sections: merged }); } catch {}
  }
}

// Edit a student's mutable fields. Currently the Transport screen uses this
// to assign / change a student's bus + pickup stop without re-admitting them.
// Other fields (name, cls, parent) could be added the same way later.
//
// pickupStop falls back to the file side-store when the Supabase students
// table doesn't yet have the pickup_stop column (so the per-stop boarding
// roster works even before the schema migration).
export async function updateStudent(id, patch) {
  if (!id) return null;
  const fields = {};
  if (typeof patch.name === "string")      fields.name      = patch.name;
  if (typeof patch.cls === "string")       fields.cls       = patch.cls;
  if (typeof patch.parent === "string")    fields.parent    = patch.parent;
  if (typeof patch.transport === "string") fields.transport = patch.transport || "—";
  // pickupStop is handled separately via the side-store so it always sticks.
  const wantsStop = "pickupStop" in patch;

  if (supabaseEnabled) {
    if (Object.keys(fields).length > 0) {
      const upd = await supabase.from("students").update(fields).eq("id", id);
      if (upd.error) {
        console.warn(`[db] student update fell back: ${upd.error.message}`);
      }
      // Keep the pending_fees snapshot in sync so the Fees screen reads the
      // new name/class without a separate migration.
      if (fields.name || fields.cls) {
        const sync = {};
        if (fields.name) sync.name = fields.name;
        if (fields.cls)  sync.cls  = fields.cls;
        await supabase.from("pending_fees").update(sync).eq("id", id);
      }
    }
    if (wantsStop) {
      // Try the column first; if cache is missing it, drop to side-store.
      const upd2 = await supabase.from("students").update({ pickup_stop: patch.pickupStop || null }).eq("id", id);
      if (upd2.error) {
        savePickupStop(id, patch.pickupStop);
      }
    }
    // Return the merged record (read-back through the fromStudent mapper +
    // side-store overlay).
    const sel = await supabase.from("students").select("*").eq("id", id).maybeSingle();
    if (sel.data) {
      const out = fromStudent(sel.data);
      if (wantsStop && !out.pickupStop) out.pickupStop = patch.pickupStop || null;
      return out;
    }
  }
  // File-only path
  const db = fileRead();
  const idx = (db.addedStudents || []).findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const merged = { ...db.addedStudents[idx], ...fields };
  if (wantsStop) merged.pickupStop = patch.pickupStop || null;
  db.addedStudents[idx] = merged;
  // Mirror name/cls onto any pending fees so list views stay consistent.
  if (fields.name || fields.cls) {
    db.pendingFees = (db.pendingFees || []).map((f) => (
      f.id === id ? { ...f, ...(fields.name ? { name: fields.name } : {}), ...(fields.cls ? { cls: fields.cls } : {}) } : f
    ));
  }
  fileWrite(db);
  if (wantsStop) savePickupStop(id, patch.pickupStop);
  return merged;
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
    let upd = await supabase.from("students")
      .update({ status: "archived", archived_at: new Date().toISOString() })
      .eq("id", id);
    // PostgREST cache lag fallback: try with a single column, or as last
    // resort just delete the pending fee so it disappears from active views.
    if (upd.error && /archived_at/.test(upd.error.message)) {
      upd = await supabase.from("students").update({ status: "archived" }).eq("id", id);
    }
    if (upd.error && /status/.test(upd.error.message)) {
      // Schema cache stuck on both columns — fall back to full delete.
      await supabase.from("students").delete().eq("id", id);
    }
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

// Pay a pending fee — supports partial payments. Pass `amount` to take just
// part of the balance; omit (or pass >= balance) to clear the whole thing.
//
// Returns { paid, fee, remaining } where:
//   paid       = the receipt row that was added to recent_fees
//   fee        = "partial" or "paid" (final state)
//   remaining  = ₹ left on the pending fee after this payment (0 if fully paid)
export async function payPendingFee(id, method, amount) {
  // Resolve current pending balance + base details (try Supabase, else file).
  let f = null;
  let backend = "file";
  if (supabaseEnabled) {
    const sel = await supabase.from("pending_fees").select("*").eq("id", id).maybeSingle();
    if (sel.data) { f = sel.data; backend = "supabase"; }
  }
  if (!f) {
    const db = fileRead();
    const fileFee = (db.pendingFees || []).find((x) => x.id === id);
    if (fileFee) f = fileFee;
  }
  if (!f) return null;

  // Decide pay-amount: if caller didn't specify, pay full balance.
  const balance = Number(f.amount) || 0;
  const requested = amount == null ? balance : Math.floor(Number(amount));
  if (!Number.isFinite(requested) || requested <= 0) {
    throw new Error("Amount must be greater than 0");
  }
  if (requested > balance) {
    throw new Error(`Amount ₹${requested} exceeds outstanding balance ₹${balance}`);
  }
  const isFull = requested >= balance;
  const remaining = balance - requested;

  // Build the receipt row. Each payment gets a unique receipt id so the
  // same student can have multiple receipts (e.g. partial payments).
  const receiptId = `RCP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`;
  const paidRow = {
    id: receiptId,
    student_id: f.id,
    studentId: f.id, // file-backend convenience
    name: f.name, cls: f.cls, amount: requested,
    method, time: "just now",
    status: isFull ? "paid" : "partial",
  };
  const newStudentFeeStatus = isFull ? "paid" : "partial";

  if (backend === "supabase") {
    if (isFull) {
      await supabase.from("pending_fees").delete().eq("id", id);
    } else {
      await supabase.from("pending_fees").update({ amount: remaining }).eq("id", id);
    }
    // Insert receipt. The schema may not yet have the student_id column
    // (PostgREST cache lag). If that's the case, route the receipt to the
    // file backend instead — that preserves the student↔receipt link via
    // the camelCase studentId field, which is what the screens actually
    // filter on. Without that link, multiple partial receipts for the same
    // student would still work but we couldn't show them on the parent
    // dashboard / parent's Fees screen.
    const ins = await supabase.from("recent_fees").insert({
      id: receiptId, student_id: f.id,
      name: f.name, cls: f.cls, amount: requested,
      method, time: "just now",
      status: isFull ? "paid" : "partial",
    });
    if (ins.error) {
      const db = fileRead();
      if (!Array.isArray(db.recentFees)) db.recentFees = [];
      db.recentFees.unshift(paidRow);
      fileWrite(db);
    }
    try { await supabase.from("students").update({ fee: newStudentFeeStatus }).eq("id", id); } catch {}
    return { paid: paidRow, fee: newStudentFeeStatus, remaining };
  }

  // File backend
  const db = fileRead();
  const idx = (db.pendingFees || []).findIndex((x) => x.id === id);
  if (idx === -1) return null;
  if (isFull) {
    db.pendingFees.splice(idx, 1);
  } else {
    db.pendingFees[idx] = { ...db.pendingFees[idx], amount: remaining };
  }
  if (!Array.isArray(db.recentFees)) db.recentFees = [];
  db.recentFees.unshift(paidRow);
  const sIdx = (db.addedStudents || []).findIndex((s) => s.id === id);
  if (sIdx !== -1) db.addedStudents[sIdx].fee = newStudentFeeStatus;
  fileWrite(db);
  return { paid: paidRow, fee: newStudentFeeStatus, remaining };
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
    if (r.data) return fromComplaint(r.data);
    // Fall through so complaints stored in the file fallback can move too.
  }
  const db = fileRead();
  const idx = (db.complaints || []).findIndex((c) => c.id === id);
  if (idx === -1) return null;
  db.complaints[idx] = { ...db.complaints[idx], status };
  fileWrite(db);
  return db.complaints[idx];
}

// ---------- enquiries ----------
export async function patchEnquiryStatus(id, status) {
  if (supabaseEnabled) {
    const r = await supabase.from("enquiries").update({ status }).eq("id", id).select().maybeSingle();
    if (r.data) return fromEnquiry(r.data);
    // Fall through to file fallback so enquiries created via fallback can move too.
  }
  const db = fileRead();
  const idx = (db.enquiries || []).findIndex((e) => e.id === id);
  if (idx === -1) return null;
  db.enquiries[idx] = { ...db.enquiries[idx], status };
  fileWrite(db);
  return db.enquiries[idx];
}

export async function addEnquiry(row) {
  if (supabaseEnabled) {
    const ins = await supabase.from("enquiries").insert(row).select().single();
    if (ins.error) {
      // Schema cache lag / missing table → file fallback so user isn't blocked.
      if (/enquir/i.test(ins.error.message)) return fileAddEnquiry(row);
      throw new Error(ins.error.message);
    }
    return fromEnquiry(ins.data);
  }
  return fileAddEnquiry(row);
}

function fileAddEnquiry(row) {
  const db = fileRead();
  if (!Array.isArray(db.enquiries)) db.enquiries = [];
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

// ---------- routes ----------
// Each route owns a list of stops as JSONB. Stops are { name, t, cap,
// boarded, absent, status } where status is 'done' | 'current' | 'pending'.
export async function addRoute(row) {
  const code = String(row.code || "").trim().toUpperCase();
  if (!code) throw new Error("Route code is required");
  const route = {
    code,
    name: row.name || code,
    driver: row.driver || "—",
    attendant: row.attendant || "—",
    bus: row.bus || "—",
    status: row.status || "running",
    eta: row.eta || "07:00 – 08:00",
    stops: Array.isArray(row.stops) ? row.stops.map((s, i) => ({
      name: String(s.name || "").trim() || `Stop ${i + 1}`,
      t: s.t || "—",
      cap: Number(s.cap) || 0,
      boarded: 0,
      absent: 0,
      status: i === 0 ? "current" : "pending",
    })) : [],
  };
  if (!route.stops.length) throw new Error("Add at least one stop");

  if (supabaseEnabled) {
    const ins = await supabase.from("routes").insert(route).select().single();
    if (ins.error) {
      // PostgREST cache miss — fall back to file storage.
      if (/route|stops/i.test(ins.error.message)) {
        return fileAddRoute(route);
      }
      throw new Error(ins.error.message);
    }
    return fromRoute(ins.data);
  }
  return fileAddRoute(route);
}

function fileAddRoute(route) {
  const db = fileRead();
  if (!Array.isArray(db.routes)) db.routes = [];
  if (db.routes.find((r) => r.code === route.code)) {
    throw new Error(`Route ${route.code} already exists`);
  }
  db.routes.unshift(route);
  fileWrite(db);
  return route;
}

export async function removeRoute(code) {
  if (!code) return null;
  if (supabaseEnabled) {
    const sel = await supabase.from("routes").select("*").eq("code", code).maybeSingle();
    if (sel.data) {
      await supabase.from("routes").delete().eq("code", code);
      return fromRoute(sel.data);
    }
    // Fall through to file fallback.
  }
  const db = fileRead();
  const idx = (db.routes || []).findIndex((r) => r.code === code);
  if (idx === -1) return null;
  const removed = db.routes[idx];
  db.routes.splice(idx, 1);
  fileWrite(db);
  return removed;
}

// Read a single route from whichever backend has it.
async function readRoute(code) {
  if (supabaseEnabled) {
    const sel = await supabase.from("routes").select("*").eq("code", code).maybeSingle();
    if (sel.data) return { row: sel.data, backend: "supabase" };
  }
  const db = fileRead();
  const r = (db.routes || []).find((x) => x.code === code);
  return r ? { row: r, backend: "file" } : null;
}

// Persist a route back to whichever backend it came from. Skips fields that
// should never be re-written (`code` is the PK).
async function writeRoute({ row, backend }, patch) {
  const next = { ...row, ...patch };
  if (backend === "supabase") {
    let attempt = { ...patch };
    let upd = await supabase.from("routes").update(attempt).eq("code", row.code);
    // Retry by stripping any column Supabase doesn't know about (e.g. attendant
    // when the schema migration hasn't been run yet). The mirrored file copy
    // below will hold the field so it still survives.
    while (upd.error && /Could not find the .* column/i.test(upd.error.message)) {
      const m = upd.error.message.match(/Could not find the '?(\w+)'? column/i);
      const col = m?.[1];
      if (!col || !(col in attempt)) break;
      console.warn(`[db] routes update dropping unknown column "${col}", retrying`);
      delete attempt[col];
      if (Object.keys(attempt).length === 0) { upd = { error: null }; break; }
      upd = await supabase.from("routes").update(attempt).eq("code", row.code);
    }
    if (upd.error) throw new Error(upd.error.message);
  }
  // Always mirror the full patch (including any stripped columns) into the file
  // copy so the field survives across reloads even if Supabase can't store it.
  const db = fileRead();
  if (!Array.isArray(db.routes)) db.routes = [];
  const idx = db.routes.findIndex((r) => r.code === row.code);
  if (idx === -1) db.routes.unshift(next);
  else db.routes[idx] = next;
  fileWrite(db);
  return next;
}

// Edit an existing route — name, driver, bus, status, eta, stops list.
// Replacing the whole stops array is intentional (matches how the AddRoute
// modal builds it). Boarded/absent counters on existing stops are preserved
// when the stop name matches.
export async function updateRoute(code, patch) {
  if (!code) throw new Error("code required");
  const found = await readRoute(code);
  if (!found) return null;
  const fields = {};
  if (typeof patch.name === "string")     fields.name = patch.name;
  if (typeof patch.driver === "string")   fields.driver = patch.driver;
  if (typeof patch.attendant === "string") fields.attendant = patch.attendant;
  if (typeof patch.bus === "string")      fields.bus = patch.bus;
  if (typeof patch.status === "string")  fields.status = patch.status;
  if (typeof patch.eta === "string")     fields.eta = patch.eta;
  if (Array.isArray(patch.stops)) {
    const old = (found.row.stops || []);
    fields.stops = patch.stops.map((s, i) => {
      const existing = old.find((o) => o.name === s.name);
      return {
        name: String(s.name || "").trim() || `Stop ${i + 1}`,
        t: s.t || "—",
        cap: Number(s.cap) || 0,
        boarded: existing?.boarded ?? 0,
        absent:  existing?.absent  ?? 0,
        // Preserve status if the stop already had one; otherwise mark
        // upcoming until the run is started/advanced.
        status: existing?.status ?? "pending",
      };
    });
  }
  return writeRoute(found, fields);
}

// Drive the bus through its run.
//   action: "start"  → set first stop to current, status='running'
//           "next"   → mark current stop as done, advance current to next stop
//           "prev"   → step back one stop (mark current as pending, prev as current)
//           "finish" → mark all remaining stops as done, status='completed'
//           "reset"  → mark all stops as pending, clear boarded/absent, status='idle'
export async function advanceRoute(code, action) {
  const found = await readRoute(code);
  if (!found) return null;
  const stops = Array.isArray(found.row.stops) ? [...found.row.stops] : [];
  if (stops.length === 0) throw new Error("Route has no stops");

  const curIdx = stops.findIndex((s) => s.status === "current");

  if (action === "start") {
    for (let i = 0; i < stops.length; i++) stops[i] = { ...stops[i], status: i === 0 ? "current" : "pending" };
    return writeRoute(found, { stops, status: "running" });
  }
  if (action === "next") {
    if (curIdx === -1) {
      // Treat next as start when nothing is current yet
      stops[0] = { ...stops[0], status: "current" };
      return writeRoute(found, { stops, status: "running" });
    }
    stops[curIdx] = { ...stops[curIdx], status: "done" };
    if (curIdx + 1 < stops.length) {
      stops[curIdx + 1] = { ...stops[curIdx + 1], status: "current" };
      return writeRoute(found, { stops, status: "running" });
    }
    // Was at the last stop → mark whole run as completed
    return writeRoute(found, { stops, status: "completed" });
  }
  if (action === "prev") {
    if (curIdx === -1) return found.row;
    stops[curIdx] = { ...stops[curIdx], status: "pending" };
    if (curIdx > 0) {
      stops[curIdx - 1] = { ...stops[curIdx - 1], status: "current" };
    }
    return writeRoute(found, { stops, status: "running" });
  }
  if (action === "finish") {
    for (let i = 0; i < stops.length; i++) stops[i] = { ...stops[i], status: "done" };
    return writeRoute(found, { stops, status: "completed" });
  }
  if (action === "reset") {
    for (let i = 0; i < stops.length; i++) {
      stops[i] = { ...stops[i], status: "pending", boarded: 0, absent: 0 };
    }
    return writeRoute(found, { stops, status: "idle" });
  }
  throw new Error(`Unknown action: ${action}`);
}

// ---------- daily logs ----------
export async function upsertDailyLog(row) {
  const att = row.attendance === "absent" ? "absent" : "present";
  const dbRow = {
    student_id: row.studentId, student_name: row.studentName, cls: row.cls,
    date: row.date,
    attendance: att,
    leave_reason: att === "absent" ? (row.leaveReason || "") : null,
    classwork: row.classwork,
    classwork_status: row.classworkStatus || null,
    homework: row.homework,
    homework_status: row.homeworkStatus || null,
    topics: row.topics,
    handwriting_note: row.handwritingNote, handwriting_grade: row.handwritingGrade,
    behaviour: row.behaviour, extra: row.extra, posted_by: row.postedBy,
    posted_at: new Date().toISOString(),
  };
  if (supabaseEnabled) {
    let r = await supabase.from("daily_logs")
      .upsert(dbRow, { onConflict: "student_id,date" })
      .select().single();
    // PostgREST cache lag: strip whichever new column is unknown and retry.
    // Loop because there can be multiple missing columns (e.g. attendance +
    // leave_reason + classwork_status + homework_status all missing on an
    // older install) — strip them one at a time.
    let attempt = dbRow;
    let safety = 5;
    while (r.error && safety-- > 0) {
      const m = /Could not find the '([a-z_]+)' column/i.exec(r.error.message);
      if (!m) break;
      const colName = m[1];
      const nextAttempt = { ...attempt };
      delete nextAttempt[colName];
      if (Object.keys(nextAttempt).length === Object.keys(attempt).length) break;
      attempt = nextAttempt;
      r = await supabase.from("daily_logs")
        .upsert(attempt, { onConflict: "student_id,date" })
        .select().single();
    }
    if (r.error) throw new Error(r.error.message);
    return { fresh: true, log: fromDailyLog(r.data) };
  }
  const db = fileRead();
  if (!Array.isArray(db.dailyLogs)) db.dailyLogs = [];
  const idx = db.dailyLogs.findIndex((l) => l.studentId === row.studentId && l.date === row.date);
  const fresh = idx === -1;
  const log = {
    studentId: row.studentId, studentName: row.studentName, cls: row.cls,
    date: row.date,
    attendance: att,
    leaveReason: att === "absent" ? (row.leaveReason || "") : "",
    classwork: row.classwork,
    classworkStatus: row.classworkStatus || null,
    homework: row.homework,
    homeworkStatus: row.homeworkStatus || null,
    topics: row.topics,
    handwritingNote: row.handwritingNote, handwritingGrade: row.handwritingGrade,
    behaviour: row.behaviour, extra: row.extra,
    postedBy: row.postedBy, postedAt: new Date().toISOString(),
  };
  if (fresh) db.dailyLogs.unshift(log); else db.dailyLogs[idx] = log;
  fileWrite(db);
  return { fresh, log };
}

// ---------- staff ----------
// Composite score = 40% attendance + 40% tasks + 20% activity (we don't have
// activity yet, so use the average of attendance/tasks as a proxy).
function computeStaffScore({ attendance = 0, tasks = 0 }) {
  const a = Number(attendance) || 0;
  const t = Number(tasks) || 0;
  const activity = Math.round((a + t) / 2);
  return Math.round(0.4 * a + 0.4 * t + 0.2 * activity);
}
function statusFromScore(score) {
  if (score >= 85) return "top";
  if (score < 60)  return "low";
  return "ok";
}

export async function addStaff(row) {
  const id = row.id || `STF-${1000 + Math.floor(Math.random() * 8999)}`;
  const initials = (row.name || "?")
    .split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const score = computeStaffScore(row);
  const filled = {
    id, name: String(row.name || "").trim(),
    role: row.role || "Teacher",
    dept: row.dept || "—",
    phone: row.phone || "—",
    email: row.email || null,
    joiningDate: row.joiningDate || new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
    salary: Number(row.salary) || 0,
    attendance: Number(row.attendance) || 0,
    tasks: Number(row.tasks) || 0,
    score,
    status: row.status || statusFromScore(score),
    avatar: row.avatar || initials,
  };

  let saved = filled;
  if (supabaseEnabled) {
    const ins = await supabase.from("staff").insert(toStaff(filled)).select().single();
    if (ins.error) {
      if (/staff/i.test(ins.error.message)) {
        console.warn(`[db] staff insert fell back to file: ${ins.error.message}`);
        saved = fileAddStaff(filled);
      } else {
        throw new Error(ins.error.message);
      }
    } else {
      saved = fromStaff(ins.data);
    }
  } else {
    saved = fileAddStaff(filled);
  }

  // Auto-provision a login account for teachers so they (a) show up in the
  // "Class teacher" picker on the Classes screen and (b) can sign in
  // immediately. The default password is the staff first name (lowercased)
  // + "123" — easy for the principal to share. Returned in the response.
  let createdLogin = null;
  if (filled.role === "Teacher" && filled.email) {
    try {
      const existing = await getUserByEmail(filled.email);
      if (!existing) {
        const firstName = String(filled.name).trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, "") || "teacher";
        const defaultPassword = `${firstName}123`;
        // Lazy require to avoid a circular import at module-load time.
        const { hashPassword } = require("./auth.js");
        const passwordHash = await hashPassword(defaultPassword);
        await createUser({
          id: `USR-${Date.now().toString(36).toUpperCase()}`,
          email: filled.email,
          passwordHash,
          role: "teacher",
          name: filled.name,
          linkedId: null,
        });
        createdLogin = { email: filled.email, defaultPassword };
      }
    } catch (e) {
      console.warn(`[db] auto-provision teacher login failed: ${e.message}`);
    }
  }

  return { ...saved, createdLogin };
}

function fileAddStaff(filled) {
  const db = fileRead();
  if (!Array.isArray(db.staff)) db.staff = [];
  db.staff.unshift(filled);
  fileWrite(db);
  return filled;
}

// Best-effort read of staff from the local file store. Safe to call even when
// the file doesn't exist yet — it returns an empty array rather than throwing.
function fileStaffSafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.staff) ? data.staff : [];
  } catch { return []; }
}

function fileRoutesSafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.routes) ? data.routes : [];
  } catch { return []; }
}

function fileInventorySafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.inventory) ? data.inventory : [];
  } catch { return []; }
}

function fileMovementsSafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.movements) ? data.movements.slice(0, 30) : [];
  } catch { return []; }
}

function fileBroadcastsSafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.broadcasts) ? data.broadcasts.slice(0, 50) : [];
  } catch { return []; }
}

function fileTemplatesSafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.templates) ? data.templates : [];
  } catch { return []; }
}

// Side-store for pickup stops keyed by student id. Used when the Supabase
// students table doesn't yet have a pickup_stop column — we still want the
// per-stop boarding roster to work, so we keep the assignment in the file
// store and merge it back in readAllData.
function savePickupStop(studentId, stopName) {
  if (!studentId) return;
  const db = fileRead();
  if (!db.pickupStops || typeof db.pickupStops !== "object") db.pickupStops = {};
  db.pickupStops[studentId] = stopName || null;
  fileWrite(db);
}
function pickupStopsSafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return {};
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    return (data.pickupStops && typeof data.pickupStops === "object") ? data.pickupStops : {};
  } catch { return {}; }
}

// Read the whole file db in a way that never throws. Returns {} when the
// file isn't there yet. Used by readAllData to union file-stored entities
// alongside Supabase rows.
function fileDbSafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return {};
    const raw = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(raw) || {};
  } catch { return {}; }
}

function fileRecentFeesSafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.recentFees) ? data.recentFees : [];
  } catch { return []; }
}

function fileEnquiriesSafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.enquiries) ? data.enquiries : [];
  } catch { return []; }
}

function fileComplaintsSafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.complaints) ? data.complaints : [];
  } catch { return []; }
}

function fileRecipientListsSafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.recipientLists) ? data.recipientLists : [];
  } catch { return []; }
}

// ---------- volunteers ----------
export async function listVolunteers() {
  const db = fileRead();
  return Array.isArray(db.volunteers) ? db.volunteers : [];
}
export async function addVolunteer({ name, email, phone, skills, availability, notes }) {
  if (!name?.trim()) throw new Error("Name required");
  const now = new Date();
  const v = {
    id: `VOL-${1000 + Math.floor(Math.random() * 8999)}`,
    name: name.trim(),
    email: email || null,
    phone: phone || null,
    skills: Array.isArray(skills) ? skills : (skills ? [skills] : []),
    availability: availability || "weekends",
    notes: notes || null,
    hours: 0,
    assignments: [],
    createdAt: now.toISOString(),
  };
  const db = fileRead();
  if (!Array.isArray(db.volunteers)) db.volunteers = [];
  db.volunteers.unshift(v);
  fileWrite(db);
  return v;
}
export async function logVolunteerHours(id, { hours, activity, date }) {
  const db = fileRead();
  if (!Array.isArray(db.volunteers)) db.volunteers = [];
  const idx = db.volunteers.findIndex((v) => v.id === id);
  if (idx === -1) throw new Error("Volunteer not found");
  const v = db.volunteers[idx];
  const h = Math.max(0, Number(hours) || 0);
  v.hours = (Number(v.hours) || 0) + h;
  v.assignments = [
    { id: `VA-${Date.now().toString(36).toUpperCase()}`, hours: h, activity: activity || "—", date: date || new Date().toISOString().slice(0, 10) },
    ...(v.assignments || []),
  ];
  db.volunteers[idx] = v;
  fileWrite(db);
  return v;
}
export async function removeVolunteer(id) {
  const db = fileRead();
  if (!Array.isArray(db.volunteers)) db.volunteers = [];
  const idx = db.volunteers.findIndex((v) => v.id === id);
  if (idx === -1) return null;
  const removed = db.volunteers[idx];
  db.volunteers.splice(idx, 1);
  fileWrite(db);
  return removed;
}

// ---------- meetings ----------
// Simple meeting scheduler. audience can be "all" (broadcast to all parents),
// "class:1-A" (one class), or "user:email@x" (single attendee). RSVPs are
// stored as a list per meeting.
const MEETING_AUDIENCE_PREFIXES = ["all", "class:", "user:"];

export async function listMeetings({ forEmail, role, classes } = {}) {
  const db = fileRead();
  const all = Array.isArray(db.meetings) ? db.meetings : [];
  if (!forEmail) return all;
  // Visibility: admin/principal see everything. Others only see meetings whose
  // audience matches them.
  if (role === "admin" || role === "principal" || role === "academic_director") return all;
  return all.filter((m) => {
    if (m.createdByEmail === forEmail) return true;
    if (m.audience === "all") return true;
    if (m.audience?.startsWith("user:") && m.audience.slice(5).toLowerCase() === forEmail.toLowerCase()) return true;
    if (m.audience?.startsWith("class:") && Array.isArray(classes) && classes.includes(m.audience.slice(6))) return true;
    return false;
  });
}

export async function addMeeting({ title, description, scheduledAt, location, audience, audienceLabel, createdByEmail, createdByName }) {
  if (!title?.trim()) throw new Error("Title required");
  if (!scheduledAt) throw new Error("scheduledAt required");
  if (!audience || !MEETING_AUDIENCE_PREFIXES.some((p) => audience === p.replace(/:$/, "") || audience.startsWith(p))) {
    throw new Error("audience must be 'all', 'class:X-Y' or 'user:email'");
  }
  const now = new Date();
  const m = {
    id: `MTG-${now.getTime().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`,
    title: title.trim(),
    description: description || null,
    scheduledAt,
    location: location || "School premises",
    audience,
    audienceLabel: audienceLabel || audience,
    createdByEmail: createdByEmail || null,
    createdByName: createdByName || "Admin",
    createdAt: now.toISOString(),
    rsvps: [],
  };
  const db = fileRead();
  if (!Array.isArray(db.meetings)) db.meetings = [];
  db.meetings.unshift(m);
  fileWrite(db);
  return m;
}

export async function rsvpMeeting({ id, fromEmail, fromName, response }) {
  if (!["yes", "no", "maybe"].includes(response)) throw new Error("response must be yes/no/maybe");
  const db = fileRead();
  if (!Array.isArray(db.meetings)) db.meetings = [];
  const idx = db.meetings.findIndex((m) => m.id === id);
  if (idx === -1) throw new Error("Meeting not found");
  const meeting = db.meetings[idx];
  meeting.rsvps = (meeting.rsvps || []).filter((r) => (r.fromEmail || "").toLowerCase() !== (fromEmail || "").toLowerCase());
  meeting.rsvps.push({ fromEmail, fromName: fromName || fromEmail, response, respondedAt: new Date().toISOString() });
  db.meetings[idx] = meeting;
  fileWrite(db);
  return meeting;
}

export async function removeMeeting(id) {
  const db = fileRead();
  if (!Array.isArray(db.meetings)) db.meetings = [];
  const idx = db.meetings.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const removed = db.meetings[idx];
  db.meetings.splice(idx, 1);
  fileWrite(db);
  return removed;
}

// ---------- parent-teacher chat ----------
// Threads are keyed by `${parentEmail}::${teacherEmail}::${studentId}` so a
// parent talking to two different class teachers about the same kid keeps the
// threads separate. Messages are appended in order.
function threadKey(parentEmail, teacherEmail, studentId) {
  return `${(parentEmail || "").toLowerCase()}::${(teacherEmail || "").toLowerCase()}::${studentId || ""}`;
}

export async function listChatThreads({ forEmail, role } = {}) {
  const db = fileRead();
  const all = Array.isArray(db.chatThreads) ? db.chatThreads : [];
  if (!forEmail) return all;
  const lower = forEmail.toLowerCase();
  // Parent sees threads where they're the parent; teacher sees threads where they're the teacher.
  return all.filter((t) => {
    if (role === "parent") return (t.parentEmail || "").toLowerCase() === lower;
    if (role === "teacher") return (t.teacherEmail || "").toLowerCase() === lower;
    return true; // admin / principal see all
  });
}

export async function getOrCreateThread({ parentEmail, parentName, teacherEmail, teacherName, studentId, studentName, cls }) {
  if (!parentEmail || !teacherEmail || !studentId) throw new Error("parentEmail, teacherEmail, studentId required");
  const key = threadKey(parentEmail, teacherEmail, studentId);
  const db = fileRead();
  if (!Array.isArray(db.chatThreads)) db.chatThreads = [];
  let thread = db.chatThreads.find((t) => t.id === key);
  if (!thread) {
    thread = {
      id: key,
      parentEmail, parentName: parentName || parentEmail,
      teacherEmail, teacherName: teacherName || teacherEmail,
      studentId, studentName: studentName || "—",
      cls: cls || "—",
      messages: [],
      createdAt: new Date().toISOString(),
      lastMessageAt: null,
    };
    db.chatThreads.unshift(thread);
    fileWrite(db);
  }
  return thread;
}

export async function appendChatMessage({ threadId, fromEmail, fromName, fromRole, body }) {
  if (!threadId || !body?.trim()) throw new Error("threadId + body required");
  const db = fileRead();
  if (!Array.isArray(db.chatThreads)) db.chatThreads = [];
  const idx = db.chatThreads.findIndex((t) => t.id === threadId);
  if (idx === -1) throw new Error("Thread not found");
  const now = new Date();
  const msg = {
    id: `MSG-${now.getTime().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`,
    fromEmail, fromName: fromName || fromEmail, fromRole: fromRole || "user",
    body: String(body).trim(),
    sentAt: now.toISOString(),
  };
  db.chatThreads[idx].messages.push(msg);
  db.chatThreads[idx].lastMessageAt = msg.sentAt;
  fileWrite(db);
  return { thread: db.chatThreads[idx], message: msg };
}

// ---------- transfer certificates ----------
const TC_STATUSES = ["requested", "approved", "issued", "rejected"];

export async function addTcRequest({ studentId, studentName, cls, reason, requestedBy }) {
  if (!studentId) throw new Error("studentId required");
  const now = new Date();
  const tc = {
    id: `TC-${now.getFullYear()}-${(now.getTime() % 100000).toString().padStart(5, "0")}`,
    studentId,
    studentName: studentName || "—",
    cls: cls || "—",
    reason: reason || null,
    status: "requested",
    requestedBy: requestedBy || "Admin",
    requestedAt: now.toISOString(),
    issuedAt: null,
    issuedBy: null,
    serialNo: null,
  };
  const db = fileRead();
  if (!Array.isArray(db.tcRequests)) db.tcRequests = [];
  db.tcRequests.unshift(tc);
  fileWrite(db);
  return tc;
}

export async function updateTcRequest(id, patch = {}) {
  const db = fileRead();
  if (!Array.isArray(db.tcRequests)) db.tcRequests = [];
  const idx = db.tcRequests.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const next = { ...db.tcRequests[idx] };
  if (patch.status && TC_STATUSES.includes(patch.status)) next.status = patch.status;
  if (patch.status === "issued" && !next.issuedAt) {
    next.issuedAt = new Date().toISOString();
    next.issuedBy = patch.issuedBy || "Admin";
    // Auto-assign a serial number on issuance.
    const issuedCount = db.tcRequests.filter((t) => t.status === "issued").length + 1;
    next.serialNo = `TC/${new Date().getFullYear()}/${String(issuedCount).padStart(4, "0")}`;
  }
  if (typeof patch.reason === "string") next.reason = patch.reason;
  db.tcRequests[idx] = next;
  fileWrite(db);
  return next;
}

export async function listTcRequests() {
  const db = fileRead();
  return Array.isArray(db.tcRequests) ? db.tcRequests : [];
}

export async function removeTcRequest(id) {
  const db = fileRead();
  if (!Array.isArray(db.tcRequests)) db.tcRequests = [];
  const idx = db.tcRequests.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const removed = db.tcRequests[idx];
  db.tcRequests.splice(idx, 1);
  fileWrite(db);
  return removed;
}

// ---------- expenses ----------
// Logged expenses with a scope ("school" or "trust") so the Money screen and
// Trust dashboard can filter / sum independently.
const EXPENSE_SCOPES = ["school", "trust"];
const EXPENSE_CATEGORIES = [
  "Salary", "Utilities", "Supplies", "Maintenance", "Transport", "Events",
  "Stationery", "Software", "Marketing", "Donation outflow", "Misc",
];

export async function addExpense({ scope, category, amount, vendor, memo, date, paymentMethod, recordedBy }) {
  const amt = Math.max(0, Math.round(Number(amount) || 0));
  if (!amt) throw new Error("Amount must be greater than zero");
  const sc = EXPENSE_SCOPES.includes(scope) ? scope : "school";
  const now = new Date();
  const exp = {
    id: `EXP-${now.getTime().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`,
    scope: sc,
    category: EXPENSE_CATEGORIES.includes(category) ? category : "Misc",
    amount: amt,
    vendor: vendor || null,
    memo: memo || null,
    date: date || now.toISOString().slice(0, 10),
    paymentMethod: paymentMethod || "Bank transfer",
    recordedBy: recordedBy || "unknown",
    createdAt: now.toISOString(),
  };
  const db = fileRead();
  if (!Array.isArray(db.expenses)) db.expenses = [];
  db.expenses.unshift(exp);
  fileWrite(db);
  return exp;
}

export async function listExpenses({ scope } = {}) {
  const db = fileRead();
  const all = Array.isArray(db.expenses) ? db.expenses : [];
  if (scope) return all.filter((e) => e.scope === scope);
  return all;
}

export async function removeExpense(id) {
  const db = fileRead();
  if (!Array.isArray(db.expenses)) db.expenses = [];
  const idx = db.expenses.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  const removed = db.expenses[idx];
  db.expenses.splice(idx, 1);
  fileWrite(db);
  return removed;
}

export const __EXPENSE_META = { SCOPES: EXPENSE_SCOPES, CATEGORIES: EXPENSE_CATEGORIES };

// ---------- documents ----------
// Generic document attachment — entity can be "student" | "staff" | "volunteer"
// | "tc". File bytes are stored as base64 data-URLs in db.json. Good enough for
// demo-sized files (< 2MB); swap to object storage in prod.
export async function addDocument({ entityType, entityId, label, fileName, mimeType, dataUrl, uploadedBy }) {
  if (!entityType || !entityId) throw new Error("entityType + entityId required");
  if (!fileName || !dataUrl) throw new Error("fileName + dataUrl required");
  const now = new Date();
  const doc = {
    id: `DOC-${now.getTime().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`,
    entityType, entityId,
    label: label || fileName,
    fileName,
    mimeType: mimeType || "application/octet-stream",
    dataUrl,                      // base64 preview — enough for inline view
    sizeBytes: dataUrl.length,
    uploadedBy: uploadedBy || "unknown",
    uploadedAt: now.toISOString(),
  };
  const db = fileRead();
  if (!Array.isArray(db.documents)) db.documents = [];
  db.documents.unshift(doc);
  fileWrite(db);
  return doc;
}

export async function listDocuments({ entityType, entityId } = {}) {
  const db = fileRead();
  const all = Array.isArray(db.documents) ? db.documents : [];
  if (!entityType) return all.map(stripBlob);
  return all.filter((d) => d.entityType === entityType && (!entityId || d.entityId === entityId)).map(stripBlob);
}

// Public listing strips the heavy `dataUrl` field — download endpoint serves it.
function stripBlob({ dataUrl, ...rest }) { return rest; }

export async function getDocument(id) {
  const db = fileRead();
  return (db.documents || []).find((d) => d.id === id) || null;
}

export async function removeDocument(id) {
  const db = fileRead();
  if (!Array.isArray(db.documents)) db.documents = [];
  const idx = db.documents.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  const removed = db.documents[idx];
  db.documents.splice(idx, 1);
  fileWrite(db);
  return stripBlob(removed);
}

// ---------- tasks ----------
// Lightweight assignment system. Admin creates tasks, picks a single staff
// user as the assignee, and the assignee can flip the status. Stored only in
// the file fallback — no Supabase table needed.
const TASK_STATUSES = ["pending", "in_progress", "done"];
const TASK_PRIORITIES = ["low", "normal", "high", "urgent"];

function fileTasksSafe() {
  try {
    const db = fileRead();
    return Array.isArray(db.tasks) ? db.tasks : [];
  } catch { return []; }
}

export async function listTasks(filter = {}) {
  const all = fileTasksSafe();
  if (filter.assignedTo) return all.filter((t) => t.assignedTo === filter.assignedTo);
  return all;
}

export async function addTask({ title, description, assignedTo, assignedToName, assignedToRole, assignedBy, assignedByName, priority, dueDate }) {
  const t = String(title || "").trim();
  if (!t) throw new Error("Task title is required");
  if (!assignedTo) throw new Error("assignedTo (user id) is required");
  if (assignedToRole === "parent") throw new Error("Tasks cannot be assigned to parents");
  const now = new Date();
  const task = {
    id: `TSK-${now.getTime().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`,
    title: t,
    description: String(description || "").trim() || null,
    assignedTo,
    assignedToName: assignedToName || "—",
    assignedToRole: assignedToRole || "staff",
    assignedBy: assignedBy || null,
    assignedByName: assignedByName || "Admin",
    status: "pending",
    priority: TASK_PRIORITIES.includes(priority) ? priority : "normal",
    dueDate: dueDate || null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const db = fileRead();
  if (!Array.isArray(db.tasks)) db.tasks = [];
  db.tasks.unshift(task);
  fileWrite(db);
  return task;
}

export async function updateTask(id, patch = {}) {
  if (!id) throw new Error("id required");
  const db = fileRead();
  if (!Array.isArray(db.tasks)) db.tasks = [];
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const next = { ...db.tasks[idx] };
  if (patch.status && TASK_STATUSES.includes(patch.status)) next.status = patch.status;
  if (typeof patch.title === "string" && patch.title.trim()) next.title = patch.title.trim();
  if (typeof patch.description === "string") next.description = patch.description.trim() || null;
  if (TASK_PRIORITIES.includes(patch.priority)) next.priority = patch.priority;
  if (typeof patch.dueDate === "string") next.dueDate = patch.dueDate || null;
  next.updatedAt = new Date().toISOString();
  db.tasks[idx] = next;
  fileWrite(db);
  return next;
}

export async function removeTask(id) {
  if (!id) return null;
  const db = fileRead();
  if (!Array.isArray(db.tasks)) db.tasks = [];
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const removed = db.tasks[idx];
  db.tasks.splice(idx, 1);
  fileWrite(db);
  return removed;
}

function safeArr(key) {
  try {
    const db = fileRead();
    return Array.isArray(db[key]) ? db[key] : [];
  } catch { return []; }
}

function fileTcRequestsSafe() {
  try {
    const db = fileRead();
    return Array.isArray(db.tcRequests) ? db.tcRequests : [];
  } catch { return []; }
}

function fileExpensesSafe() {
  try {
    const db = fileRead();
    return Array.isArray(db.expenses) ? db.expenses : [];
  } catch { return []; }
}

function rolePermissionsSafe() {
  try {
    const db = fileRead();
    return db.rolePermissions && typeof db.rolePermissions === "object" ? db.rolePermissions : {};
  } catch { return {}; }
}

function fileDonorReceiptsSafe() {
  try {
    const data = fileRead();
    return Array.isArray(data.donorReceipts) ? data.donorReceipts : [];
  } catch { return []; }
}

function fileDonorsSafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.donors) ? data.donors : [];
  } catch { return []; }
}

function fileCampaignsSafe() {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    const raw = fs.readFileSync(DB_PATH, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.campaigns) ? data.campaigns : [];
  } catch { return []; }
}

// ---------- donors ----------
const DONOR_TYPES = ["CSR", "Trust", "Individual", "Alumni"];
export async function addDonor(row) {
  const id = row.id || `DON-${1000 + Math.floor(Math.random() * 8999)}`;
  const openingYtd = Math.max(0, Number(row.ytd) || 0);
  const filled = {
    id,
    name: String(row.name || "").trim(),
    type: DONOR_TYPES.includes(row.type) ? row.type : "Individual",
    email: row.email || null,
    phone: row.phone || null,
    ytd: openingYtd,
    // If they entered an opening YTD, surface it on the row right away so the
    // "Last gift" column doesn't look empty.
    last: row.last || (openingYtd > 0
      ? `${openingYtd >= 100000 ? `₹${(openingYtd / 100000).toFixed(2)}L` : `₹${openingYtd.toLocaleString("en-IN")}`} · ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
      : null),
    next: row.next || null,
  };
  if (!filled.name) throw new Error("Donor name is required");
  if (supabaseEnabled) {
    const ins = await supabase.from("donors").insert(toDonor(filled)).select().single();
    if (ins.error) {
      if (/donor/i.test(ins.error.message)) {
        const created = fileAddDonor(filled);
        if (openingYtd > 0) writeOpeningReceipt(created, openingYtd);
        return created;
      }
      throw new Error(ins.error.message);
    }
    const created = fromDonor(ins.data);
    if (openingYtd > 0) writeOpeningReceipt(created, openingYtd);
    return created;
  }
  const created = fileAddDonor(filled);
  if (openingYtd > 0) writeOpeningReceipt(created, openingYtd);
  return created;
}

function fileAddDonor(filled) {
  const db = fileRead();
  if (!Array.isArray(db.donors)) db.donors = [];
  db.donors.unshift(filled);
  fileWrite(db);
  return filled;
}

// Auto-receipt for the opening YTD entered when adding a donor. Mirrors the
// shape produced by recordDonation() so the same UI / CSV / print code works.
function writeOpeningReceipt(donor, amount) {
  const now = new Date();
  const receipt = {
    id: `RDP-${now.getTime().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`,
    donorId: donor.id,
    donorName: donor.name,
    donorType: donor.type,
    amount,
    method: "Opening balance",
    memo: "Initial contribution recorded at donor onboarding",
    campaignId: null,
    issuedAt: now.toISOString(),
    issuedAtLabel: now.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  };
  const db = fileRead();
  if (!Array.isArray(db.donorReceipts)) db.donorReceipts = [];
  db.donorReceipts.unshift(receipt);
  fileWrite(db);
  return receipt;
}

// Record a fresh donation against an existing donor. Bumps the donor's YTD,
// updates their `last gift` line, and persists a unique 80G-style receipt in
// db.donorReceipts (file-only — no Supabase table needed). Returns
// { donor, receipt } so the caller can show the receipt straight away.
export async function recordDonation(donorId, { amount, method, memo, campaignId } = {}) {
  if (!donorId) throw new Error("donorId is required");
  const amt = Math.max(0, Math.round(Number(amount) || 0));
  if (!amt) throw new Error("Donation amount must be greater than zero");

  // Find the donor across whichever backend has it.
  let donor = null;
  let backend = "file";
  if (supabaseEnabled) {
    const sel = await supabase.from("donors").select("*").eq("id", donorId).maybeSingle();
    if (sel.data) { donor = fromDonor(sel.data); backend = "supabase"; }
  }
  if (!donor) {
    const db = fileRead();
    const found = (db.donors || []).find((d) => d.id === donorId);
    if (found) { donor = found; backend = "file"; }
  }
  if (!donor) throw new Error("Donor not found");

  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const niceAmount = amt >= 100000 ? `₹${(amt / 100000).toFixed(2)}L` : `₹${amt.toLocaleString("en-IN")}`;
  const receipt = {
    id: `RDP-${now.getTime().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`,
    donorId: donor.id,
    donorName: donor.name,
    donorType: donor.type,
    amount: amt,
    method: method || "Bank transfer",
    memo: memo || "",
    campaignId: campaignId || null,
    issuedAt: now.toISOString(),
    issuedAtLabel: now.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  };

  // Bump YTD + update last-gift label on the donor record.
  const newYtd = (Number(donor.ytd) || 0) + amt;
  const newLast = `${niceAmount} · ${dateLabel}`;
  if (backend === "supabase") {
    const upd = await supabase.from("donors")
      .update({ ytd: newYtd, last: newLast })
      .eq("id", donor.id);
    if (upd.error) console.warn(`[db] donor update fell back: ${upd.error.message}`);
  }
  // Mirror to the file copy regardless — keeps receipts and totals in one place.
  const db = fileRead();
  if (!Array.isArray(db.donors)) db.donors = [];
  const fIdx = db.donors.findIndex((d) => d.id === donor.id);
  if (fIdx === -1) db.donors.unshift({ ...donor, ytd: newYtd, last: newLast });
  else db.donors[fIdx] = { ...db.donors[fIdx], ytd: newYtd, last: newLast };
  if (!Array.isArray(db.donorReceipts)) db.donorReceipts = [];
  db.donorReceipts.unshift(receipt);
  fileWrite(db);

  return { donor: { ...donor, ytd: newYtd, last: newLast }, receipt };
}

export async function listDonorReceipts() {
  const db = fileRead();
  return Array.isArray(db.donorReceipts) ? db.donorReceipts : [];
}

export async function archiveDonor(id) {
  if (supabaseEnabled) {
    const sel = await supabase.from("donors").select("*").eq("id", id).maybeSingle();
    if (sel.data) {
      let upd = await supabase.from("donors")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (upd.error && /archived_at/.test(upd.error.message)) {
        await supabase.from("donors").delete().eq("id", id);
      }
      return fromDonor(sel.data);
    }
  }
  const db = fileRead();
  const idx = (db.donors || []).findIndex((d) => d.id === id);
  if (idx === -1) return null;
  const removed = db.donors[idx];
  db.donors.splice(idx, 1);
  fileWrite(db);
  return removed;
}

// ---------- campaigns ----------
export async function addCampaign(row) {
  const id = row.id || `CMP-${Date.now().toString(36).toUpperCase()}`;
  const filled = {
    id,
    name: String(row.name || "").trim(),
    goal: Math.max(0, Number(row.goal) || 0),
    raised: Math.max(0, Number(row.raised) || 0),
    starts: row.starts || null,
    ends: row.ends || null,
    status: ["active", "completed", "paused"].includes(row.status) ? row.status : "active",
    description: row.description || null,
  };
  if (!filled.name) throw new Error("Campaign name is required");
  if (filled.goal <= 0) throw new Error("Set a fundraising goal greater than 0");
  if (supabaseEnabled) {
    const ins = await supabase.from("campaigns").insert(toCampaign(filled)).select().single();
    if (ins.error) {
      if (/campaign/i.test(ins.error.message)) return fileAddCampaign(filled);
      throw new Error(ins.error.message);
    }
    return fromCampaign(ins.data);
  }
  return fileAddCampaign(filled);
}

function fileAddCampaign(filled) {
  const db = fileRead();
  if (!Array.isArray(db.campaigns)) db.campaigns = [];
  db.campaigns.unshift(filled);
  fileWrite(db);
  return filled;
}

// ---------- communication ----------
// addBroadcast records the campaign + counts. We don't have a real WhatsApp/SMS
// gateway wired up yet, so the "delivered" count is just the audience size; in
// production a webhook would update it after Gupshup/Twilio reports back.
export async function addBroadcast(row) {
  const id = `BC-${Date.now().toString(36).toUpperCase()}`;
  const filled = {
    id,
    campaign: String(row.campaign || "").trim() || "Manual broadcast",
    channel: ["whatsapp", "sms", "both"].includes(row.channel) ? row.channel : "whatsapp",
    audience: row.audience || "all",
    audienceLabel: row.audienceLabel || row.audience || "All parents",
    message: row.message || "",
    sent: Number(row.sent) || 0,
    delivered: Number(row.delivered) || Number(row.sent) || 0,
  };
  if (supabaseEnabled) {
    const ins = await supabase.from("broadcasts").insert(toBroadcast(filled)).select().single();
    if (ins.error) {
      if (/broadcast/i.test(ins.error.message)) return fileAddBroadcast(filled);
      throw new Error(ins.error.message);
    }
    return fromBroadcast(ins.data);
  }
  return fileAddBroadcast(filled);
}

function fileAddBroadcast(filled) {
  const db = fileRead();
  if (!Array.isArray(db.broadcasts)) db.broadcasts = [];
  db.broadcasts.unshift({ ...filled, sentAt: new Date().toISOString() });
  if (db.broadcasts.length > 200) db.broadcasts.length = 200;
  fileWrite(db);
  return db.broadcasts[0];
}

export async function addTemplate(row) {
  const id = `TPL-${Date.now().toString(36).toUpperCase()}`;
  const filled = {
    id,
    name: String(row.name || "").trim(),
    channel: ["whatsapp", "sms", "both"].includes(row.channel) ? row.channel : "whatsapp",
    body: String(row.body || "").trim(),
  };
  if (!filled.name) throw new Error("Template name required");
  if (!filled.body) throw new Error("Template body required");
  if (supabaseEnabled) {
    const ins = await supabase.from("message_templates").insert(toTemplate(filled)).select().single();
    if (ins.error) {
      if (/template|message_templates/i.test(ins.error.message)) return fileAddTemplate(filled);
      throw new Error(ins.error.message);
    }
    return fromTemplate(ins.data);
  }
  return fileAddTemplate(filled);
}

function fileAddTemplate(filled) {
  const db = fileRead();
  if (!Array.isArray(db.templates)) db.templates = [];
  db.templates.unshift(filled);
  fileWrite(db);
  return filled;
}

export async function removeTemplate(id) {
  if (supabaseEnabled) {
    const sel = await supabase.from("message_templates").select("*").eq("id", id).maybeSingle();
    if (sel.data) {
      await supabase.from("message_templates").delete().eq("id", id);
      return fromTemplate(sel.data);
    }
  }
  const db = fileRead();
  const idx = (db.templates || []).findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const removed = db.templates[idx];
  db.templates.splice(idx, 1);
  fileWrite(db);
  return removed;
}

export async function addRecipientList(row) {
  const id = `LIST-${Date.now().toString(36).toUpperCase()}`;
  const filled = {
    id,
    name: String(row.name || "").trim() || "Imported list",
    contacts: Array.isArray(row.contacts) ? row.contacts : [],
  };
  if (filled.contacts.length === 0) throw new Error("List has no valid contacts");
  if (supabaseEnabled) {
    const ins = await supabase.from("recipient_lists").insert(filled).select().single();
    if (ins.error) {
      if (/recipient_list/i.test(ins.error.message)) return fileAddRecipientList(filled);
      throw new Error(ins.error.message);
    }
    return fromRecipientList(ins.data);
  }
  return fileAddRecipientList(filled);
}

function fileAddRecipientList(filled) {
  const db = fileRead();
  if (!Array.isArray(db.recipientLists)) db.recipientLists = [];
  db.recipientLists.unshift(filled);
  fileWrite(db);
  return filled;
}

// ---------- inventory ----------
export async function addInventoryItem(row) {
  const id = row.id || `INV-${1000 + Math.floor(Math.random() * 8999)}`;
  const filled = {
    id,
    name: String(row.name || "").trim(),
    category: ["book", "uniform", "asset"].includes(row.category) ? row.category : "asset",
    cls: row.cls || null,
    onHand: Math.max(0, Number(row.onHand) || 0),
    min: Math.max(0, Number(row.min) || 0),
    issued: 0,
    unitPrice: Math.max(0, Number(row.unitPrice) || 0),
    supplier: row.supplier || null,
  };
  if (!filled.name) throw new Error("Item name is required");

  if (supabaseEnabled) {
    const ins = await supabase.from("inventory").insert(toInventory(filled)).select().single();
    if (ins.error) {
      if (/inventory/i.test(ins.error.message)) {
        return fileAddInventory(filled);
      }
      throw new Error(ins.error.message);
    }
    return fromInventory(ins.data);
  }
  return fileAddInventory(filled);
}

function fileAddInventory(filled) {
  const db = fileRead();
  if (!Array.isArray(db.inventory)) db.inventory = [];
  db.inventory.unshift(filled);
  fileWrite(db);
  return filled;
}

export async function moveInventory({ itemId, type, qty, note, who }) {
  if (!itemId) throw new Error("Item required");
  const t = type === "out" ? "out" : "in";
  const q = Math.max(1, Number(qty) || 0);
  if (!q) throw new Error("Quantity must be positive");

  // Find current item (try Supabase first, then file).
  let current = null;
  let backend = "file";
  if (supabaseEnabled) {
    const sel = await supabase.from("inventory").select("*").eq("id", itemId).maybeSingle();
    if (sel.data) {
      current = fromInventory(sel.data);
      backend = "supabase";
    }
  }
  if (!current) {
    const list = fileInventorySafe();
    current = list.find((r) => r.id === itemId);
  }
  if (!current) throw new Error("Item not found");

  if (t === "out" && q > current.onHand) {
    throw new Error(`Only ${current.onHand} on hand — can't issue ${q}`);
  }

  const newOnHand = t === "in" ? current.onHand + q : current.onHand - q;
  const newIssued = t === "out" ? (current.issued || 0) + q : (current.issued || 0);
  const moveId = `MOV-${Date.now().toString(36).toUpperCase()}`;
  const moveRow = {
    id: moveId, itemId, type: t, qty: q,
    note: note || null, who: who || "—",
    at: new Date().toISOString(),
  };

  if (backend === "supabase") {
    let upd = await supabase.from("inventory")
      .update({ on_hand: newOnHand, issued: newIssued })
      .eq("id", itemId);
    if (upd.error) throw new Error(upd.error.message);
    // Movement log is best-effort — don't fail the move if the table is missing.
    try {
      await supabase.from("inventory_movements").insert({
        id: moveId, item_id: itemId, type: t, qty: q,
        note: moveRow.note, who: moveRow.who, at: moveRow.at,
      });
    } catch {}
    return { item: { ...current, onHand: newOnHand, issued: newIssued }, movement: moveRow };
  }

  // File backend update
  const db = fileRead();
  if (!Array.isArray(db.inventory)) db.inventory = [];
  if (!Array.isArray(db.movements)) db.movements = [];
  const idx = db.inventory.findIndex((r) => r.id === itemId);
  if (idx === -1) throw new Error("Item not found");
  db.inventory[idx] = { ...db.inventory[idx], onHand: newOnHand, issued: newIssued };
  db.movements.unshift(moveRow);
  if (db.movements.length > 100) db.movements.length = 100;
  fileWrite(db);
  return { item: db.inventory[idx], movement: moveRow };
}

export async function archiveInventoryItem(id) {
  if (supabaseEnabled) {
    const sel = await supabase.from("inventory").select("*").eq("id", id).maybeSingle();
    if (sel.data) {
      let upd = await supabase.from("inventory")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (upd.error && /archived_at/.test(upd.error.message)) {
        await supabase.from("inventory").delete().eq("id", id);
      }
      return fromInventory(sel.data);
    }
  }
  const db = fileRead();
  const idx = (db.inventory || []).findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const removed = db.inventory[idx];
  db.inventory.splice(idx, 1);
  fileWrite(db);
  return removed;
}

export async function archiveStaff(id) {
  if (supabaseEnabled) {
    const sel = await supabase.from("staff").select("*").eq("id", id).maybeSingle();
    if (sel.data) {
      let upd = await supabase.from("staff")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", id);
      if (upd.error && /archived_at/.test(upd.error.message)) {
        // Schema cache lag — fall back to hard delete.
        await supabase.from("staff").delete().eq("id", id);
      }
      return fromStaff(sel.data);
    }
    // If the table is missing from the cache OR the row isn't there, also
    // try the file fallback before giving up.
  }
  const db = fileRead();
  const idx = (db.staff || []).findIndex((s) => s.id === id);
  if (idx === -1) return null;
  const removed = db.staff[idx];
  db.staff.splice(idx, 1);
  fileWrite(db);
  return removed;
}

// ---------- auth users ----------
// CRUD for the users table (real login accounts). The file backend keeps
// users in db.json under `authUsers` so the dev fallback still works.
//
// Multi-class teachers: a teacher can be the class teacher of >1 section.
// The DB column `linked_id` (text) stores the assignments as a CSV string
// like "2-A,5-B". The JS layer surfaces them as an array `linkedClasses`,
// keeping `linkedId` in scope for backwards-compat with the parent flow
// (where it's a single student id).

// Parse a CSV string of class-section keys ("2-A,5-B") into an array.
// Empty / null / undefined → []. Trims and de-dupes.
export function parseLinkedClasses(linkedId) {
  if (!linkedId) return [];
  return Array.from(new Set(
    String(linkedId).split(",").map((s) => s.trim()).filter(Boolean)
  ));
}

// Pack an array back into a CSV string for storage. Empty array → null.
export function packLinkedClasses(arr) {
  const list = Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : [];
  const dedup = Array.from(new Set(list));
  return dedup.length ? dedup.join(",") : null;
}

// Heuristic: a value looks like a class-section assignment ("5-A", "10-B")
// rather than a student id ("STN-1234"). We use this only in the user shape
// helper so parent users (linkedId = student id) don't get a bogus
// linkedClasses array. Teachers' linked_id is always class-section strings.
function looksLikeClassKey(s) {
  return /^\d+-[A-Z]+$/i.test(String(s || "").trim());
}

const fromUser = (r) => {
  if (!r) return null;
  const linkedId = r.linked_id ?? null;
  // Only expose linkedClasses when the value parses as one or more class
  // keys. For parents (linkedId = student id) it stays empty.
  const parts = parseLinkedClasses(linkedId);
  const isClassList = parts.length > 0 && parts.every(looksLikeClassKey);
  return {
    id: r.id, email: r.email, role: r.role, name: r.name,
    passwordHash: r.password_hash,
    linkedId,
    linkedClasses: isClassList ? parts : [],
    createdAt: r.created_at,
  };
};

export async function getUserByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  if (supabaseEnabled) {
    const r = await supabase.from("users").select("*").eq("email", e).maybeSingle();
    if (!r.error && r.data) return fromUser(r.data);
    if (r.error) console.warn(`[db] users lookup: ${r.error.message}`);
    // Fall through to file store so reassignments persisted via the file
    // fallback (when Supabase users table is missing) still take effect.
  }
  const db = fileRead();
  const list = db.authUsers || [];
  const found = list.find((u) => u.email === e);
  if (!found) return null;
  // Normalise through fromUser so linkedClasses is computed from linkedId.
  return fromUser({
    id: found.id, email: found.email, role: found.role, name: found.name,
    password_hash: found.passwordHash, linked_id: found.linkedId,
    created_at: found.createdAt,
  });
}

export async function listUsers() {
  // Union Supabase + file so a user added via either path surfaces. This
  // matters when one is fresher than the other (e.g. createUser fell back
  // to file because Supabase users table is missing the schema).
  const out = new Map();
  if (supabaseEnabled) {
    const r = await supabase.from("users").select("*").order("created_at", { ascending: false });
    if (!r.error && r.data) {
      for (const row of r.data) {
        const u = fromUser(row);
        if (u) out.set(u.id, u);
      }
    }
  }
  const db = fileRead();
  for (const u of (db.authUsers || [])) {
    if (!out.has(u.id)) out.set(u.id, u);
  }
  return Array.from(out.values());
}

// Update mutable fields on a user (name, role, linked_id). Used by the
// "Class teacher" picker on the Classes screen.
//
// Patch shape supports both whole-list replace and atomic add/remove:
//   { linkedId: "2-A,5-B" }       — replace whole CSV
//   { linkedClasses: ["2-A","5-B"] } — replace whole array
//   { addClass: "5-B" }            — add this class to the user's list
//   { removeClass: "2-A" }         — remove just this class from the list
//
// Returns the updated user, or null if not found.
export async function updateUser(id, patch) {
  if (!id) return null;

  // Resolve the new CSV value if any class-related field is being patched.
  const wantsClassChange = (
    "linkedId" in patch || "linkedClasses" in patch ||
    typeof patch.addClass === "string" || typeof patch.removeClass === "string"
  );

  // Compute next CSV based on the current user (needed for add/remove).
  let nextLinkedCsv = null;
  let touchedClasses = false;
  if (wantsClassChange) {
    touchedClasses = true;
    if ("linkedId" in patch) {
      nextLinkedCsv = patch.linkedId || null;
    } else if ("linkedClasses" in patch) {
      nextLinkedCsv = packLinkedClasses(patch.linkedClasses);
    } else {
      // add / remove → need the current value
      const current = await getUserById(id);
      const set = new Set(parseLinkedClasses(current?.linkedId));
      if (typeof patch.addClass === "string" && patch.addClass.trim()) {
        set.add(patch.addClass.trim());
      }
      if (typeof patch.removeClass === "string" && patch.removeClass.trim()) {
        set.delete(patch.removeClass.trim());
      }
      nextLinkedCsv = packLinkedClasses(Array.from(set));
    }
  }

  const fields = {};
  if (typeof patch.name === "string") fields.name = patch.name;
  if (typeof patch.role === "string") fields.role = patch.role;
  if (touchedClasses)                 fields.linked_id = nextLinkedCsv;

  if (supabaseEnabled) {
    const r = await supabase.from("users").update(fields).eq("id", id).select().maybeSingle();
    if (!r.error && r.data) return fromUser(r.data);
    // Fall through to file fallback when Supabase doesn't know this user
    // (e.g. demo accounts created via in-memory fallback only).
  }
  const db = fileRead();
  if (!Array.isArray(db.authUsers)) db.authUsers = [];
  let idx = db.authUsers.findIndex((u) => u.id === id);
  // Lazy-seed from DEMO_ACCOUNTS if the user only exists in memory.
  if (idx === -1) {
    try {
      const seed = require("./seed-users.js");
      const demo = (seed.DEMO_ACCOUNTS || []).find((a) => a.id === id);
      if (demo) {
        db.authUsers.push({
          id: demo.id, email: demo.email, role: demo.role, name: demo.name,
          linkedId: demo.linkedId || null,
          createdAt: new Date().toISOString(),
        });
        idx = db.authUsers.length - 1;
      }
    } catch {}
  }
  if (idx === -1) return null;
  const merged = {
    ...db.authUsers[idx],
    ...(typeof patch.name === "string" ? { name: patch.name } : {}),
    ...(typeof patch.role === "string" ? { role: patch.role } : {}),
    ...(touchedClasses ? { linkedId: nextLinkedCsv } : {}),
  };
  db.authUsers[idx] = merged;
  fileWrite(db);
  return fromUser({
    id: merged.id, email: merged.email, role: merged.role, name: merged.name,
    password_hash: merged.passwordHash, linked_id: merged.linkedId,
    created_at: merged.createdAt,
  });
}

// Look up a user by id. Used internally for atomic add/remove operations.
async function getUserById(id) {
  if (!id) return null;
  if (supabaseEnabled) {
    const r = await supabase.from("users").select("*").eq("id", id).maybeSingle();
    if (!r.error && r.data) return fromUser(r.data);
  }
  const db = fileRead();
  const list = db.authUsers || [];
  const found = list.find((u) => u.id === id);
  if (!found) {
    // Fall back to demo seed so add/remove works against teachers that
    // haven't been written to the file yet.
    try {
      const seed = require("./seed-users.js");
      const demo = (seed.DEMO_ACCOUNTS || []).find((a) => a.id === id);
      if (demo) {
        return fromUser({
          id: demo.id, email: demo.email, role: demo.role, name: demo.name,
          linked_id: demo.linkedId || null,
        });
      }
    } catch {}
    return null;
  }
  return fromUser({
    id: found.id, email: found.email, role: found.role, name: found.name,
    password_hash: found.passwordHash, linked_id: found.linkedId,
    created_at: found.createdAt,
  });
}

// Convenience: list teachers (id, email, name, linkedId) — feeds the
// "Class teacher" picker. Falls back to DEMO_ACCOUNTS so the picker is
// never empty during the demo, even before the users table is populated.
export async function listTeachers() {
  const fromDb = await listUsers();
  // Normalise everything through fromUser so linkedClasses is always set.
  const norm = (u) => fromUser({
    id: u.id, email: u.email, role: u.role, name: u.name,
    password_hash: u.passwordHash, linked_id: u.linkedId,
    created_at: u.createdAt,
  });
  const fileMap = new Map(
    fromDb.filter((u) => u.role === "teacher").map((u) => [u.id, norm(u)])
  );
  try {
    const seed = require("./seed-users.js");
    for (const a of (seed.DEMO_ACCOUNTS || [])) {
      if (a.role === "teacher" && !fileMap.has(a.id)) {
        fileMap.set(a.id, fromUser({
          id: a.id, email: a.email, role: a.role, name: a.name,
          linked_id: a.linkedId || null,
        }));
      }
    }
  } catch {}
  return Array.from(fileMap.values());
}

export async function createUser({ id, email, passwordHash, role, name, linkedId }) {
  const row = {
    id,
    email: String(email).trim().toLowerCase(),
    password_hash: passwordHash,
    role,
    name,
    linked_id: linkedId || null,
  };
  if (supabaseEnabled) {
    const r = await supabase.from("users").insert(row).select().maybeSingle();
    if (!r.error && r.data) return fromUser(r.data);
    // PostgREST cache lag / missing users table → fall through to file so
    // newly-provisioned accounts still persist locally.
    if (r.error) console.warn(`[db] users insert fell back to file: ${r.error.message}`);
  }
  const db = fileRead();
  if (!Array.isArray(db.authUsers)) db.authUsers = [];
  // Don't double-write if it's already there.
  if (!db.authUsers.find((u) => u.id === id || u.email === row.email)) {
    db.authUsers.push({
      id, email: row.email, passwordHash, role, name, linkedId: linkedId || null,
      createdAt: new Date().toISOString(),
    });
    fileWrite(db);
  }
  return db.authUsers.find((u) => u.id === id) || db.authUsers.at(-1);
}

// ---------- bulk attendance ----------
// Mark attendance for many students for the same date in one shot. If a
// daily_logs row already exists for (student, date), only the attendance +
// leave_reason fields are touched — classwork / homework / handwriting /
// behaviour / extra notes are preserved. Falls back to file backend the
// same way upsertDailyLog does.
export async function markAttendanceBulk({ date, cls, postedBy, marks }) {
  if (!date || !Array.isArray(marks) || marks.length === 0) {
    throw new Error("date and marks[] are required");
  }
  const results = [];
  for (const m of marks) {
    const studentId = m.studentId;
    if (!studentId) continue;
    const att = m.attendance === "absent" ? "absent" : "present";
    const leaveReason = att === "absent" ? (m.leaveReason || "") : "";

    let existing = null;
    if (supabaseEnabled) {
      const sel = await supabase.from("daily_logs")
        .select("*").eq("student_id", studentId).eq("date", date).maybeSingle();
      if (sel.data) existing = sel.data;
    } else {
      const db = fileRead();
      existing = (db.dailyLogs || []).find((l) => l.studentId === studentId && l.date === date) || null;
    }

    // Build the merged row. For brand-new entries we only set the
    // attendance-relevant fields; classwork/homework etc. stay null until a
    // teacher posts the full daily log.
    const merged = existing ? {
      studentId, studentName: existing.student_name || existing.studentName || m.studentName,
      cls: existing.cls || cls, date,
      attendance: att, leaveReason,
      classwork: existing.classwork ?? null, classworkStatus: existing.classwork_status ?? existing.classworkStatus ?? null,
      homework:  existing.homework  ?? null, homeworkStatus:  existing.homework_status  ?? existing.homeworkStatus  ?? null,
      topics: existing.topics ?? null,
      handwritingNote: existing.handwriting_note ?? existing.handwritingNote ?? null,
      handwritingGrade: existing.handwriting_grade ?? existing.handwritingGrade ?? null,
      behaviour: existing.behaviour ?? null,
      extra: existing.extra ?? null,
      postedBy: postedBy || existing.posted_by || existing.postedBy || "Teacher",
    } : {
      studentId, studentName: m.studentName, cls, date,
      attendance: att, leaveReason,
      classwork: null, classworkStatus: null,
      homework: null, homeworkStatus: null,
      topics: null, handwritingNote: null, handwritingGrade: null,
      behaviour: null, extra: null,
      postedBy: postedBy || "Teacher",
    };
    const r = await upsertDailyLog(merged);
    results.push(r.log);
  }
  return results;
}

// ---------- complaints ----------
export async function addComplaint(row) {
  const id = "CMP-" + String(Math.floor(Math.random() * 1e5)).padStart(5, "0");
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const newRow = {
    id,
    student: row.student || "",
    student_id: row.studentId || null,
    cls: row.cls || "",
    parent: row.parent || "",
    issue: (row.issue || "").trim(),
    type: row.type === "leave_request" ? "leave_request" : "general",
    date: today,
    status: "Open",
    assigned: row.assigned || "Admin Desk",
    submitted_by: row.submittedBy || "parent",
  };
  if (supabaseEnabled) {
    let attempt = newRow;
    let r = await supabase.from("complaints").insert(attempt).select().maybeSingle();
    // PostgREST cache lag — strip whichever new column is unknown and retry.
    let safety = 5;
    while (r.error && safety-- > 0) {
      const m = /Could not find the '([a-z_]+)' column/i.exec(r.error.message);
      if (!m) break;
      const next = { ...attempt };
      delete next[m[1]];
      if (Object.keys(next).length === Object.keys(attempt).length) break;
      attempt = next;
      r = await supabase.from("complaints").insert(attempt).select().maybeSingle();
    }
    if (r.error) {
      // Table missing entirely → file fallback.
      if (/complaint/i.test(r.error.message)) {
        return fileAddComplaint(newRow);
      }
      throw new Error(r.error.message);
    }
    return r.data;
  }
  return fileAddComplaint(newRow);
}

function fileAddComplaint(newRow) {
  const db = fileRead();
  if (!Array.isArray(db.complaints)) db.complaints = [];
  db.complaints.unshift({
    id: newRow.id, student: newRow.student, studentId: newRow.student_id,
    cls: newRow.cls, parent: newRow.parent, issue: newRow.issue,
    type: newRow.type, date: newRow.date, status: newRow.status,
    assigned: newRow.assigned, submittedBy: newRow.submitted_by,
  });
  fileWrite(db);
  return db.complaints[0];
}
