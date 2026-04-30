import { NextResponse } from "next/server";
import { recordTransportAttendance, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/transport/attendance
//   { studentId, date?, direction?, status, routeCode?, stopName?, studentName?, cls? }
// Records (or flips) a per-student boarding entry. Composite key is
// (studentId, date, direction) so re-tapping the same trip overwrites
// without leaving stale rows behind.
export async function POST(req) {
  const session = await getSession();
  // Parents must not be able to mark their own child boarded — only staff
  // physically at the bus do that.
  if (session?.role === "parent") {
    return NextResponse.json(
      { ok: false, error: "Only school staff can record transport attendance." },
      { status: 403 }
    );
  }
  const actor = session?.name || "Driver";

  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.studentId) {
    return NextResponse.json({ ok: false, error: "studentId required" }, { status: 400 });
  }
  if (!body?.status || !["boarded", "absent", "skipped"].includes(body.status)) {
    return NextResponse.json({ ok: false, error: "status must be boarded|absent|skipped" }, { status: 400 });
  }

  let row;
  try {
    row = await recordTransportAttendance({ ...body, markedBy: actor });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: 400 });
  }

  try {
    await logAudit(
      actor,
      `Transport ${row.status}`,
      `${row.studentName || row.studentId} · ${row.routeCode || "—"} · ${row.direction} · ${row.date}`
    );
  } catch {}

  return NextResponse.json({ ok: true, attendance: row });
}
