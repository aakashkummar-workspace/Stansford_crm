import { NextResponse } from "next/server";
import { setStopBoarding, logAudit } from "@/lib/db";

export async function POST(req) {
  const { code, stopName, action } = await req.json();
  if (!code || !stopName || !action) {
    return NextResponse.json({ ok: false, error: "code+stopName+action required" }, { status: 400 });
  }
  const route = await setStopBoarding(code, stopName, action);
  if (!route) return NextResponse.json({ ok: false, error: "Route or stop not found" }, { status: 404 });
  await logAudit(`${route.driver} (driver)`, `Marked ${action}`, `${route.code} · ${stopName}`);
  return NextResponse.json({ ok: true, route });
}
