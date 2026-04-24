// Edge middleware: gate every page (and most API routes) behind a valid
// session. Public exceptions: /login, /api/auth/*, and Next.js internals.
//
// We only verify the JWT here; per-role authorisation lives in the screens
// and API routes (which call getSession from lib/auth.js to read the same
// payload).

import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionEdge } from "@/lib/auth-edge";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/auth/seed",
];

function isPublic(pathname) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Next.js internals + static assets
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionEdge(token);
  if (session) return NextResponse.next();

  // For API routes, return 401 instead of redirecting (better client UX).
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  // For page routes, bounce to /login and remember where they were going.
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

// Run on everything except _next and static. The function above filters again
// so this matcher just trims the obvious junk early.
export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
