import { NextResponse } from "next/server";
import { patch, append, logAudit } from "@/lib/db";

export async function PATCH(req) {
  const { id, status } = await req.json();
  const updated = patch("enquiries", (e) => e.id === id, { status });
  if (!updated) return NextResponse.json({ ok: false }, { status: 404 });
  logAudit("Rashmi Iyer", `Enquiry → ${status}`, `${updated.id} ${updated.name}`);
  return NextResponse.json({ ok: true, enquiry: updated });
}

export async function POST(req) {
  const body = await req.json();
  const id = "ENQ-" + String(1124 + Math.floor(Math.random() * 999)).padStart(4, "0");
  const row = {
    id,
    name: body.name || "New enquiry",
    parent: body.parent || "—",
    phone: body.phone || "—",
    cls: Number(body.cls) || 1,
    source: body.source || "Website",
    date: "Today",
    status: "New",
  };
  append("enquiries", row);
  logAudit("System", "Enquiry created", `${row.id} ${row.name}`);
  return NextResponse.json({ ok: true, enquiry: row });
}
