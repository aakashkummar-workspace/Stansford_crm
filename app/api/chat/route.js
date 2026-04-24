import { NextResponse } from "next/server";
import { listChatThreads, getOrCreateThread, appendChatMessage, listUsers, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/chat — list visible threads. Parent sees their own; teacher sees the
// ones where they're the teacher; admin/principal see everything.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const threads = await listChatThreads({ forEmail: session.email, role: session.role });
  return NextResponse.json({ ok: true, threads });
}

// POST /api/chat  { studentId, teacherEmail?, body, threadId? }
// Parent → teacher: studentId required, teacherEmail required (parent picks the teacher).
// Teacher → parent: threadId required (replying to an existing thread).
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.body?.trim()) return NextResponse.json({ ok: false, error: "body required" }, { status: 400 });

  let threadId = body.threadId;
  if (!threadId) {
    // Bootstrap a fresh thread — parent-initiated.
    if (!body.studentId || !body.teacherEmail) {
      return NextResponse.json({ ok: false, error: "studentId + teacherEmail required for new thread" }, { status: 400 });
    }
    // Resolve teacher and parent records.
    const users = await listUsers();
    const teacher = users.find((u) => (u.email || "").toLowerCase() === body.teacherEmail.toLowerCase() && u.role === "teacher");
    if (!teacher) return NextResponse.json({ ok: false, error: "Teacher not found" }, { status: 404 });
    // Parent is the signed-in user (security: never trust client-supplied parent email).
    const thread = await getOrCreateThread({
      parentEmail: session.email,
      parentName: session.name,
      teacherEmail: teacher.email,
      teacherName: teacher.name,
      studentId: body.studentId,
      studentName: body.studentName || "—",
      cls: body.cls || teacher.linkedClasses?.[0] || "—",
    });
    threadId = thread.id;
  }

  try {
    const { message, thread } = await appendChatMessage({
      threadId,
      fromEmail: session.email,
      fromName: session.name,
      fromRole: session.role,
      body: body.body,
    });
    try { await logAudit(session.name || session.email, "Chat message", `${threadId} · ${message.body.slice(0, 60)}`); } catch {}
    return NextResponse.json({ ok: true, message, thread });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: 500 });
  }
}
