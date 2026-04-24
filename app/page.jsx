import { redirect } from "next/navigation";
import { readAllData } from "@/lib/db";
import { getSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

function shapeForScreens(db) {
  return {
    KPIS: db.kpis,
    CLASSES: db.classes,
    CLASS_STRENGTH: db.classStrength,
    RECENT_FEES: db.recentFees,
    PENDING_FEES: db.pendingFees,
    ACTIVITIES: db.activities,
    ROUTES: db.routes,
    COMPLAINTS: db.complaints,
    ENQUIRIES: db.enquiries,
    INVENTORY: db.inventory,
    MOVEMENTS: db.movements || [],
    BROADCASTS: db.broadcasts || [],
    TEMPLATES: db.templates || [],
    RECIPIENT_LISTS: db.recipientLists || [],
    STAFF: db.staff,
    DONORS: db.donors || [],
    CAMPAIGNS: db.campaigns || [],
    INCOME_SERIES: db.incomeSeries,
    AUTOMATIONS: db.automations,
    SCHOOLS: db.schools,
    TRUST_KPIS: db.trustKpis,
    ANOMALIES: db.anomalies,
    DONATION_PIPELINE: db.donationPipeline,
    COMPLIANCE: db.compliance,
    AI_BRIEF: db.aiBrief,
    ROLES: db.roles,
    USERS: db.users,
    AUDIT: db.audit,
    ADDED_STUDENTS: db.addedStudents || [],
    ARCHIVED_STUDENTS: db.archivedStudents || [],
    DAILY_LOGS: db.dailyLogs || [],
  };
}

export default async function Page() {
  // Middleware will already have redirected anonymous users to /login. This
  // server-side check is the second line of defence + gives the page access
  // to the role/name before render.
  const session = await getSession();
  if (!session) redirect("/login");

  const db = await readAllData();
  const E = shapeForScreens(db);
  return (
    <AppShell
      initialData={E}
      session={{
        id: session.sub,
        email: session.email,
        name: session.name,
        role: session.role,
        linkedId: session.linkedId || null,
        linkedClasses: Array.isArray(session.linkedClasses) ? session.linkedClasses : [],
      }}
    />
  );
}
