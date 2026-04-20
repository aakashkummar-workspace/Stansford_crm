import { NextResponse } from "next/server";
import { readDb, writeDb, logAudit } from "@/lib/db";

export async function POST(req) {
  const { code, stopName, action } = await req.json(); // action = 'board' | 'absent'
  const db = readDb();
  const route = db.routes.find((r) => r.code === code);
  if (!route) return NextResponse.json({ ok: false }, { status: 404 });
  const stop = route.stops.find((s) => s.name === stopName);
  if (!stop) return NextResponse.json({ ok: false }, { status: 404 });
  if (action === "board" && stop.boarded < stop.cap) stop.boarded += 1;
  if (action === "absent" && stop.boarded + stop.absent < stop.cap) stop.absent += 1;
  writeDb(db);
  logAudit("Driver " + route.driver, `Marked ${action}`, `${route.code} · ${stop.name}`);
  return NextResponse.json({ ok: true, route });
}
