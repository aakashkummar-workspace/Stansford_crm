import { NextResponse } from "next/server";
import { readDb, writeDb, append, logAudit } from "@/lib/db";

const monthYear = () =>
  new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" });

const newId = () => `STN-${9000 + Math.floor(Math.random() * 999)}`;

// Term fee per class — simple linear schedule. Override later in Settings.
function termFeeFor(cls) {
  const n = Number(String(cls).split("-")[0]) || 1;
  return 14000 + n * 1000;
}

// Accepts a 10-digit Indian mobile and returns the canonical
// "+91 XXXXX XXXXX" form. Returns null on anything that isn't valid.
// Strips a leading "+91" / "91" / "0" courtesy prefix before counting digits,
// but the remaining number must be exactly 10 digits and start with 6/7/8/9.
function formatIndianPhone(raw) {
  if (!raw) return "—";
  let digits = String(raw).replace(/\D/g, "");
  // Strip a single courtesy country/trunk prefix ONCE.
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (digits.length !== 10 || !/^[6-9]/.test(digits)) return null;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export async function POST(req) {
  const body = await req.json();
  if (!body || !body.name || !body.name.trim()) {
    return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
  }
  let parent = "—";
  if (body.parent && String(body.parent).trim() && String(body.parent).trim() !== "—") {
    const formatted = formatIndianPhone(body.parent);
    if (formatted === null) {
      return NextResponse.json(
        { ok: false, error: "Parent phone must be a 10-digit Indian mobile number starting with 6, 7, 8 or 9" },
        { status: 400 }
      );
    }
    parent = formatted;
  }
  const cls = Number(body.cls) || 1;
  const section = (body.section || "A").toUpperCase();
  const row = {
    id: newId(),
    name: body.name.trim(),
    cls: `${cls}-${section}`,
    parent,
    fee: "pending",
    attendance: 0,
    transport: body.transport || "—",
    joined: monthYear(),
  };

  // Persist student + auto-create a pending fee row for the term.
  const db = readDb();
  db.addedStudents.unshift(row);
  db.pendingFees.unshift({
    id: row.id,
    name: row.name,
    cls: row.cls,
    amount: termFeeFor(row.cls),
    due: "in 7 days",
    overdue: false,
  });
  writeDb(db);

  logAudit("Rashmi Iyer", "New admission", `${row.id} ${row.name}`);
  return NextResponse.json({ ok: true, student: row });
}

export async function DELETE(req) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const db = readDb();
  const idx = db.addedStudents.findIndex((s) => s.id === id);
  if (idx === -1) return NextResponse.json({ ok: false, error: "Not found (or built-in roster row)" }, { status: 404 });
  const [removed] = db.addedStudents.splice(idx, 1);
  // Drop any pending fee row for this student so it doesn't dangle.
  db.pendingFees = db.pendingFees.filter((f) => f.id !== removed.id);
  writeDb(db);
  logAudit("Rashmi Iyer", "Removed student", `${removed.id} ${removed.name}`);
  return NextResponse.json({ ok: true });
}
