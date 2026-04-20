import { readDb } from "@/lib/db";
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
    STAFF: db.staff,
    DONORS: db.donors,
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
  };
}

export default async function Page() {
  const db = readDb();
  const E = shapeForScreens(db);
  return <AppShell initialData={E} />;
}
