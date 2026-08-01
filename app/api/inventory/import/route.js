import { NextResponse } from "next/server";
import { addInventoryItem, addInventoryCategory, logAudit } from "@/lib/db";
import { getSession } from "@/lib/auth";

const CAN_IMPORT = new Set(["admin", "principal"]);

// POST /api/inventory/import
//   { rows: [{ name, category?, cls?, onHand?, min?, unitPrice?, supplier? }, ...] }
//
// Bulk-create inventory SKUs from a parsed spreadsheet. Expense cascade is
// skipped so seeding the register doesn't flood the Money screen — use
// Stock in later if a purchase needs to be logged.
export async function POST(req) {
  const session = await getSession();
  if (!session || !CAN_IMPORT.has(session.role)) {
    return NextResponse.json({ ok: false, error: "Only admin or principal can import inventory" }, { status: 403 });
  }
  let body; try { body = await req.json(); } catch { body = null; }
  const rows = Array.isArray(body?.rows) ? body.rows : null;
  if (!rows) return NextResponse.json({ ok: false, error: "rows array required" }, { status: 400 });
  if (rows.length === 0) return NextResponse.json({ ok: false, error: "Spreadsheet has no rows" }, { status: 400 });
  if (rows.length > 2000) return NextResponse.json({ ok: false, error: "Max 2000 rows per import" }, { status: 400 });

  const imported = [];
  const errors = [];
  const catsSeen = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || typeof row !== "object") {
      errors.push({ row: i + 1, reason: "not an object" });
      continue;
    }
    const name = row.name != null ? String(row.name).trim() : "";
    if (!name) {
      errors.push({ row: i + 1, reason: "missing item name" });
      continue;
    }
    try {
      const item = await addInventoryItem({
        name,
        category: row.category ? String(row.category).trim() : "asset",
        cls: row.cls != null && String(row.cls).trim() ? String(row.cls).trim() : "all",
        onHand: Number(row.onHand) || 0,
        min: Number(row.min) || 0,
        unitPrice: Number(row.unitPrice) || 0,
        supplier: row.supplier ? String(row.supplier).trim() : null,
        recordedBy: session.name || "Inventory import",
        skipExpenseCascade: true,
      });
      imported.push({ row: i + 1, id: item.id, name: item.name });
      if (item.category) catsSeen.add(item.category);
    } catch (e) {
      errors.push({ row: i + 1, reason: e.message || "Failed to add" });
    }
  }

  // Persist any new category slugs so they show in the filter strip.
  for (const cat of catsSeen) {
    try { await addInventoryCategory(cat); } catch {}
  }

  try {
    await logAudit(
      session.name || "Admin",
      "Imported inventory",
      `${imported.length} of ${rows.length} rows imported${errors.length ? ` · ${errors.length} skipped` : ""}`
    );
  } catch {}

  return NextResponse.json({ ok: true, imported, errors });
}
