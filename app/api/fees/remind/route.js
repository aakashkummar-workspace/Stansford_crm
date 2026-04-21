import { NextResponse } from "next/server";
import { findPendingFeesByIds, addActivity, logAudit } from "@/lib/db";

export async function POST(req) {
  const { ids = [], channel = "WhatsApp" } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ ok: false, error: "ids required" }, { status: 400 });
  }
  const matched = await findPendingFeesByIds(ids);
  if (matched.length === 0) {
    return NextResponse.json({ ok: false, error: "No matching fees" }, { status: 404 });
  }
  await addActivity({
    t: "automation", tone: "accent",
    title: `Fee reminder fired · ${matched.length} families`,
    sub: `${channel} sent · ${matched.map((m) => m.name).slice(0, 3).join(", ")}${matched.length > 3 ? "…" : ""}`,
    ts: "now",
  });
  for (const f of matched) {
    await logAudit("Rashmi Iyer", `Reminder · ${channel}`, `${f.id} ${f.name}`);
  }
  return NextResponse.json({ ok: true, count: matched.length });
}
