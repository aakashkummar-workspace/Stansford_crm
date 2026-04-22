import { NextResponse } from "next/server";
import { patchComplaintStatus, addComplaint, logAudit } from "@/lib/db";

export async function PATCH(req) {
  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ ok: false, error: "id+status required" }, { status: 400 });
  const updated = await patchComplaintStatus(id, status);
  if (!updated) return NextResponse.json({ ok: false }, { status: 404 });
  await logAudit("Rashmi Iyer", `Complaint → ${status}`, `${updated.id} ${updated.student}`);
  return NextResponse.json({ ok: true, complaint: updated });
}

// Parents and staff submit new complaints (or leave requests) here.
export async function POST(req) {
  const body = await req.json();
  if (!body || !String(body.issue || "").trim()) {
    return NextResponse.json({ ok: false, error: "Please describe the issue or leave reason" }, { status: 400 });
  }
  const row = await addComplaint(body);
  await logAudit(
    body.parent || "Parent",
    body.type === "leave_request" ? "Leave request submitted" : "Complaint submitted",
    `${row.id} · ${body.student || "—"}`
  );
  return NextResponse.json({ ok: true, complaint: row });
}
