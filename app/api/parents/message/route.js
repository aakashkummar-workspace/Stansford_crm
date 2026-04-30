import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { addBroadcast, logAudit } from "@/lib/db";

export const dynamic = "force-dynamic";

const CAN_MESSAGE = new Set(["admin", "principal", "teacher"]);

// POST /api/parents/message  { studentId, studentName, cls?, message }
// Writes an in-app broadcast addressed to a single student. The parent sees
// it on their dashboard ("From the school" card) — no WhatsApp / SMS leaves
// the system.
export async function POST(req) {
  const session = await getSession();
  if (!session || !CAN_MESSAGE.has(session.role)) {
    return NextResponse.json({ ok: false, error: "Not authorised" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  const studentId = body?.studentId;
  const studentName = body?.studentName || studentId || "Student";
  const message = (body?.message || "").trim();
  if (!studentId) return NextResponse.json({ ok: false, error: "studentId required" }, { status: 400 });
  if (!message) return NextResponse.json({ ok: false, error: "message required" }, { status: 400 });

  try {
    const broadcast = await addBroadcast({
      campaign: `Message from ${session.name || "School"}`,
      channel: "in_app",
      audience: `student_${studentId}`,
      audienceLabel: studentName,
      message,
      sent: 1,
      delivered: 1,
    });
    try {
      await logAudit(
        session.name || "Staff",
        "Sent in-app message to parent",
        `${studentName} (${studentId}) · ${message.length} char${message.length === 1 ? "" : "s"}`
      );
    } catch {}
    return NextResponse.json({ ok: true, broadcast });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: 500 });
  }
}
