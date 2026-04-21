import { NextResponse } from "next/server";
import { restoreStudent, addPendingFee, logAudit } from "@/lib/db";

function termFeeFor(cls) {
  const n = Number(String(cls).split("-")[0]) || 1;
  return 14000 + n * 1000;
}

// Bring an archived student back to active. Re-creates a pending fee for the
// current term so they show up in Fees & UPI again.
export async function POST(req) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const restored = await restoreStudent(id);
  if (!restored) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  await addPendingFee({
    id: restored.id,
    name: restored.name,
    cls: restored.cls,
    amount: termFeeFor(restored.cls),
    due: "in 7 days",
    overdue: false,
  });
  await logAudit("Rashmi Iyer", "Restored student", `${restored.id} ${restored.name}`);
  return NextResponse.json({ ok: true, student: restored });
}
