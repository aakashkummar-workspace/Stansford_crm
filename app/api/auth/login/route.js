import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUserByEmail, logAudit } from "@/lib/db";
import { DEMO_ACCOUNTS } from "@/lib/seed-users";
import {
  verifyPassword, signSession, ROLE_KEYS,
  SESSION_COOKIE, SESSION_TTL_SECONDS,
} from "@/lib/auth";

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { body = null; }
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password are required" }, { status: 400 });
  }

  // Look up by DB first; fall back to in-memory demo list so the five seeded
  // accounts always work even if the Supabase users table isn't reachable
  // yet (e.g. PostgREST schema cache hasn't refreshed after migration).
  let user = null;
  try { user = await getUserByEmail(email); } catch {}

  if (user) {
    // Normal path: verify the bcrypt hash. If the file user has no hash
    // (e.g. it was lazy-seeded by a class-teacher reassignment before the
    // user's first sign-in), fall back to the demo password so the demo
    // accounts keep working with their documented credentials.
    let ok = false;
    if (user.passwordHash) {
      ok = await verifyPassword(password, user.passwordHash);
    } else {
      const demo = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email);
      ok = !!demo && demo.password === password;
    }
    if (!ok) return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
  } else {
    const demo = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email);
    if (!demo || demo.password !== password) {
      return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 });
    }
    user = { id: demo.id, email: demo.email, name: demo.name, role: demo.role, linkedId: demo.linkedId || null };
  }

  if (!ROLE_KEYS.includes(user.role)) {
    return NextResponse.json({ ok: false, error: "Account has no valid role" }, { status: 403 });
  }

  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    linkedId: user.linkedId || null,
    linkedClasses: Array.isArray(user.linkedClasses) ? user.linkedClasses : [],
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  // Audit log is best-effort — don't fail login if it errors.
  try { await logAudit(user.name, "Sign in", user.email); } catch {}

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id, email: user.email, name: user.name, role: user.role,
      linkedId: user.linkedId || null,
      linkedClasses: Array.isArray(user.linkedClasses) ? user.linkedClasses : [],
    },
  });
}
