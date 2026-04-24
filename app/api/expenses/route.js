import { NextResponse } from "next/server";
import { addExpense, listExpenses, removeExpense, logAudit, __EXPENSE_META } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CAN_RECORD = new Set(["admin", "principal"]);

// GET /api/expenses?scope=school|trust
export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || undefined;
  const expenses = await listExpenses({ scope });
  return NextResponse.json({ ok: true, expenses, meta: __EXPENSE_META });
}

// POST /api/expenses { scope, category, amount, vendor?, memo?, date?, paymentMethod? }
export async function POST(req) {
  const session = await getSession();
  if (!session || !CAN_RECORD.has(session.role)) {
    return NextResponse.json({ ok: false, error: "Only admin / principal can log expenses" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.amount) return NextResponse.json({ ok: false, error: "amount required" }, { status: 400 });
  try {
    const exp = await addExpense({ ...body, recordedBy: session.name || session.email });
    try { await logAudit(session.name || "User", "Logged expense", `${exp.id} · ${exp.scope} · ${exp.category} · ₹${exp.amount.toLocaleString("en-IN")}`); } catch {}
    return NextResponse.json({ ok: true, expense: exp });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: 500 });
  }
}

// DELETE /api/expenses { id }
export async function DELETE(req) {
  const session = await getSession();
  if (!session || !CAN_RECORD.has(session.role)) {
    return NextResponse.json({ ok: false, error: "Not authorised" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const removed = await removeExpense(body.id);
  if (!removed) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  try { await logAudit(session.name || "User", "Removed expense", `${removed.id} · ${removed.scope} · ₹${removed.amount}`); } catch {}
  return NextResponse.json({ ok: true });
}
