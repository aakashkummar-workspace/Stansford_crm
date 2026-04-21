import { NextResponse } from "next/server";
import { readDb, writeDb, append, logAudit } from "@/lib/db";

const monthYear = () =>
  new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" });

const newId = () => `STN-${9000 + Math.floor(Math.random() * 999)}`;

export async function POST(req) {
  const body = await req.json();
  if (!body || !body.name || !body.name.trim()) {
    return NextResponse.json({ ok: false, error: "Name is required" }, { status: 400 });
  }
  const cls = Number(body.cls) || 1;
  const section = (body.section || "A").toUpperCase();
  const row = {
    id: newId(),
    name: body.name.trim(),
    cls: `${cls}-${section}`,
    parent: (body.parent && body.parent.trim()) || "—",
    fee: "pending",
    attendance: 0,
    transport: body.transport || "—",
    joined: monthYear(),
  };
  append("addedStudents", row);
  logAudit("Rashmi Iyer", "New admission", `${row.id} ${row.name}`);
  return NextResponse.json({ ok: true, student: row });
}

export async function DELETE(req) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  const db = readDb();
  const idx = db.addedStudents.findIndex((s) => s.id === id);
  if (idx === -1) return NextResponse.json({ ok: false, error: "Not found (or built-in roster row)" }, { status: 404 });
  const [removed] = db.addedStudents.splice(idx, 1);
  writeDb(db);
  logAudit("Rashmi Iyer", "Removed student", `${removed.id} ${removed.name}`);
  return NextResponse.json({ ok: true });
}
