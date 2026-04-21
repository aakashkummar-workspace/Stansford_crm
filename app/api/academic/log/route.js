import { NextResponse } from "next/server";
import { upsertDailyLog, logAudit } from "@/lib/db";

export async function POST(req) {
  const body = await req.json();
  if (!body.studentId || !body.date) {
    return NextResponse.json({ ok: false, error: "studentId and date are required" }, { status: 400 });
  }
  const { fresh, log } = await upsertDailyLog({
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
    postedBy: body.postedBy || "Teacher",
  });
  await logAudit(
    log.postedBy || "Teacher",
    fresh ? "Posted daily log" : "Updated daily log",
    `${log.studentId} ${log.studentName} · ${log.date}`
  );
  return NextResponse.json({ ok: true, log });
}
