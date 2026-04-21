import { NextResponse } from "next/server";
import { readDb, writeDb, logAudit } from "@/lib/db";

export async function POST(req) {
  const { code, stopName, action } = await req.json(); // 'board' | 'absent'
  const db = readDb();
  const route = db.routes.find((r) => r.code === code);
  if (!route) return NextResponse.json({ ok: false, error: "Route not found" }, { status: 404 });
  const stop = route.stops.find((s) => s.name === stopName);
  if (!stop) return NextResponse.json({ ok: false, error: "Stop not found" }, { status: 404 });

  if (action === "board") {
    if (stop.boarded + stop.absent < stop.cap) stop.boarded += 1;
  } else if (action === "absent") {
    // If we're at cap from boarded, convert one boarded → absent.
    if (stop.boarded + stop.absent < stop.cap) stop.absent += 1;
    else if (stop.boarded > 0) {
      stop.boarded -= 1;
      stop.absent += 1;
    }
  }
  writeDb(db);
  logAudit(`${route.driver} (driver)`, `Marked ${action}`, `${route.code} · ${stop.name}`);
  return NextResponse.json({ ok: true, route });
}
