import { NextResponse } from "next/server";
import { addRoute, removeRoute, updateRoute, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  const session = await getSession();
  const actor = session?.name || "Principal";

  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.code?.trim()) {
    return NextResponse.json({ ok: false, error: "Route code is required" }, { status: 400 });
  }
  if (!Array.isArray(body.stops) || body.stops.length === 0) {
    return NextResponse.json({ ok: false, error: "Add at least one stop" }, { status: 400 });
  }
  try {
    const route = await addRoute(body);
    try { await logAudit(actor, "Added transport route", `${route.code} ${route.name}`); } catch {}
    return NextResponse.json({ ok: true, route });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed to add route" }, { status: 500 });
  }
}

// PATCH /api/transport/route { code, name?, driver?, attendant?, bus?, eta?, stops?, status? }
export async function PATCH(req) {
  const session = await getSession();
  const actor = session?.name || "Principal";

  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.code) {
    return NextResponse.json({ ok: false, error: "code required" }, { status: 400 });
  }
  if ("stops" in body && (!Array.isArray(body.stops) || body.stops.length === 0)) {
    return NextResponse.json({ ok: false, error: "Stops list cannot be empty" }, { status: 400 });
  }
  try {
    const route = await updateRoute(body.code, body);
    if (!route) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    try { await logAudit(actor, "Updated transport route", `${route.code} ${route.name || ""}`); } catch {}
    return NextResponse.json({ ok: true, route });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = await getSession();
  const actor = session?.name || "Principal";

  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.code) {
    return NextResponse.json({ ok: false, error: "code required" }, { status: 400 });
  }
  const removed = await removeRoute(body.code);
  if (!removed) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  try { await logAudit(actor, "Removed transport route", `${removed.code} ${removed.name}`); } catch {}
  return NextResponse.json({ ok: true });
}
