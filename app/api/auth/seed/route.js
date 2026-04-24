import { NextResponse } from "next/server";
import { listUsers } from "@/lib/db";
import { ensureDemoUsers, DEMO_ACCOUNTS } from "@/lib/seed-users";

// Public-safe accounts list so the login page can show "sign in as ___" hints.
export async function GET() {
  return NextResponse.json({
    accounts: DEMO_ACCOUNTS.map((a) => ({
      email: a.email, password: a.password, role: a.role, name: a.name,
    })),
  });
}

export async function POST() {
  const created = await ensureDemoUsers();
  const total = (await listUsers()).length;
  return NextResponse.json({ ok: true, created, total });
}
