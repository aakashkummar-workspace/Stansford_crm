import { NextResponse } from "next/server";
import { readDb, writeDb, logAudit } from "@/lib/db";

// Upserts a daily log for (studentId, date). Date is YYYY-MM-DD.
export async function POST(req) {
  const body = await req.json();
  const required = ["studentId", "date"];
  for (const k of required) {
    if (!body[k]) {
      return NextResponse.json({ ok: false, error: `${k} is required` }, { status: 400 });
    }
  }

  const db = readDb();
  if (!Array.isArray(db.dailyLogs)) db.dailyLogs = [];

  const idx = db.dailyLogs.findIndex(
    (l) => l.studentId === body.studentId && l.date === body.date
  );

  const row = {
    studentId: body.studentId,
    studentName: body.studentName || "",
    cls: body.cls || "",
    date: body.date,
    classwork: (body.classwork || "").trim(),
    homework: (body.homework || "").trim(),
    topics: (body.topics || "").trim(),
    handwritingNote: (body.handwritingNote || "").trim(),
    handwritingGrade: (body.handwritingGrade || "").trim(),
    behaviour: (body.behaviour || "").trim(),
    extra: (body.extra || "").trim(),
    postedBy: body.postedBy || "Ms. Deshmukh",
    postedAt: new Date().toISOString(),
  };

  if (idx === -1) db.dailyLogs.unshift(row);
  else db.dailyLogs[idx] = row;
  writeDb(db);

  logAudit(
    row.postedBy,
    idx === -1 ? "Posted daily log" : "Updated daily log",
    `${row.studentId} ${row.studentName} · ${row.date}`
  );

  return NextResponse.json({ ok: true, log: row });
}
