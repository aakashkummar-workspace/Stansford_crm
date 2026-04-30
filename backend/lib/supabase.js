// Supabase client — server-side. Uses the service-role key when available so
// it can bypass RLS. Falls back to the anon key for read-only fetches.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && (serviceKey || anonKey));

// IMPORTANT: pass `cache: "no-store"` on every supabase fetch so Next.js's
// route-handler fetch cache doesn't memoise our query results across requests.
// Without this we'd see stale empty rows for some tables intermittently
// (Next.js's default fetch cache treats identical fetch URLs as cacheable).
export const supabase = supabaseEnabled
  ? createClient(url, serviceKey || anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init = {}) => fetch(input, { ...init, cache: "no-store" }),
      },
    })
  : null;

// Mapping from snake_case columns to camelCase JSON shape used by screens.
export const fromStudent = (r) => r && {
  id: r.id, name: r.name, cls: r.cls, parent: r.parent,
  fee: r.fee, attendance: r.attendance, transport: r.transport,
  pickupStop: r.pickup_stop ?? r.pickupStop ?? null,
  joined: r.joined,
  status: r.status ?? "active", archivedAt: r.archived_at ?? null,
};
export const toStudent = (r) => ({
  id: r.id, name: r.name, cls: r.cls, parent: r.parent ?? "—",
  fee: r.fee ?? "pending", attendance: r.attendance ?? 0,
  transport: r.transport ?? "—",
  pickup_stop: r.pickupStop ?? null,
  joined: r.joined,
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
  // student_id is the new column linking the receipt to the student row.
  // For older receipts that pre-date the column, fall back to using the
  // receipt id itself (those used student id as the primary key).
  studentId: r.student_id ?? r.studentId ?? r.id,
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
export const fromDonor = (r) => r && {
  id: r.id, name: r.name, type: r.type, email: r.email, phone: r.phone,
  ytd: r.ytd ?? 0, last: r.last_gift, next: r.next_touchpoint,
  archivedAt: r.archived_at ?? null,
};
export const toDonor = (r) => ({
  id: r.id, name: r.name, type: r.type ?? "Individual",
  email: r.email ?? null, phone: r.phone ?? null,
  ytd: r.ytd ?? 0,
  last_gift: r.last ?? null,
  next_touchpoint: r.next ?? null,
});

export const fromCampaign = (r) => r && {
  id: r.id, name: r.name, goal: r.goal ?? 0, raised: r.raised ?? 0,
  starts: r.starts, ends: r.ends, status: r.status ?? "active",
  description: r.description,
};
export const toCampaign = (r) => ({
  id: r.id, name: r.name, goal: r.goal ?? 0, raised: r.raised ?? 0,
  starts: r.starts ?? null, ends: r.ends ?? null,
  status: r.status ?? "active", description: r.description ?? null,
});

export const fromBroadcast = (r) => r && {
  id: r.id, campaign: r.campaign, channel: r.channel,
  audience: r.audience, audienceLabel: r.audience_label,
  message: r.message, sent: r.sent ?? 0, delivered: r.delivered ?? 0,
  sentAt: r.sent_at,
};
export const toBroadcast = (r) => ({
  id: r.id, campaign: r.campaign, channel: r.channel ?? "whatsapp",
  audience: r.audience ?? "all", audience_label: r.audienceLabel ?? null,
  message: r.message ?? "", sent: r.sent ?? 0, delivered: r.delivered ?? 0,
});

export const fromTemplate = (r) => r && {
  id: r.id, name: r.name, channel: r.channel ?? "whatsapp", body: r.body,
};
export const toTemplate = (r) => ({
  id: r.id, name: r.name, channel: r.channel ?? "whatsapp", body: r.body ?? "",
});

export const fromRecipientList = (r) => r && {
  id: r.id, name: r.name,
  contacts: Array.isArray(r.contacts) ? r.contacts : [],
};

export const fromInventory = (r) => r && {
  id: r.id, name: r.name, category: r.category, cls: r.cls,
  onHand: r.on_hand ?? 0, min: r.min ?? 0, issued: r.issued ?? 0,
  unitPrice: r.unit_price ?? 0, supplier: r.supplier,
  archivedAt: r.archived_at ?? null,
};
export const toInventory = (r) => ({
  id: r.id, name: r.name, category: r.category ?? "asset",
  cls: r.cls ?? null,
  on_hand: r.onHand ?? 0, min: r.min ?? 0, issued: r.issued ?? 0,
  unit_price: r.unitPrice ?? 0, supplier: r.supplier ?? null,
});

export const fromMovement = (r) => r && {
  id: r.id, itemId: r.item_id, type: r.type, qty: r.qty,
  note: r.note, who: r.who, at: r.at,
};

export const fromStaff = (r) => r && {
  id: r.id, name: r.name, role: r.role, dept: r.dept,
  phone: r.phone, email: r.email,
  joiningDate: r.joining_date, salary: r.salary,
  attendance: r.attendance ?? 0, tasks: r.tasks ?? 0,
  score: r.score ?? 0, status: r.status ?? "ok",
  avatar: r.avatar, archivedAt: r.archived_at ?? null,
};
export const toStaff = (r) => ({
  id: r.id, name: r.name, role: r.role ?? "Teacher",
  dept: r.dept ?? "—", phone: r.phone ?? "—", email: r.email ?? null,
  joining_date: r.joiningDate ?? null, salary: r.salary ?? 0,
  attendance: r.attendance ?? 0, tasks: r.tasks ?? 0,
  score: r.score ?? 0, status: r.status ?? "ok",
  avatar: r.avatar ?? null,
});

export const fromEnquiry = (r) => r && { ...r };
export const fromRoute = (r) => r && {
  code: r.code, name: r.name, driver: r.driver, attendant: r.attendant || "—", bus: r.bus,
  status: r.status, eta: r.eta, stops: r.stops || [],
};
