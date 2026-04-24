import { NextResponse } from "next/server";
import { advanceRoute, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

const ALLOWED = new Set(["start", "next", "prev", "finish", "reset"]);

// POST /api/transport/advance { code, action: 'start'|'next'|'prev'|'finish'|'reset' }
export async function POST(req) {
  const session = await getSession();
  const actor = session?.name || "Principal";

  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.code || !ALLOWED.has(body.action)) {
    return NextResponse.json({ ok: false, error: "code + valid action required" }, { status: 400 });
  }
  try {
    const route = await advanceRoute(body.code, body.action);
    if (!route) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    // Build a friendly audit-line message
    const stops = Array.isArray(route.stops) ? route.stops : [];
    const cur = stops.find((s) => s.status === "current");
    let summary = "";
    if      (body.action === "start")  summary = `Run started · at ${cur?.name || "stop 1"}`;
    else if (body.action === "next")   summary = route.status === "completed"
      ? "Run completed"
      : `Advanced to ${cur?.name || "next stop"}`;
    else if (body.action === "prev")   summary = `Stepped back to ${cur?.name || "previous stop"}`;
    else if (body.action === "finish") summary = "Run marked complete";
    else if (body.action === "reset")  summary = "Run reset for next trip";
    try { await logAudit(actor, "Bus run · " + body.action, `${route.code} · ${summary}`); } catch {}

    return NextResponse.json({ ok: true, route, summary });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: 500 });
  }
}
