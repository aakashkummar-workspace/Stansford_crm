import { NextResponse } from "next/server";
import { addInventoryItem, archiveInventoryItem, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  const session = await getSession();
  const actor = session?.name || "Principal";

  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.name?.trim()) {
    return NextResponse.json({ ok: false, error: "Item name is required" }, { status: 400 });
  }
  try {
    const item = await addInventoryItem(body);
    try { await logAudit(actor, "Added inventory item", `${item.id} ${item.name} · ${item.category}`); } catch {}
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || "Failed to add item" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = await getSession();
  const actor = session?.name || "Principal";

  let body; try { body = await req.json(); } catch { body = null; }
  if (!body?.id) {
    return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  }
  const removed = await archiveInventoryItem(body.id);
  if (!removed) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  try { await logAudit(actor, "Removed inventory item", `${removed.id} ${removed.name}`); } catch {}
  return NextResponse.json({ ok: true });
}
