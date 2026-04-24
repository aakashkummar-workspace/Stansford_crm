import { NextResponse } from "next/server";
import { listTasks, addTask, updateTask, removeTask, getUserByEmail, listUsers, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/tasks  → admin: every task; everyone else: tasks assigned to them.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  const all = await listTasks();
  if (session.role === "admin") return NextResponse.json({ ok: true, tasks: all });
  const myId = session.sub || session.id;
  const mine = all.filter((t) => t.assignedTo === myId || t.assignedTo === session.email);
  return NextResponse.json({ ok: true, tasks: mine });
}

// POST /api/tasks  { title, description?, assignedTo, priority?, dueDate? }
// Admin only. assignedTo is a user id (or email — we accept both for convenience).
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Only admin can create tasks" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.title?.trim()) return NextResponse.json({ ok: false, error: "title required" }, { status: 400 });
  if (!body.assignedTo) return NextResponse.json({ ok: false, error: "assignedTo required" }, { status: 400 });

  // Resolve target user — by id first, then email.
  let target = null;
  const users = await listUsers();
  target = users.find((u) => u.id === body.assignedTo) || null;
  if (!target && body.assignedTo.includes("@")) {
    target = await getUserByEmail(body.assignedTo);
  }
  if (!target) return NextResponse.json({ ok: false, error: "Assignee not found" }, { status: 404 });
  if (target.role === "parent") {
    return NextResponse.json({ ok: false, error: "Tasks cannot be assigned to parents" }, { status: 400 });
  }

  try {
    const task = await addTask({
      title: body.title,
      description: body.description,
      assignedTo: target.id,
      assignedToName: target.name,
      assignedToRole: target.role,
      assignedBy: session.sub || session.id || session.email,
      assignedByName: session.name || "Admin",
      priority: body.priority,
      dueDate: body.dueDate,
    });
    try { await logAudit(session.name || "Admin", "Assigned task", `${task.id} → ${target.name} (${target.role}) · ${task.title}`); } catch {}
    return NextResponse.json({ ok: true, task });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed to create task" }, { status: 500 });
  }
}

// PATCH /api/tasks  { id, status?, title?, description?, priority?, dueDate? }
// Admin can patch anything; the assignee can only flip the status.
export async function PATCH(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const existing = (await listTasks()).find((t) => t.id === body.id);
  if (!existing) return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });

  const isAdmin = session.role === "admin";
  const myId = session.sub || session.id;
  const isAssignee = existing.assignedTo === myId || existing.assignedTo === session.email;
  if (!isAdmin && !isAssignee) {
    return NextResponse.json({ ok: false, error: "Not authorised to update this task" }, { status: 403 });
  }
  // Non-admin assignee: clamp the patch to status-only.
  const patch = isAdmin ? body : { status: body.status };

  try {
    const updated = await updateTask(body.id, patch);
    try { await logAudit(session.name || "User", "Updated task", `${updated.id} · status=${updated.status}`); } catch {}
    return NextResponse.json({ ok: true, task: updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: 500 });
  }
}

// DELETE /api/tasks  { id }   — admin only.
export async function DELETE(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Only admin can remove tasks" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const removed = await removeTask(body.id);
  if (!removed) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  try { await logAudit(session.name || "Admin", "Removed task", `${removed.id} · ${removed.title}`); } catch {}
  return NextResponse.json({ ok: true });
}
