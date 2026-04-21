import { NextResponse } from "next/server";
import { readDb, writeDb, logAudit } from "@/lib/db";

export async function POST(req) {
  const { ids = [], channel = "WhatsApp" } = await req.json();
  const db = readDb();

  const matched = db.pendingFees.filter((f) => ids.includes(f.id));
  if (matched.length === 0) {
    return NextResponse.json({ ok: false, error: "No matching fees" }, { status: 404 });
  }

  // Fold the reminder into the activity feed (one composite row, like a real bulk action)
  db.activities.unshift({
    t: "automation",
    tone: "accent",
    title: `Fee reminder fired · ${matched.length} families`,
    sub: `${channel} sent · ${matched.map((m) => m.name).slice(0, 3).join(", ")}${matched.length > 3 ? "…" : ""}`,
    ts: "now",
  });
  writeDb(db);

  for (const f of matched) {
    logAudit("Rashmi Iyer", `Reminder · ${channel}`, `${f.id} ${f.name}`);
  }

  return NextResponse.json({ ok: true, count: matched.length });
}
