import { NextResponse } from "next/server";
import { patchEnquiryStatus, addEnquiry, logAudit } from "@/lib/db";

export async function PATCH(req) {
  const { id, status } = await req.json();
  if (!id || !status) return NextResponse.json({ ok: false, error: "id+status required" }, { status: 400 });
  const updated = await patchEnquiryStatus(id, status);
  if (!updated) return NextResponse.json({ ok: false }, { status: 404 });
  await logAudit("Rashmi Iyer", `Enquiry → ${status}`, `${updated.id} ${updated.name}`);
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
  const created = await addEnquiry(row);
  await logAudit("System", "Enquiry created", `${created.id} ${created.name}`);
  return NextResponse.json({ ok: true, enquiry: created });
}
