import { NextResponse } from "next/server";
import { markAttendanceBulk, logAudit } from "@/lib/db";
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
    const present = logs.filter((l) => l.attendance !== "absent").length;
    const absent  = logs.length - present;
    try {
      await logAudit(actor, "Marked class attendance", `${body.cls || ""} · ${body.date} · ${present} present, ${absent} absent`);
    } catch {}
    return NextResponse.json({ ok: true, count: logs.length, present, absent, logs });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: 500 });
  }
}
