import { NextResponse } from "next/server";
import { readPermissions, writePermissions, ALL_FEATURES, ROLES } from "@/lib/permissions";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/permissions  → { permissions, features, roles }
// Anyone signed in can read this — the data is needed by the sidebar to know
// what to render.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  return NextResponse.json({
    ok: true,
    permissions: readPermissions(),
    features: ALL_FEATURES,
    roles: ROLES,
  });
}

// PUT /api/permissions { role, permissions: { featureId: bool, ... } }
// Admin-only. Replaces the named role's matrix entries with the supplied ones.
export async function PUT(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Only admin can edit permissions" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.role || !ROLES.includes(body.role)) {
    return NextResponse.json({ ok: false, error: "role required" }, { status: 400 });
  }
  if (!body.permissions || typeof body.permissions !== "object") {
    return NextResponse.json({ ok: false, error: "permissions object required" }, { status: 400 });
  }
  try {
    const merged = writePermissions({ [body.role]: body.permissions });
    const flippedOff = Object.entries(body.permissions).filter(([_, v]) => v === false).map(([k]) => k);
    const flippedOn  = Object.entries(body.permissions).filter(([_, v]) => v === true).map(([k]) => k);
    try {
      await logAudit(
        session.name || "Admin",
        "Updated role permissions",
        `${body.role} · on=${flippedOn.length} off=${flippedOff.length}`
      );
    } catch {}
    return NextResponse.json({ ok: true, permissions: merged });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: 500 });
  }
}
