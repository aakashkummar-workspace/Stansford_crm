import { NextResponse } from "next/server";
import { payPendingFee, addActivity, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  const session = await getSession();
  // Parents are read-only on fees — payments are recorded by school staff
  // at the office. Reject parent attempts at the API layer so a tampered
  // client can't slip a payment through.
  if (session?.role === "parent") {
    return NextResponse.json(
      { ok: false, error: "Payments are recorded by the school office, not by parents." },
      { status: 403 }
    );
  }
  const actor = session?.name || "Principal";

  let body; try { body = await req.json(); } catch { body = null; }
  const id = body?.id;
  const method = body?.method || "UPI";
  // amount is optional — omitted means "pay full balance".
  const amount = (body && body.amount != null && body.amount !== "") ? Number(body.amount) : null;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  let result;
  try {
    result = await payPendingFee(id, method, amount);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: 400 });
  }
  if (!result) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { paid, remaining, fee } = result;
  const isPartial = remaining > 0;
  const subParts = [
    `${method}`,
    `₹${paid.amount.toLocaleString("en-IN")}`,
    isPartial ? `partial · ₹${remaining.toLocaleString("en-IN")} pending` : "fully paid",
    "receipt auto-sent",
  ];
  try {
    await addActivity({
      t: "fee", tone: "accent",
      title: `Fee ${isPartial ? "part-" : ""}received · ${paid.id} ${paid.name}`,
      sub: subParts.join(" · "),
      ts: "now",
    });
  } catch {}
  try {
    await logAudit(
      actor,
      isPartial ? "Partial fee payment" : "Marked fee paid",
      `${paid.id} ${paid.name} · ₹${paid.amount.toLocaleString("en-IN")}${isPartial ? ` (₹${remaining.toLocaleString("en-IN")} left)` : ""}`,
    );
  } catch {}

  return NextResponse.json({
    ok: true,
    fee: paid,
    remaining,
    studentFeeStatus: fee,
    partial: isPartial,
  });
}
