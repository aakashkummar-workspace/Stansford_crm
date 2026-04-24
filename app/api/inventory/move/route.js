import { NextResponse } from "next/server";
import { moveInventory, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  const session = await getSession();
  const actor = session?.name || "Principal";

  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.itemId || !body?.qty) {
    return NextResponse.json({ ok: false, error: "itemId and qty required" }, { status: 400 });
  }
  if (!["in", "out"].includes(body.type)) {
    return NextResponse.json({ ok: false, error: "type must be 'in' or 'out'" }, { status: 400 });
  }
  try {
    const result = await moveInventory({
      itemId: body.itemId,
      type: body.type,
      qty: body.qty,
      note: body.note,
      who: actor,
    });
    try {
      await logAudit(
        actor,
        body.type === "in" ? "Stock in" : "Stock out",
        `${result.item.id} ${result.item.name} · ${body.qty}${body.note ? " · " + body.note : ""}`,
      );
    } catch {}
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Move failed" }, { status: 500 });
  }
}
