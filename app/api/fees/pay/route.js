import { NextResponse } from "next/server";
import { payPendingFee, addActivity, logAudit } from "@/lib/db";

export async function POST(req) {
  const { id, method = "UPI" } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const paid = await payPendingFee(id, method);
  if (!paid) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  await addActivity({
    t: "fee", tone: "accent",
    title: `Fee received · ${paid.id} ${paid.name}`,
    sub: `${method} · ₹${paid.amount.toLocaleString("en-IN")} · receipt auto-sent`,
    ts: "now",
  });
  await logAudit("Rashmi Iyer", "Marked fee paid", `${paid.id} ${paid.name}`);

  return NextResponse.json({ ok: true, fee: paid });
}
