import { NextResponse } from "next/server";
import { addStudent, addPendingFee, logAudit, provisionParentLogin } from "@/lib/db";

// Tiny CSV parser — handles quoted cells with commas inside.
function parseCsv(text) {
  const rows = [];
  let i = 0, cell = "", row = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      cell += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { row.push(cell); cell = ""; i++; continue; }
    if (c === "\n" || c === "\r") {
      if (cell.length || row.length) { row.push(cell); rows.push(row); row = []; cell = ""; }
      if (c === "\r" && text[i + 1] === "\n") i++;
      i++; continue;
    }
    cell += c; i++;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const monthYear = () =>
  new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" });
const newId = () => `STN-${9000 + Math.floor(Math.random() * 999)}`;
function termFeeFor(cls) {
  // Use absolute value so MONT/pre-school students (stored as negative n)
  // still get a sensible fee structure rather than negative amounts.
  const n = Math.abs(Number(String(cls).split(/(?<=^-?\d+)-/)[0]) || 1);
  return 14000 + n * 1000;
}

// Indian schools mix three notations for class levels in roster files:
// numeric ("5"), Roman ("V"), and Montessori labels ("PRE-MONT", "MONT 1").
// The on-disk students.cls field stays "N-X" (e.g. "5-A") because dozens
// of screens parse that shape via cls.split("-"). We use HIGH positive
// integers for pre-school so they don't collide with primary grades AND
// don't break any "split('-')[0]" code that expects a number.
//
//   PRE-MONT / Nursery / Pre-KG    → 13   (label "PRE-MONT")
//   MONT 1 / LKG                   → 14   (label "MONT 1")
//   MONT 2 / UKG                   → 15   (label "MONT 2")
//   I, II, III … XII               → 1..12
//
// addStudent → ensureClassSection auto-creates any missing class entry
// using labelForClass below, so the Classes screen surfaces them
// automatically the first time a student lands in that bucket.
// Trade-off: pre-school cards sort AFTER Class 12 on the Classes screen.
// That's acceptable for the first launch; can be reordered later with
// an explicit display-order column.
function romanToInt(s) {
  if (!s || !/^[IVXLCDM]+$/i.test(s)) return null;
  const m = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  const u = s.toUpperCase();
  for (let i = 0; i < u.length; i++) {
    const cur = m[u[i]];
    const nxt = m[u[i + 1]];
    if (nxt && cur < nxt) total -= cur;
    else total += cur;
  }
  return total || null;
}

function classNumFromText(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, " ");
  if (!s) return null;
  if (/^-?\d+$/.test(s)) return Number(s);
  const r = romanToInt(s);
  if (r !== null && r > 0 && r < 100) return r;
  // Pre-school synonyms — common spellings/aliases collapsed to one bucket each.
  if (/^(PRE[- ]?MONT|PRE[- ]?KG|NURSERY|NUR|PLAY ?GROUP|PG)$/.test(s)) return 13;
  if (/^(LKG|KG1|MONT ?1)$/.test(s)) return 14;
  if (/^(UKG|KG2|MONT ?2)$/.test(s)) return 15;
  return null;
}

export function parseClassValue(raw) {
  const s = String(raw || "").trim().toUpperCase().replace(/\s+/g, " ");
  if (!s) return "1-A";
  // "<class><sep><section>" where sep is space or dash and section is one
  // uppercase letter. Lets "III-A", "V B", "1-A" all work.
  const sep = s.match(/^(.+?)[ -]([A-Z])$/);
  if (sep) {
    const n = classNumFromText(sep[1]);
    if (n !== null) return `${n}-${sep[2]}`;
  }
  const n = classNumFromText(s);
  if (n !== null) return `${n}-A`;
  return "1-A";
}

export async function POST(req) {
  let body; try { body = await req.json(); } catch { body = null; }
  const csv = body?.csv;
  if (typeof csv !== "string" || !csv.trim()) {
    return NextResponse.json({ ok: false, error: "csv body required" }, { status: 400 });
  }
  let rows;
  try {
    rows = parseCsv(csv).filter((r) => r.length && r.some((c) => c.trim()));
  } catch (e) {
    return NextResponse.json({ ok: false, error: `CSV parse failed: ${e.message}` }, { status: 400 });
  }
  if (rows.length < 2) {
    return NextResponse.json({ ok: false, error: "Need at least one header row and one data row" }, { status: 400 });
  }
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const idx = (k) => header.findIndex((h) => h.includes(k));
  const ni = idx("name"), ci = idx("class"), pi = idx("parent"), ti = idx("transport");
  if (ni === -1) {
    return NextResponse.json({ ok: false, error: "CSV needs a Name column" }, { status: 400 });
  }

  const created = [];
  const errors = [];
  // Parent logins auto-provisioned alongside each imported student. The
  // admin needs these to hand to parents, so they're collected here and
  // returned in the import response (the Students screen surfaces them
  // as a downloadable CSV after the import modal closes).
  const logins = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const name = (cells[ni] || "").trim();
    if (!name) continue;
    const cls = parseClassValue(cells[ci]);
    const row = {
      id: newId(), name, cls,
      parent: (cells[pi] || "—").trim(),
      fee: "pending", attendance: 0,
      transport: (cells[ti] || "—").trim(),
      joined: monthYear(),
    };
    try {
      await addStudent(row);
      await addPendingFee({
        id: row.id, name: row.name, cls: row.cls,
        amount: termFeeFor(row.cls), due: "in 7 days", overdue: false,
      });
      // Mirror the single-admission flow: each imported student gets a
      // parent login scoped to their own child. Failures here are
      // non-fatal — the student row is already saved, the admin can
      // re-issue the login from the Students screen.
      try {
        const cred = await provisionParentLogin({
          studentId: row.id,
          studentName: row.name,
          parentEmail: null,
        });
        if (cred) {
          logins.push({
            studentId: row.id,
            studentName: row.name,
            cls: row.cls,
            email: cred.email,
            password: cred.defaultPassword,
          });
        }
      } catch (e) {
        console.warn(`[import] login provisioning failed for ${row.id}: ${e.message}`);
      }
      created.push(row);
    } catch (e) {
      errors.push({ row: r + 1, name, reason: e.message || "Failed" });
    }
  }
  try {
    await logAudit(
      "Rashmi Iyer",
      "Bulk import",
      `${created.length} students added · ${logins.length} parent logins issued${errors.length ? ` · ${errors.length} skipped` : ""}`
    );
  } catch {}
  return NextResponse.json({ ok: true, count: created.length, students: created, logins, errors });
}
