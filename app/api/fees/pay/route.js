import { NextResponse } from "next/server";
import { readDb, writeDb, logAudit } from "@/lib/db";

export async function POST(req) {
  const { id, method = "UPI" } = await req.json();
  const db = readDb();
  const idx = db.pendingFees.findIndex((f) => f.id === id);
  if (idx === -1) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const fee = db.pendingFees[idx];
  db.pendingFees.splice(idx, 1);
  const paid = {
    id: fee.id,
    name: fee.name,
    cls: fee.cls,
    amount: fee.amount,
    method,
    time: "just now",
    status: "paid",
  };
  db.recentFees.unshift(paid);

  // Reflect the change on the student record so the Students roster
  // shows "Paid" instead of stale "Pending" after payment.
  const sIdx = db.addedStudents.findIndex((s) => s.id === fee.id);
  if (sIdx !== -1) db.addedStudents[sIdx].fee = "paid";

  db.activities.unshift({
    t: "fee", tone: "accent",
    title: `Fee received · ${fee.id} ${fee.name}`,
    sub: `${method} · ₹${fee.amount.toLocaleString("en-IN")} · receipt auto-sent`,
    ts: "now",
  });
  writeDb(db);
  logAudit("Rashmi Iyer", "Marked fee paid", `${fee.id} ${fee.name}`);
  return NextResponse.json({ ok: true, fee: paid });
}
