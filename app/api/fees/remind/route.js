import { NextResponse } from "next/server";
import { fileRead, fileWrite, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CAN_REMIND = new Set(["admin", "principal"]);

// POST /api/fees/remind   { id?: string,  ids?: string[],  message?: string }
// Sends an in-app reminder. If neither id nor ids given, reminds EVERY pending parent.
// Reminders are stored as broadcasts so they land in Communication too.
export async function POST(req) {
  const session = await getSession();
  if (!session || !CAN_REMIND.has(session.role)) {
    return NextResponse.json({ ok: false, error: "Not authorised" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  const ids = Array.isArray(body?.ids) ? body.ids : (body?.id ? [body.id] : null);
  const customMessage = (body?.message && String(body.message).trim()) || null;

  const db = fileRead();
  const pending = Array.isArray(db.pendingFees) ? db.pendingFees : [];
  const targets = ids ? pending.filter((p) => ids.includes(p.id)) : pending;
  if (targets.length === 0) {
    return NextResponse.json({ ok: false, error: ids ? "No matching pending fees" : "No pending fees to remind about" }, { status: 400 });
  }

  if (!Array.isArray(db.broadcasts)) db.broadcasts = [];
  if (!Array.isArray(db.feeReminders)) db.feeReminders = [];

  const now = new Date();
  const sent = [];
  for (const p of targets) {
    const msg = customMessage || defaultReminderMessage(p);
    const reminder = {
      id: `FRM-${now.getTime().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`,
      studentId: p.id,
      studentName: p.name,
      cls: p.cls,
      amount: p.amount,
      message: msg,
      sentAt: now.toISOString(),
      sentBy: session.name || "Admin",
    };
    db.feeReminders.unshift(reminder);
    db.broadcasts.unshift({
      id: `BRC-${reminder.id}`,
      campaign: "Fee reminder",
      audience: `student:${p.id}`,
      audienceLabel: p.name,
      channel: "in_app",
      message: msg,
      sent: 1,
      delivered: 1,
      sentAt: now.toISOString(),
    });
    sent.push(reminder);
  }
  fileWrite(db);
  try {
    await logAudit(session.name || "Admin", "Sent fee reminders",
      `${sent.length} parent${sent.length === 1 ? "" : "s"} reminded · total ₹${sent.reduce((a, r) => a + (r.amount || 0), 0).toLocaleString("en-IN")}`);
  } catch {}
  return NextResponse.json({ ok: true, sent });
}

function defaultReminderMessage(p) {
  const amt = (p.amount || 0).toLocaleString("en-IN");
  return `Friendly reminder: a fee of ₹${amt} is pending for ${p.name} (${p.cls}). Please clear it at your earliest convenience or contact the school office. — Stansford International HR.Sec.School`;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const db = fileRead();
  return NextResponse.json({ ok: true, reminders: Array.isArray(db.feeReminders) ? db.feeReminders : [] });
}
