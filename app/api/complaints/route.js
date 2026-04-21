import { NextResponse } from "next/server";
import { patchComplaintStatus, logAudit } from "@/lib/db";

export async function PATCH(req) {
  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ ok: false, error: "id+status required" }, { status: 400 });
  const updated = await patchComplaintStatus(id, status);
  if (!updated) return NextResponse.json({ ok: false }, { status: 404 });
  await logAudit("Rashmi Iyer", `Complaint → ${status}`, `${updated.id} ${updated.student}`);
  return NextResponse.json({ ok: true, complaint: updated });
}
