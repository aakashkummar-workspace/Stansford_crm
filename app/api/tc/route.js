import { NextResponse } from "next/server";
import { addTcRequest, listTcRequests, updateTcRequest, removeTcRequest, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CAN_MANAGE = new Set(["admin", "principal"]);

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, requests: await listTcRequests() });
}

// POST { studentId, studentName, cls, reason }
export async function POST(req) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.has(session.role)) {
    return NextResponse.json({ ok: false, error: "Not authorised" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.studentId) return NextResponse.json({ ok: false, error: "studentId required" }, { status: 400 });
  try {
    const tc = await addTcRequest({ ...body, requestedBy: session.name || session.email });
    try { await logAudit(session.name || "User", "TC requested", `${tc.id} · ${tc.studentName} (${tc.cls})`); } catch {}
    return NextResponse.json({ ok: true, request: tc });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: 500 });
  }
}

// PATCH { id, status, reason? } — flip approval / issue.
export async function PATCH(req) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.has(session.role)) {
    return NextResponse.json({ ok: false, error: "Not authorised" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const updated = await updateTcRequest(body.id, { ...body, issuedBy: session.name || session.email });
  if (!updated) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  try { await logAudit(session.name || "User", "TC updated", `${updated.id} · status=${updated.status}${updated.serialNo ? ` · ${updated.serialNo}` : ""}`); } catch {}
  return NextResponse.json({ ok: true, request: updated });
}

export async function DELETE(req) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.has(session.role)) {
    return NextResponse.json({ ok: false, error: "Not authorised" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const removed = await removeTcRequest(body.id);
  if (!removed) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  try { await logAudit(session.name || "User", "TC removed", `${removed.id}`); } catch {}
  return NextResponse.json({ ok: true });
}
