import { NextResponse } from "next/server";
import { patchEnquiryStatus, addEnquiry, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

const VALID_STATUSES = ["New", "Contacted", "Converted", "Rejected"];

function formatIndianPhone(raw) {
  if (!raw) return "—";
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (digits.length !== 10 || !/^[6-9]/.test(digits)) return null;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export async function PATCH(req) {
  const session = await getSession();
  const actor = session?.name || "Principal";

  let body; try { body = await req.json(); } catch { body = null; }
  const { id, status } = body || {};
  if (!id || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ ok: false, error: "id + valid status required" }, { status: 400 });
  }
  const updated = await patchEnquiryStatus(id, status);
  if (!updated) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  try { await logAudit(actor, `Enquiry → ${status}`, `${updated.id} ${updated.name}`); } catch {}
  return NextResponse.json({ ok: true, enquiry: updated });
}

export async function POST(req) {
  const session = await getSession();
  const actor = session?.name || "System";

  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.name?.trim()) {
    return NextResponse.json({ ok: false, error: "Student name is required" }, { status: 400 });
  }
  let phone = "—";
  if (body.phone && String(body.phone).trim() && String(body.phone).trim() !== "—") {
    const formatted = formatIndianPhone(body.phone);
    if (formatted === null) {
      return NextResponse.json(
        { ok: false, error: "Phone must be a 10-digit Indian mobile starting with 6/7/8/9" },
        { status: 400 }
      );
    }
    phone = formatted;
  }
  const id = `ENQ-${1124 + Math.floor(Math.random() * 8999)}`;
  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const row = {
    id,
    name: body.name.trim(),
    parent: String(body.parent || "").trim() || "—",
    phone,
    cls: Number(body.cls) || 1,
    source: body.source || "Website",
    date: today,
    status: "New",
  };
  try {
    const created = await addEnquiry(row);
    try { await logAudit(actor, "New enquiry", `${created.id} ${created.name} · ${row.source}`); } catch {}
    return NextResponse.json({ ok: true, enquiry: created });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed" }, { status: 500 });
  }
}
