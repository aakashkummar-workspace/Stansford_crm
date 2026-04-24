import { NextResponse } from "next/server";
import { addBroadcast, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  const session = await getSession();
  const actor = session?.name || "Principal";

  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.message?.trim()) {
    return NextResponse.json({ ok: false, error: "Message is required" }, { status: 400 });
  }
  if (!Number.isFinite(Number(body.sent)) || Number(body.sent) < 0) {
    return NextResponse.json({ ok: false, error: "Audience size must be a positive number" }, { status: 400 });
  }
  try {
    const broadcast = await addBroadcast({
      campaign: body.campaign || "Manual broadcast",
      channel: body.channel || "whatsapp",
      audience: body.audience || "all",
      audienceLabel: body.audienceLabel || body.audience || "All parents",
      message: body.message.trim(),
      sent: Number(body.sent) || 0,
      delivered: Number(body.sent) || 0, // optimistic; gateway webhook would update
    });
    try {
      await logAudit(actor, "Sent broadcast", `${broadcast.campaign} → ${broadcast.audienceLabel} · ${broadcast.sent} ${broadcast.channel}`);
    } catch {}
    return NextResponse.json({ ok: true, broadcast });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed to send" }, { status: 500 });
  }
}
