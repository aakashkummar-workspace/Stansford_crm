import { NextResponse } from "next/server";
import { addExpense, listExpenses, removeExpense, logAudit, listRoleFeatureAccess, __EXPENSE_META } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Hard-coded canonical roles allowed to write expenses. School Accountant and
// Trust Accountant are added because finance is literally their job.
const CAN_RECORD = new Set(["admin", "principal", "school_accountant", "trust_accountant"]);

// Defence-in-depth: also accept any custom role whose admin granted Edit on
// the "money" feature (the Custom Roles screen toggles).
async function canWriteExpense(role) {
  if (CAN_RECORD.has(role)) return true;
  if (!role || typeof role !== "string") return false;
  // Custom-role ids look like "role-foo-xxxx" — anything else we can ignore.
  if (!role.startsWith("role-")) return false;
  try {
    const feats = await listRoleFeatureAccess(role);
    const money = feats.find((f) => f.featureName === "money");
    return !!(money && money.canEdit);
  } catch {
    return false;
  }
}

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
  if (!session || !(await canWriteExpense(session.role))) {
    return NextResponse.json({ ok: false, error: "Your role isn't authorised to log expenses" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.amount) return NextResponse.json({ ok: false, error: "amount required" }, { status: 400 });
  // Catch validation errors thrown by addExpense (negative / zero / NaN
  // amount, unknown scope) and surface them as 400, not 500. Anything
  // we can't classify falls through as a genuine 500.
  try {
    const exp = await addExpense({ ...body, recordedBy: session.name || session.email });
    try { await logAudit(session.name || "User", "Logged expense", `${exp.id} · ${exp.scope} · ${exp.category} · ₹${exp.amount.toLocaleString("en-IN")}`); } catch {}
    return NextResponse.json({ ok: true, expense: exp });
  } catch (e) {
    const msg = e.message || "Failed";
    const validation = /amount|scope|required|invalid|must be/i.test(msg);
    return NextResponse.json({ ok: false, error: msg }, { status: validation ? 400 : 500 });
  }
}

// DELETE /api/expenses { id }
export async function DELETE(req) {
  const session = await getSession();
  if (!session || !(await canWriteExpense(session.role))) {
    return NextResponse.json({ ok: false, error: "Not authorised" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const removed = await removeExpense(body.id);
  if (!removed) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  try { await logAudit(session.name || "User", "Removed expense", `${removed.id} · ${removed.scope} · ₹${removed.amount}`); } catch {}
  return NextResponse.json({ ok: true });
}
