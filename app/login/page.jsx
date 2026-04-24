import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ensureDemoUsers, DEMO_ACCOUNTS } from "@/lib/seed-users";
import LoginScreen from "./LoginScreen";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
  // Already signed in? Bounce back to wherever they were heading.
  const session = await getSession();
  if (session) {
    const next = typeof searchParams?.next === "string" ? searchParams.next : "/";
    redirect(next.startsWith("/") ? next : "/");
  }

  // First-run convenience: seed five demo users idempotently.
  // Wrapped so a Supabase outage still renders the form (user can retry).
  try { await ensureDemoUsers(); } catch (e) {
    console.warn("[login] seed failed:", e?.message);
  }

  const demo = DEMO_ACCOUNTS.map((a) => ({
    email: a.email, password: a.password, role: a.role, name: a.name,
  }));
  const next = typeof searchParams?.next === "string" ? searchParams.next : "/";
  return <LoginScreen demo={demo} next={next} />;
}
