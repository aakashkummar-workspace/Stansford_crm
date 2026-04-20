import { NextResponse } from "next/server";
import { patch, logAudit } from "@/lib/db";

export async function PATCH(req) {
  const { id, status } = await req.json();
  const updated = patch("complaints", (c) => c.id === id, { status });
  if (!updated) return NextResponse.json({ ok: false }, { status: 404 });
  logAudit("Rashmi Iyer", `Complaint → ${status}`, `${updated.id} ${updated.student}`);
  return NextResponse.json({ ok: true, complaint: updated });
}
