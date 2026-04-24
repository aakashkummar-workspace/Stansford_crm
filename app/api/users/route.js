import { NextResponse } from "next/server";
import { listTeachers, listUsers, updateUser, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

const CAN_MANAGE = new Set(["admin", "principal", "academic_director"]);

// GET /api/users?role=teacher → list teachers (id, name, email, linkedId).
// Used by the Classes screen to populate the "Class teacher" picker.
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const url = new URL(req.url);
  const role = url.searchParams.get("role");
  if (role === "teacher") {
    const teachers = await listTeachers();
    return NextResponse.json({ ok: true, teachers });
  }
  // No filter — return every user. Used by Tasks screen to populate the
  // "Assign to" dropdown. Parents are filtered out client-side because the
  // Tasks UI excludes them by policy.
  const all = await listUsers();
  // Strip hashed passwords / sensitive fields before sending to the client.
  const safe = all.map(({ hashedPassword, password, ...rest }) => rest);
  return NextResponse.json({ ok: true, users: safe });
}

// PATCH /api/users — update a user.
// Body shape (any of):
//   { id, linkedId: "2-A,5-B" }      replace whole assignment list (CSV)
//   { id, linkedClasses: ["2-A","5-B"] }  replace whole assignment (array)
//   { id, addClass: "5-B" }          atomically add a section to the list
//   { id, removeClass: "2-A" }       atomically remove a section
// Only principal / admin / academic_director can do this.
export async function PATCH(req) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.has(session.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }
  const patch = {};
  if ("linkedId" in body)            patch.linkedId = body.linkedId;
  if ("linkedClasses" in body)       patch.linkedClasses = body.linkedClasses;
  if (typeof body.addClass === "string")    patch.addClass = body.addClass;
  if (typeof body.removeClass === "string") patch.removeClass = body.removeClass;
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.role === "string") patch.role = body.role;

  const updated = await updateUser(body.id, patch);
  if (!updated) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

  // Build a human audit entry that explains what changed.
  let action = "Updated user";
  let entity = `${updated.name || updated.id}`;
  if (typeof body.addClass === "string") {
    action = "Added class assignment";
    entity = `${updated.name} → +${body.addClass} (now: ${updated.linkedClasses?.join(", ") || "—"})`;
  } else if (typeof body.removeClass === "string") {
    action = "Removed class assignment";
    entity = `${updated.name} → −${body.removeClass} (now: ${updated.linkedClasses?.join(", ") || "(none)"})`;
  } else if ("linkedId" in body || "linkedClasses" in body) {
    action = "Set class assignments";
    entity = `${updated.name} → ${updated.linkedClasses?.join(", ") || "(unassigned)"}`;
  }
  try { await logAudit(session.name || "Principal", action, entity); } catch {}

  return NextResponse.json({ ok: true, user: updated });
}
