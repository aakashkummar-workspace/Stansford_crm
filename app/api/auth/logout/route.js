import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, getSession } from "@/lib/auth";
import { logAudit } from "@/lib/db";

export async function POST() {
  const session = await getSession();
  if (session?.name) {
    await logAudit(session.name, "Sign out", session.email || "");
  }
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}
