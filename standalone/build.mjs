// build.mjs — bundles the entire app into one self-contained HTML file.
// Run with: node standalone/build.mjs
//
// Strategy:
//   1. Inline globals.css.
//   2. Inline a localStorage-backed "store" that mirrors lib/db.js.
//   3. Concatenate every component file with imports/exports stripped, so
//      everything lands in one global scope under <script type="text/babel">.
//   4. Replace every `fetch("/api/X", …)` call with a direct store call.
//   5. Bootstrap React from CDN (Babel standalone for in-browser JSX).
//
// Output: standalone/vidyalaya360.html

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(__dirname, "vidyalaya360.html");

// ---------- read source files ----------
const css = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
const r = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// Helpers — strip ESM bits so the file works as a flat <script type="text/babel">
const stripModule = (src) => src
  .replace(/^"use client";?\s*$/gm, "")
  .replace(/^import[^;]+;\s*/gm, "")
  .replace(/^export default function/gm, "function")
  .replace(/^export (const|function|let|var|async function)/gm, "$1")
  .replace(/^export \{[^}]+\};?\s*$/gm, "");

// ---------- the localStorage-backed data store ----------
const STORE_JS = `
// ============================================================================
// Vidyalaya360 standalone store
// All data lives in localStorage under the key 'vidyalaya360.db'. Async API to
// match the Next.js version so screens that use await still work.
// ============================================================================
const STORE_KEY = "vidyalaya360.db";
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
  archivedStudents: [],
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function readDb() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...EMPTY_DB };
    const data = JSON.parse(raw);
    for (const k of Object.keys(EMPTY_DB)) if (!(k in data)) data[k] = EMPTY_DB[k];
    return data;
  } catch { return { ...EMPTY_DB }; }
}
function writeDb(data) { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
function newAuditId() { return "AUD-" + String(Math.floor(Math.random() * 1e6)).padStart(6, "0"); }
function whenLabel() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function termFeeFor(cls) {
  const n = Number(String(cls).split("-")[0]) || 1;
  return 14000 + n * 1000;
}
function formatIndianPhone(raw) {
  if (!raw) return "—";
  let digits = String(raw).replace(/\\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (digits.length !== 10 || !/^[6-9]/.test(digits)) return null;
  return \`+91 \${digits.slice(0, 5)} \${digits.slice(5)}\`;
}
function logAudit(who, action, entity) {
  const db = readDb();
  db.audit.unshift({ id: newAuditId(), who, action, entity, when: whenLabel() });
  writeDb(db);
}
function addActivity(row) {
  const db = readDb();
  db.activities.unshift({ ts: "now", ...row });
  writeDb(db);
}

// Public store API used by screens
const store = {
  async readAllData() {
    await sleep(0);
    const db = readDb();
    return {
      KPIS: { students: { value: 0 }, collected: { value: 0 }, pending: { value: 0 }, balance: { value: 0 }, income: { value: 0 }, expense: { value: 0 } },
      CLASSES: [1,2,3,4,5,6,7,8].map(n => ({ n, label: \`Class \${n}\`, sections: ["A","B"], students: 0 })),
      CLASS_STRENGTH: [],
      INCOME_SERIES: [],
      ROLES: [
        { k: "super", label: "Super Admin", icon: "shield" },
        { k: "principal", label: "Principal", icon: "school" },
        { k: "teacher", label: "Teacher", icon: "book" },
        { k: "parent", label: "Parent", icon: "heart" },
      ],
      ADDED_STUDENTS: (db.addedStudents || []).filter(s => (s.status ?? "active") !== "archived"),
      ARCHIVED_STUDENTS: (db.addedStudents || []).filter(s => s.status === "archived"),
      PENDING_FEES: db.pendingFees || [],
      RECENT_FEES: db.recentFees || [],
      ACTIVITIES: db.activities || [],
      ROUTES: db.routes || [],
      COMPLAINTS: db.complaints || [],
      ENQUIRIES: db.enquiries || [],
      INVENTORY: [],
      STAFF: [],
      DONORS: [],
      AUTOMATIONS: [],
      SCHOOLS: [],
      USERS: [],
      AUDIT: db.audit || [],
      DAILY_LOGS: db.dailyLogs || [],
      ANOMALIES: [], DONATION_PIPELINE: [], COMPLIANCE: [], AI_BRIEF: [],
      TRUST_KPIS: { students: { value: "0" }, collected: { value: "0%" }, donations: { value: "₹0" }, teacherNPS: { value: "—" } },
    };
  },
  async addStudent(body) {
    if (!body || !body.name || !body.name.trim()) return { ok: false, error: "Name is required" };
    let parent = "—";
    if (body.parent && String(body.parent).trim() && String(body.parent).trim() !== "—") {
      const f = formatIndianPhone(body.parent);
      if (f === null) return { ok: false, error: "Parent phone must be a 10-digit Indian mobile number starting with 6, 7, 8 or 9" };
      parent = f;
    }
    const cls = Number(body.cls) || 1;
    const section = (body.section || "A").toUpperCase();
    const id = "STN-" + String(9000 + Math.floor(Math.random() * 999)).padStart(4, "0");
    const row = {
      id, name: body.name.trim(), cls: \`\${cls}-\${section}\`, parent,
      fee: "pending", attendance: 0, transport: body.transport || "—",
      joined: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
      status: "active",
    };
    const db = readDb();
    db.addedStudents.unshift(row);
    db.pendingFees.unshift({ id, name: row.name, cls: row.cls, amount: termFeeFor(row.cls), due: "in 7 days", overdue: false });
    writeDb(db);
    logAudit("Rashmi Iyer", "New admission", \`\${id} \${row.name}\`);
    return { ok: true, student: row };
  },
  async archiveStudent(id) {
    const db = readDb();
    const idx = db.addedStudents.findIndex(s => s.id === id);
    if (idx === -1) return { ok: false, error: "Not found" };
    db.addedStudents[idx] = { ...db.addedStudents[idx], status: "archived", archivedAt: new Date().toISOString() };
    db.pendingFees = db.pendingFees.filter(f => f.id !== id);
    writeDb(db);
    logAudit("Rashmi Iyer", "Archived student", \`\${id} \${db.addedStudents[idx].name} · history kept\`);
    return { ok: true, student: db.addedStudents[idx] };
  },
  async restoreStudent(id) {
    const db = readDb();
    const idx = db.addedStudents.findIndex(s => s.id === id);
    if (idx === -1) return { ok: false, error: "Not found" };
    db.addedStudents[idx] = { ...db.addedStudents[idx], status: "active", archivedAt: null };
    const s = db.addedStudents[idx];
    if (!db.pendingFees.find(f => f.id === id)) {
      db.pendingFees.unshift({ id, name: s.name, cls: s.cls, amount: termFeeFor(s.cls), due: "in 7 days", overdue: false });
    }
    writeDb(db);
    logAudit("Rashmi Iyer", "Restored student", \`\${id} \${s.name}\`);
    return { ok: true, student: s };
  },
  async importStudents(csv) {
    if (typeof csv !== "string" || !csv.trim()) return { ok: false, error: "csv body required" };
    // Tiny CSV parser supporting quoted cells
    const rows = [];
    let i = 0, cell = "", row = [], inQ = false;
    while (i < csv.length) {
      const c = csv[i];
      if (inQ) { if (c === '"') { if (csv[i+1] === '"') { cell += '"'; i += 2; continue; } inQ = false; i++; continue; } cell += c; i++; continue; }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === ",") { row.push(cell); cell = ""; i++; continue; }
      if (c === "\\n" || c === "\\r") { if (cell.length || row.length) { row.push(cell); rows.push(row); row = []; cell = ""; } if (c === "\\r" && csv[i+1] === "\\n") i++; i++; continue; }
      cell += c; i++;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    const cleaned = rows.filter(r => r.length && r.some(c => c.trim()));
    if (cleaned.length < 2) return { ok: false, error: "Need at least one header row and one data row" };
    const header = cleaned[0].map(h => h.toLowerCase().trim());
    const idx = (k) => header.findIndex(h => h.includes(k));
    const ni = idx("name"), ci = idx("class"), pi = idx("parent"), ti = idx("transport");
    if (ni === -1) return { ok: false, error: "CSV needs a Name column" };
    const db = readDb();
    let count = 0;
    for (const cells of cleaned.slice(1)) {
      const name = (cells[ni] || "").trim();
      if (!name) continue;
      const clsRaw = (cells[ci] || "1-A").trim();
      const cls = /^\\d/.test(clsRaw) ? (clsRaw.includes("-") ? clsRaw : \`\${clsRaw}-A\`) : "1-A";
      const id = "STN-" + String(9000 + Math.floor(Math.random() * 999)).padStart(4, "0");
      const row = { id, name, cls, parent: (cells[pi] || "—").trim(), fee: "pending", attendance: 0, transport: (cells[ti] || "—").trim(), joined: new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }), status: "active" };
      db.addedStudents.unshift(row);
      db.pendingFees.unshift({ id, name, cls, amount: termFeeFor(cls), due: "in 7 days", overdue: false });
      count++;
    }
    writeDb(db);
    logAudit("Rashmi Iyer", "Bulk import", \`\${count} students added\`);
    return { ok: true, count };
  },
  async payFee(id, method = "UPI") {
    const db = readDb();
    const idx = db.pendingFees.findIndex(f => f.id === id);
    if (idx === -1) return { ok: false, error: "Not found" };
    const fee = db.pendingFees[idx];
    db.pendingFees.splice(idx, 1);
    const paid = { id: fee.id, name: fee.name, cls: fee.cls, amount: fee.amount, method, time: "just now", status: "paid" };
    db.recentFees.unshift(paid);
    const sIdx = db.addedStudents.findIndex(s => s.id === id);
    if (sIdx !== -1) db.addedStudents[sIdx].fee = "paid";
    db.activities.unshift({ t: "fee", tone: "accent", title: \`Fee received · \${fee.id} \${fee.name}\`, sub: \`\${method} · ₹\${fee.amount.toLocaleString("en-IN")} · receipt auto-sent\`, ts: "now" });
    writeDb(db);
    logAudit("Rashmi Iyer", "Marked fee paid", \`\${fee.id} \${fee.name}\`);
    return { ok: true, fee: paid };
  },
  async remindFees(ids, channel = "WhatsApp") {
    const db = readDb();
    const matched = db.pendingFees.filter(f => ids.includes(f.id));
    if (matched.length === 0) return { ok: false, error: "No matching fees" };
    db.activities.unshift({ t: "automation", tone: "accent", title: \`Fee reminder fired · \${matched.length} families\`, sub: \`\${channel} sent · \${matched.map(m => m.name).slice(0,3).join(", ")}\${matched.length > 3 ? "…" : ""}\`, ts: "now" });
    writeDb(db);
    for (const f of matched) logAudit("Rashmi Iyer", \`Reminder · \${channel}\`, \`\${f.id} \${f.name}\`);
    return { ok: true, count: matched.length };
  },
  async patchComplaint(id, status) {
    const db = readDb();
    const idx = db.complaints.findIndex(c => c.id === id);
    if (idx === -1) return { ok: false, error: "Not found" };
    db.complaints[idx] = { ...db.complaints[idx], status };
    writeDb(db);
    logAudit("Rashmi Iyer", \`Complaint → \${status}\`, \`\${id} \${db.complaints[idx].student}\`);
    return { ok: true, complaint: db.complaints[idx] };
  },
  async patchEnquiry(id, status) {
    const db = readDb();
    const idx = db.enquiries.findIndex(e => e.id === id);
    if (idx === -1) return { ok: false, error: "Not found" };
    db.enquiries[idx] = { ...db.enquiries[idx], status };
    writeDb(db);
    logAudit("Rashmi Iyer", \`Enquiry → \${status}\`, \`\${id} \${db.enquiries[idx].name}\`);
    return { ok: true, enquiry: db.enquiries[idx] };
  },
  async addEnquiry(body) {
    const db = readDb();
    const id = "ENQ-" + String(1124 + Math.floor(Math.random() * 999)).padStart(4, "0");
    const row = { id, name: body.name || "New enquiry", parent: body.parent || "—", phone: body.phone || "—", cls: Number(body.cls) || 1, source: body.source || "Website", date: "Today", status: "New" };
    db.enquiries.unshift(row);
    writeDb(db);
    logAudit("System", "Enquiry created", \`\${id} \${row.name}\`);
    return { ok: true, enquiry: row };
  },
  async setStopBoarding(code, stopName, action) {
    const db = readDb();
    const route = db.routes.find(r => r.code === code);
    if (!route) return { ok: false, error: "Route or stop not found" };
    const stop = route.stops.find(s => s.name === stopName);
    if (!stop) return { ok: false, error: "Stop not found" };
    if (action === "board" && stop.boarded + stop.absent < stop.cap) stop.boarded += 1;
    else if (action === "absent") {
      if (stop.boarded + stop.absent < stop.cap) stop.absent += 1;
      else if (stop.boarded > 0) { stop.boarded -= 1; stop.absent += 1; }
    }
    writeDb(db);
    logAudit(\`\${route.driver} (driver)\`, \`Marked \${action}\`, \`\${code} · \${stopName}\`);
    return { ok: true, route };
  },
  async upsertDailyLog(body) {
    if (!body.studentId || !body.date) return { ok: false, error: "studentId and date are required" };
    const db = readDb();
    if (!Array.isArray(db.dailyLogs)) db.dailyLogs = [];
    const row = {
      studentId: body.studentId, studentName: body.studentName || "", cls: body.cls || "",
      date: body.date,
      classwork: (body.classwork || "").trim(), homework: (body.homework || "").trim(),
      topics: (body.topics || "").trim(),
      handwritingNote: (body.handwritingNote || "").trim(),
      handwritingGrade: (body.handwritingGrade || "").trim(),
      behaviour: (body.behaviour || "").trim(), extra: (body.extra || "").trim(),
      postedBy: body.postedBy || "Teacher", postedAt: new Date().toISOString(),
    };
    const idx = db.dailyLogs.findIndex(l => l.studentId === row.studentId && l.date === row.date);
    const fresh = idx === -1;
    if (fresh) db.dailyLogs.unshift(row); else db.dailyLogs[idx] = row;
    writeDb(db);
    logAudit(row.postedBy, fresh ? "Posted daily log" : "Updated daily log", \`\${row.studentId} \${row.studentName} · \${row.date}\`);
    return { ok: true, log: row };
  },
};
window.store = store;
`;

// ---------- bootstrap (App) ----------
const BOOTSTRAP_JS = `
// Top-level App
const App = () => {
  const [data, setData] = React.useState(null);
  const refresh = React.useCallback(async () => {
    const d = await store.readAllData();
    setData(d);
  }, []);
  React.useEffect(() => { refresh(); }, [refresh]);
  if (!data) return null;
  return <AppShell initialData={data} refresh={refresh} />;
};
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
`;

// ---------- patch source files for the standalone build ----------
function patch(src) {
  let out = stripModule(src);

  // Replace AppShell's /api/data refresh with a direct store call
  out = out.replace(
    /const r = await fetch\("\/api\/data"[^)]+\);[\s\S]*?const json = await r\.json\(\);/,
    "const json = await store.readAllData();"
  );

  // Replace fetch("/api/X", { method: ..., body: ... }) with store.X(...)
  // For simplicity, we replace each known call pattern.
  out = out
    .replace(/await fetch\("\/api\/students", \{[^}]+method:\s*"POST"[^}]*body:\s*JSON\.stringify\(([^)]+)\)[^}]*\}\)/gs, "({ ok: true, json: await store.addStudent($1) })")
    .replace(/await fetch\("\/api\/students", \{[^}]+method:\s*"DELETE"[^}]*body:\s*JSON\.stringify\(\{ id: ([^}]+) \}\)[^}]*\}\)/gs, "({ ok: true, json: await store.archiveStudent($1) })")
    .replace(/await fetch\("\/api\/students\/restore"[^)]+JSON\.stringify\(\{ id: ([^}]+) \}\)[^)]+\)/gs, "({ ok: true, json: await store.restoreStudent($1) })")
    .replace(/await fetch\("\/api\/students\/import"[^)]+JSON\.stringify\(\{ csv \}\)[^)]+\)/gs, "({ ok: true, json: await store.importStudents(csv) })")
    .replace(/await fetch\("\/api\/fees\/pay"[^)]+JSON\.stringify\(\{ id: ([^,]+), method \}\)[^)]+\)/gs, "({ ok: true, json: await store.payFee($1, method) })")
    .replace(/await fetch\("\/api\/fees\/remind"[^)]+JSON\.stringify\(\{ ids, channel \}\)[^)]+\)/gs, "({ ok: true, json: await store.remindFees(ids, channel) })")
    .replace(/await fetch\("\/api\/complaints",\s*\{[\s\S]*?body:\s*JSON\.stringify\(\{([^}]+)\}\)[\s\S]*?\}\)/g,
      (_m, body) => `await (async () => { const __b = {${body}}; return store.patchComplaint(__b.id, __b.status); })()`)
    .replace(/await fetch\("\/api\/enquiries",\s*\{[\s\S]*?body:\s*JSON\.stringify\(\{([^}]+)\}\)[\s\S]*?\}\)/g,
      (_m, body) => `await (async () => { const __b = {${body}}; return store.patchEnquiry(__b.id, __b.status); })()`)
    .replace(/await fetch\("\/api\/transport\/board"[^)]+JSON\.stringify\(\{ code: route\.code, stopName, action \}\)[^)]+\)/gs, "({ ok: true, json: await store.setStopBoarding(route.code, stopName, action) })")
    .replace(/await fetch\("\/api\/academic\/log"[^)]+JSON\.stringify\(\{[\s\S]*?\.\.\.form,[\s\S]*?\}\)[^)]+\)/gs,
      "({ ok: true, json: await store.upsertDailyLog({ ...form, studentId: student.id, studentName: student.name, cls: `${cls}-${sec}`, date: TODAY_ISO, postedBy: \"Teacher\" }) })"
    );

  // After each fetch swap, the next line was usually `const json = await r.json();`
  // — strip those that became dead code (the result of our wrapper IS the json).
  out = out.replace(/const json = await r\.json\(\)\.catch\(\(\) => \(\{\}\)\);?/g, "");
  out = out.replace(/const json = await r\.json\(\);?/g, "");
  // Some routes used `if (json.ok)` — that's fine, still works.
  // Replace the safeFetch wrapper inside Students.jsx with a store-backed
  // version. Use brace counting to find the actual end of the arrow function
  // — non-greedy regex matched the inner `};` of a return statement and
  // produced a syntax error.
  const SAFE_FETCH_REPLACEMENT = `const safeFetch = async (url, init) => {
    try {
      const method = (init && init.method) || "GET";
      const body = init && init.body ? JSON.parse(init.body) : null;
      let json = { ok: false };
      if (url === "/api/students" && method === "POST") json = await store.addStudent(body);
      else if (url === "/api/students" && method === "DELETE") json = await store.archiveStudent(body.id);
      else if (url === "/api/students/restore") json = await store.restoreStudent(body.id);
      else if (url === "/api/students/import") json = await store.importStudents(body.csv);
      else if (url === "/api/fees/pay") json = await store.payFee(body.id, body.method);
      else if (url === "/api/fees/remind") json = await store.remindFees(body.ids, body.channel);
      else if (url === "/api/complaints") json = await store.patchComplaint(body.id, body.status);
      else if (url === "/api/enquiries") json = await store.patchEnquiry(body.id, body.status);
      else if (url === "/api/academic/log") json = await store.upsertDailyLog(body);
      return { ok: !!json.ok, status: 200, json };
    } catch (e) {
      return { ok: false, status: 0, json: { error: "Storage error: " + e.message } };
    }
  };`;
  const HEAD = "const safeFetch = async (url, init) => {";
  const start = out.indexOf(HEAD);
  if (start !== -1) {
    let depth = 1, i = start + HEAD.length;
    while (i < out.length && depth > 0) {
      if (out[i] === "{") depth++;
      else if (out[i] === "}") depth--;
      i++;
    }
    if (out[i] === ";") i++;          // consume the trailing semicolon
    out = out.slice(0, start) + SAFE_FETCH_REPLACEMENT + out.slice(i);
  }

  return out;
}

// ---------- assemble ----------
const components = [
  "components/Icon.jsx",
  "components/ui.jsx",
  "components/Sidebar.jsx",
  "components/MobileShell.jsx",
  "components/Tweaks.jsx",
];
const screens = fs.readdirSync(path.join(ROOT, "components/screens"))
  .filter(f => f.endsWith(".jsx"))
  .map(f => "components/screens/" + f);

// Format helpers (lib/format.js)
const FORMAT_JS = `
const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
const moneyK = (n) => {
  if (n >= 10000000) return "₹" + (n/10000000).toFixed(2) + "Cr";
  if (n >= 100000)   return "₹" + (n/100000).toFixed(2) + "L";
  if (n >= 1000)     return "₹" + (n/1000).toFixed(1) + "K";
  return "₹" + n;
};
`;

// Components/screens use bare hook names like `useState(...)` because their
// imports were stripped. Alias them once globally so they resolve to React.X.
const HOOKS_JS = `
const { useState, useEffect, useRef, useMemo, useCallback, useContext, Fragment, createContext } = React;
`;

let bigJs = HOOKS_JS + "\n" + STORE_JS + "\n" + FORMAT_JS + "\n";
// Components are flat helpers — they need to be in the global scope so screens
// and AppShell can use them. No wrapping needed.
for (const f of components) bigJs += "\n// ===== " + f + " =====\n" + patch(r(f)) + "\n";

// Each screen file declares its OWN local helpers (Toast, Field, FilterMenu,
// modals…). If we dump them all flat into one scope the names collide. Wrap
// each file in an IIFE so helpers stay scoped, and explicitly expose just
// the Screen<Name> function on the global window object for AppShell to pick up.
function wrapScreen(content, file) {
  const base = path.basename(file, ".jsx");      // Dashboard
  const name = "Screen" + base;                  // ScreenDashboard
  return `;(function(){\n${content}\nwindow.${name} = ${name};\n})();\nvar ${name} = window.${name};`;
}

// Screens depend on each other only through the SCREENS map in AppShell —
// inline them all, then inline AppShell.
for (const f of screens) bigJs += "\n// ===== " + f + " =====\n" + wrapScreen(patch(r(f)), f) + "\n";
bigJs += "\n// ===== components/AppShell.jsx =====\n" + patch(r("components/AppShell.jsx")) + "\n";

// ---------- emit HTML ----------
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Stansford International HR.Sec.School · Vidyalaya360</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
${css}
</style>
</head>
<body class="paper">
<div id="root"></div>

<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" crossorigin></script>

<script type="text/babel">
${bigJs}
${BOOTSTRAP_JS}
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
console.log("Wrote " + OUT + " — " + (html.length / 1024).toFixed(1) + " KB");
