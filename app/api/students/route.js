import { NextResponse } from "next/server";
import { addStudent, archiveStudent, addPendingFee, logAudit } from "@/lib/db";

const monthYear = () =>
  new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" });

const newId = () => `STN-${9000 + Math.floor(Math.random() * 999)}`;

function termFeeFor(cls) {
  const n = Number(String(cls).split("-")[0]) || 1;
  return 14000 + n * 1000;
}

// Accepts a 10-digit Indian mobile (after stripping a courtesy +91/91/0 prefix)
// and returns "+91 XXXXX XXXXX". Returns null if not valid.
function formatIndianPhone(raw) {
  if (!raw) return "—";
  let digits = String(raw).replace(/\D/g, "");
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

  const student = await addStudent(row);
  await addPendingFee({
    id: row.id,
    name: row.name,
    cls: row.cls,
    amount: termFeeFor(row.cls),
    due: "in 7 days",
    overdue: false,
  });
  await logAudit("Rashmi Iyer", "New admission", `${row.id} ${row.name}`);

  return NextResponse.json({ ok: true, student });
}

// "Withdraw" — soft-delete. Student record + all financial history are kept;
// only the active flag flips and any uncollected pending fee is dropped.
export async function DELETE(req) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const archived = await archiveStudent(id);
  if (!archived) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  await logAudit("Rashmi Iyer", "Archived student", `${archived.id} ${archived.name} · history kept`);
  return NextResponse.json({ ok: true, student: archived });
}
