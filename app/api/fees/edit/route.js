import { NextResponse } from "next/server";
import { editStudentFee, addActivity, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/fees/edit { id, total, paid }
// Edits a student's annual fee — supports raising the total AND/OR
// recording an "already paid" amount in one call. Both numbers are
// increase-only at the storage layer (see db.editStudentFee for the
// guard logic). Successful edits are snapshotted so the admin has a
// one-hour window to undo via /api/fees/undo.
//
// Parents are read-only.
export async function POST(req) {
  const session = await getSession();
  if (session?.role === "parent") {
    return NextResponse.json(
      { ok: false, error: "Only school staff can edit fee amounts." },
      { status: 403 }
    );
  }
  const actor = session?.name || "Staff";

  let body; try { body = await req.json(); } catch { body = null; }
  const id = body?.id;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  if (body.total == null || body.total === "") {
    return NextResponse.json({ ok: false, error: "total required" }, { status: 400 });
  }
  const total = Math.floor(Number(body.total));
  const paid  = Math.max(0, Math.floor(Number(body.paid) || 0));
  if (!Number.isFinite(total) || total < 0) {
    return NextResponse.json({ ok: false, error: "Total must be 0 or more" }, { status: 400 });
  }

  let result;
  try {
    result = await editStudentFee({ studentId: id, newTotal: total, newPaid: paid, actor });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
  }

  try {
    await addActivity({
      t: "fee", tone: "warn",
      title: `Fee updated · ${id}`,
      sub: `total ₹${total.toLocaleString("en-IN")} · paid ₹${paid.toLocaleString("en-IN")}`,
      ts: "now",
    });
  } catch {}
  try {
    await logAudit(actor, "Edited fee", `${id} · total ₹${total.toLocaleString("en-IN")} · paid ₹${paid.toLocaleString("en-IN")}`);
  } catch {}

  return NextResponse.json({ ok: true, ...result });
}
