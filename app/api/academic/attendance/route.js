import { NextResponse } from "next/server";
import { markAttendanceBulk, logAudit, recordTransportAttendance } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  const session = await getSession();
  const actor = session?.name || "Teacher";

  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.date || !Array.isArray(body?.marks) || body.marks.length === 0) {
    return NextResponse.json({ ok: false, error: "date and marks[] required" }, { status: 400 });
  }
  try {
    const logs = await markAttendanceBulk({
      date: body.date,
      cls: body.cls || null,
      postedBy: actor,
      marks: body.marks,
    });

    // Teacher marked "Dropped by parent" → flip morning transport to
    // "parent" so evening drop-off is allowed. Only this status writes
    // transport from class attendance (plain class-absent must not
    // overwrite a student who already boarded the bus).
    for (const m of body.marks) {
      if (m?.attendance !== "parent_drop" || !m?.studentId) continue;
      try {
        await recordTransportAttendance({
          studentId: m.studentId,
          date: body.date,
          direction: "morning",
          status: "parent",
          studentName: m.studentName || null,
          cls: m.cls || body.cls || null,
          markedBy: actor,
        });
      } catch {}
    }

    const counts = { present: 0, late: 0, absent: 0, leave: 0, parent_drop: 0 };
    for (const l of logs) counts[l.attendance] = (counts[l.attendance] || 0) + 1;
    // mode: "initial" | "edit" | "correction"
    //   - edit       = teacher fixing their own marks the same day
    //   - correction = principal/admin changing a past day's record
    // Different audit-log verbs let the Audit screen distinguish first-save
    // from after-the-fact changes when someone investigates a discrepancy.
    const mode = body.mode === "edit" || body.mode === "correction" ? body.mode : "initial";
    const verb = mode === "correction" ? "Corrected class attendance"
                : mode === "edit"      ? "Updated class attendance"
                                       : "Marked class attendance";
    const reasonTail = body.correctionReason
      ? ` · reason: ${String(body.correctionReason).trim().slice(0, 200)}`
      : "";
    const parentTail = counts.parent_drop
      ? ` · ${counts.parent_drop} dropped by parent`
      : "";
    try {
      await logAudit(
        actor,
        verb,
        `${body.cls || ""} · ${body.date} · ${counts.present} present · ${counts.late} late · ${counts.absent} absent · ${counts.leave} on leave${parentTail}${reasonTail}`
      );
    } catch {}
    // Backwards-compat keys (`present`, `absent`) preserved alongside the
    // new `late` / `leave` / `parent_drop` totals so older callers don't break.
    return NextResponse.json({
      ok: true,
      count: logs.length,
      present: counts.present,
      late: counts.late,
      absent: counts.absent,
      leave: counts.leave,
      parent_drop: counts.parent_drop,
      logs,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: 500 });
  }
}
