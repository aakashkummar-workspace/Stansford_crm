import { NextResponse } from "next/server";
import { addStudent, addPendingFee, logAudit } from "@/lib/db";

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
  const n = Number(String(cls).split("-")[0]) || 1;
  return 14000 + n * 1000;
}

export async function POST(req) {
  const { csv } = await req.json();
  if (typeof csv !== "string" || !csv.trim()) {
    return NextResponse.json({ ok: false, error: "csv body required" }, { status: 400 });
  }
  const rows = parseCsv(csv).filter((r) => r.length && r.some((c) => c.trim()));
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
  for (const cells of rows.slice(1)) {
    const name = (cells[ni] || "").trim();
    if (!name) continue;
    const clsRaw = (cells[ci] || "1-A").trim();
    const cls = /^\d/.test(clsRaw) ? (clsRaw.includes("-") ? clsRaw : `${clsRaw}-A`) : "1-A";
    const row = {
      id: newId(),
      name,
      cls,
      parent: (cells[pi] || "—").trim(),
      fee: "pending",
      attendance: 0,
      transport: (cells[ti] || "—").trim(),
      joined: monthYear(),
    };
    await addStudent(row);
    await addPendingFee({
      id: row.id, name: row.name, cls: row.cls,
      amount: termFeeFor(row.cls), due: "in 7 days", overdue: false,
    });
    created.push(row);
  }
  await logAudit("Rashmi Iyer", "Bulk import", `${created.length} students added`);
  return NextResponse.json({ ok: true, count: created.length, students: created });
}
