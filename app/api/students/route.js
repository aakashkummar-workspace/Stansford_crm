import { NextResponse } from "next/server";
import { addStudent, archiveStudent, addPendingFee, logAudit, updateStudent } from "@/lib/db";
import { getSession } from "@/lib/auth";

const monthYear = () =>
  new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" });

const newId = () => `STN-${9000 + Math.floor(Math.random() * 999)}`;

function termFeeFor(cls) {
  const n = Number(String(cls).split("-")[0]) || 1;
  return 14000 + n * 1000;
}

// Accepts a 10-digit Indian mobile (after stripping a courtesy +91/91/0 prefix)
// and returns "+91 XXXXX XXXXX". Returns null if not valid.
function formatIndianPhone(raw) {
  if (!raw) return "—";
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (digits.length !== 10 || !/^[6-9]/.test(digits)) return null;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export async function POST(req) {
  const body = await req.json();
  if (!body || !body.name || !body.name.trim()) {
    return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
  }
  let parent = "—";
  if (body.parent && String(body.parent).trim() && String(body.parent).trim() !== "—") {
    const formatted = formatIndianPhone(body.parent);
    if (formatted === null) {
      return NextResponse.json(
        { ok: false, error: "Parent phone must be a 10-digit Indian mobile number starting with 6, 7, 8 or 9" },
        { status: 400 }
      );
    }
    parent = formatted;
  }
  const cls = Number(body.cls) || 1;
  const section = (body.section || "A").toUpperCase();
  const row = {
    id: newId(),
    name: body.name.trim(),
    cls: `${cls}-${section}`,
    parent,
    fee: "pending",
    attendance: 0,
    transport: body.transport || "—",
    pickupStop: String(body.pickupStop || "").trim() || null,
    joined: monthYear(),
  };

  const student = await addStudent(row);
  await addPendingFee({
    id: row.id,
    name: row.name,
    cls: row.cls,
    amount: termFeeFor(row.cls),
    due: "in 7 days",
    overdue: false,
  });
  await logAudit("Rashmi Iyer", "New admission", `${row.id} ${row.name}`);

  return NextResponse.json({ ok: true, student });
}

// PATCH /api/students { id, name?, cls?, section?, parent?, transport?, pickupStop? }
// Used by the Transport screen (bus/pickup), and by the Students screen's
// "Edit details" modal (name/class/parent).
// Role gating is enforced in the Students screen UI (principal/admin/teacher);
// the API trusts that gate + session for now.
export async function PATCH(req) {
  const session = await getSession();
  const actor = session?.name || "Principal";
  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const patch = {};
  if ("transport" in body)  patch.transport  = body.transport;
  if ("pickupStop" in body) patch.pickupStop = body.pickupStop;
  if ("name" in body) {
    const n = String(body.name || "").trim();
    if (!n) return NextResponse.json({ ok: false, error: "Name cannot be empty" }, { status: 400 });
    patch.name = n;
  }
  // Accept either a pre-joined "1-A" cls string, or separate cls + section.
  if ("cls" in body || "section" in body) {
    const rawCls = body.cls != null ? String(body.cls) : "";
    let clsN, sec;
    if (rawCls.includes("-")) {
      const [a, b] = rawCls.split("-");
      clsN = Number(a); sec = String(b || "A").toUpperCase();
    } else {
      clsN = Number(rawCls) || 0;
      sec = String(body.section || "A").toUpperCase();
    }
    if (!clsN || clsN < 1) return NextResponse.json({ ok: false, error: "Invalid class" }, { status: 400 });
    patch.cls = `${clsN}-${sec}`;
  }
  if ("parent" in body) {
    const raw = String(body.parent || "").trim();
    if (!raw || raw === "—") {
      patch.parent = "—";
    } else {
      const formatted = formatIndianPhone(raw);
      if (formatted === null) {
        return NextResponse.json(
          { ok: false, error: "Parent phone must be a 10-digit Indian mobile number starting with 6, 7, 8 or 9" },
          { status: 400 }
        );
      }
      patch.parent = formatted;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
  }
  const updated = await updateStudent(body.id, patch);
  if (!updated) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  try {
    const trail = [];
    if ("name" in patch)       trail.push(`name=${patch.name}`);
    if ("cls" in patch)        trail.push(`class=${patch.cls}`);
    if ("parent" in patch)     trail.push(`parent=${patch.parent}`);
    if ("transport" in patch)  trail.push(`bus=${patch.transport || "(none)"}`);
    if ("pickupStop" in patch) trail.push(`stop=${patch.pickupStop || "(none)"}`);
    const action = ("transport" in patch || "pickupStop" in patch) && trail.length <= 2
      ? "Updated transport assignment"
      : "Updated student details";
    await logAudit(actor, action, `${updated.id} ${updated.name} · ${trail.join(" · ")}`);
  } catch {}
  return NextResponse.json({ ok: true, student: updated });
}

// "Withdraw" — soft-delete. Student record + all financial history are kept;
// only the active flag flips and any uncollected pending fee is dropped.
export async function DELETE(req) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const archived = await archiveStudent(id);
  if (!archived) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  await logAudit("Rashmi Iyer", "Archived student", `${archived.id} ${archived.name} · history kept`);
  return NextResponse.json({ ok: true, student: archived });
}
