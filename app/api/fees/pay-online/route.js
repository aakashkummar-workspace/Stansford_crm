import { NextResponse } from "next/server";
import { fileRead, fileWrite, payPendingFee, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Two-step "online" payment flow that mimics Razorpay's order/verify pattern
// without actually hitting an external gateway. In production, replace with:
//   POST step:    razorpay.orders.create({ amount, currency: "INR" })
//   verify step:  validate the signature returned by Razorpay's checkout JS
//
// POST /api/fees/pay-online   { id, amount, intent: "create" | "verify", paymentRef? }
//
// "create" → returns a pseudo order id; UI shows it inside a confirmation modal.
// "verify" → marks the pending fee as paid and writes a receipt with method="UPI online".
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });

  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const intent = body.intent === "verify" ? "verify" : "create";

  if (intent === "create") {
    const db = fileRead();
    const fee = (db.pendingFees || []).find((f) => f.id === body.id);
    if (!fee) return NextResponse.json({ ok: false, error: "No pending fee for this student" }, { status: 404 });
    const amt = Math.max(1, Math.min(Number(body.amount) || fee.amount, fee.amount));
    const order = {
      orderId: `OR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`,
      gateway: "Razorpay (sandbox)",
      amount: amt,
      currency: "INR",
      studentId: fee.id,
      studentName: fee.name,
      cls: fee.cls,
      // A simple payment URL the frontend can show as a clickable / QR link.
      // In a real integration this would be the Razorpay checkout page.
      payUrl: `upi://pay?pa=stansford@school&pn=Stansford%20International%20HR.Sec.School&am=${amt}&cu=INR&tn=Fee%20${fee.id}`,
      createdAt: new Date().toISOString(),
    };
    if (!Array.isArray(db.paymentOrders)) db.paymentOrders = [];
    db.paymentOrders.unshift(order);
    fileWrite(db);
    return NextResponse.json({ ok: true, order });
  }

  // verify branch — settle the pending fee and write a receipt.
  const amt = Number(body.amount);
  const ref = body.paymentRef || `MOCK-${Date.now().toString(36).toUpperCase()}`;
  if (!amt) return NextResponse.json({ ok: false, error: "amount required" }, { status: 400 });
  const result = await payPendingFee(body.id, "UPI online", amt);
  try {
    await logAudit(session.name || "Online payment",
      "Fee paid online", `${body.id} · ₹${amt.toLocaleString("en-IN")} · ref=${ref}`);
  } catch {}
  return NextResponse.json({ ok: true, ...result, paymentRef: ref });
}
