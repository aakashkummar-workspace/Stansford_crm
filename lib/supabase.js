// Supabase client — server-side. Uses the service-role key when available so
// it can bypass RLS. Falls back to the anon key for read-only fetches.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && (serviceKey || anonKey));

export const supabase = supabaseEnabled
  ? createClient(url, serviceKey || anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// Mapping from snake_case columns to camelCase JSON shape used by screens.
export const fromStudent = (r) => r && {
  id: r.id, name: r.name, cls: r.cls, parent: r.parent,
  fee: r.fee, attendance: r.attendance, transport: r.transport, joined: r.joined,
  status: r.status ?? "active", archivedAt: r.archived_at ?? null,
};
export const toStudent = (r) => ({
  id: r.id, name: r.name, cls: r.cls, parent: r.parent ?? "—",
  fee: r.fee ?? "pending", attendance: r.attendance ?? 0,
  transport: r.transport ?? "—", joined: r.joined,
  status: r.status ?? "active",
});

export const fromPendingFee = (r) => r && {
  id: r.id, name: r.name, cls: r.cls, amount: r.amount,
  due: r.due, overdue: r.overdue,
};
export const toPendingFee = (r) => ({
  id: r.id, name: r.name, cls: r.cls, amount: r.amount,
  due: r.due ?? "in 7 days", overdue: !!r.overdue,
});

export const fromRecentFee = (r) => r && {
  id: r.id, name: r.name, cls: r.cls, amount: r.amount,
  method: r.method, time: r.time, status: r.status ?? "paid",
};

export const fromDailyLog = (r) => r && {
  studentId: r.student_id, studentName: r.student_name, cls: r.cls,
  date: r.date,
  attendance: r.attendance ?? "present",
  leaveReason: r.leave_reason ?? "",
  classwork: r.classwork, classworkStatus: r.classwork_status ?? null,
  homework:  r.homework,  homeworkStatus:  r.homework_status  ?? null,
  topics: r.topics,
  handwritingNote: r.handwriting_note, handwritingGrade: r.handwriting_grade,
  behaviour: r.behaviour, extra: r.extra,
  postedBy: r.posted_by, postedAt: r.posted_at,
};

export const fromAudit = (r) => r && {
  id: r.id, who: r.who, action: r.action, entity: r.entity,
  when: r.when_label, ip: r.ip,
};

export const fromActivity = (r) => r && {
  t: r.t, tone: r.tone, title: r.title, sub: r.sub, ts: r.ts,
};

export const fromComplaint = (r) => r && {
  id: r.id, student: r.student, cls: r.cls, parent: r.parent,
  issue: r.issue, date: r.date, status: r.status, assigned: r.assigned,
  studentId:   r.student_id ?? null,
  type:        r.type ?? "general",
  submittedBy: r.submitted_by ?? "parent",
};
export const fromEnquiry = (r) => r && { ...r };
export const fromRoute = (r) => r && {
  code: r.code, name: r.name, driver: r.driver, bus: r.bus,
  status: r.status, eta: r.eta, stops: r.stops || [],
};
