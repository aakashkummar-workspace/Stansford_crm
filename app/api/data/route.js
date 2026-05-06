import { NextResponse } from "next/server";
import { readAllData, BACKEND } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Server-side scoping. Without this, /api/data returned the full app
// dataset to every authenticated role — a parent or teacher opening
// DevTools could read donors, expenses, staff, full audit log etc.
// even though the UI hid them. The AppShell still re-scopes for
// belt-and-braces, but this is the security boundary.
function scopeForRole(data, session) {
  if (!session) return null;
  const role = session.role;
  // Admin / principal / academic_director / school_accountant see everything.
  // (Accountants are mostly scoped by which sidebar screens they can reach,
  //  but trust_accountant gets a HARD data slice below — they must not be
  //  able to read student / staff / academic / inventory data via DevTools
  //  even though their nav doesn't surface those screens.)
  if (role === "admin" || role === "principal" || role === "academic_director" ||
      role === "school_accountant") {
    return data;
  }

  // Trust Accountant — strict trust-only slice. Allowed: donors,
  // donations, trust-scope expenses, schools, compliance, donation
  // pipeline, trust KPIs, anomalies, AI brief. Blocked: every list that
  // touches students, staff, academics, school fees, inventory, library,
  // timetable, transport, broadcasts, leave, remarks, school reports.
  if (role === "trust_accountant") {
    return {
      ...data,
      // Trust-scope expenses only — drop school-scope rows.
      expenses: (data.expenses || []).filter((e) => e.scope === "trust"),
      // Strip every school-side list. Empty arrays/objects so screens
      // that defensively read these fields don't crash.
      addedStudents: [], archivedStudents: [],
      dailyLogs: [],
      pendingFees: [], recentFees: [], feeReminders: [],
      staff: [], teacherAttendance: [], staffAwards: [],
      classes: [], classStrength: [],
      timetable: [], syllabus: [],
      exams: [], marks: [],
      inventory: [], inventoryCategories: [],
      library: [], libraryLoans: [],
      maintenanceLogs: [],
      routes: [], transportAttendance: [],
      complaints: [], enquiries: [],
      broadcasts: [], templates: [], recipientLists: [], movements: [],
      meetings: [], volunteers: [],
      chatThreads: [],
      tcRequests: [],
      tasks: [],
      governmentDocuments: [],
      customRoles: [], users: [],
      studentActivities: [],
      leaveRequests: [],
      remarksRewards: [],
      scaleSessions: [], scaleEntries: [],
      scaleSupportPlans: [], scaleDailyRituals: [],
      subjects: [],
      // Audit: keep only entries that touch finance / trust ops so they
      // can investigate donations / expenses, but they don't get a
      // window into student admissions or attendance edits.
      audit: (data.audit || []).filter((a) => {
        const blob = `${a.action || ""} ${a.entity || ""}`.toLowerCase();
        return /donor|donation|trust|expense|campaign|receipt/.test(blob);
      }),
    };
  }

  // Strip lists that are sensitive across the board for non-managers.
  // Each role gets its own positive overrides below.
  const sanitised = {
    ...data,
    donors: [],
    donorReceipts: [],
    donorFormSubmissions: [],
    expenses: [],
    staff: [],
    teacherAttendance: [],
    audit: [],
    schools: [],
    governmentDocuments: [],
    customRoles: [],
    campaigns: [],
  };

  if (role === "teacher") {
    // Teacher sees their own staff record only (so RemarksRewards can
    // tag "About you"). Their assigned-class students stay; everything
    // else from the sensitive set above stays empty.
    const myEmail = (session.email || "").toLowerCase();
    sanitised.staff = (data.staff || []).filter(
      (s) => s.email && s.email.toLowerCase() === myEmail
    );
    return sanitised;
  }

  if (role === "parent") {
    const linkedId = session.linkedId;
    const myChild = linkedId
      ? (data.addedStudents || []).find((s) => s.id === linkedId)
      : (data.addedStudents || [])[0];
    if (!myChild) {
      return {
        ...sanitised,
        addedStudents: [],
        archivedStudents: [],
        pendingFees: [], recentFees: [],
        dailyLogs: [],
        transportAttendance: [],
        routes: [],
        complaints: [],
        scaleEntries: [], scaleSessions: [],
      };
    }
    return {
      ...sanitised,
      addedStudents: [myChild],
      archivedStudents: [],
      pendingFees:  (data.pendingFees  || []).filter((f) => f.id === myChild.id),
      recentFees:   (data.recentFees   || []).filter((f) => (f.studentId || f.id) === myChild.id),
      dailyLogs:    (data.dailyLogs    || []).filter((l) => l.studentId === myChild.id),
      transportAttendance: (data.transportAttendance || []).filter((t) => t.studentId === myChild.id),
      routes:       (data.routes       || []).filter((r) => r.code === myChild.transport),
      complaints:   (data.complaints   || []).filter((c) => c.studentId === myChild.id || c.student === myChild.name),
      scaleEntries: (data.scaleEntries || []).filter((e) => e.studentId === myChild.id),
      scaleSessions: [], // sessions are teacher-side
    };
  }

  // Unknown / custom role → safest default is the sanitised set
  // (no donors / staff / expenses / audit) plus their normal class data.
  return sanitised;
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  }
  const data = await readAllData();
  const scoped = scopeForRole(data, session);
  return NextResponse.json(scoped, { headers: { "x-data-backend": BACKEND } });
}
