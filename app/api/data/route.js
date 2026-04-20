import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDb();
  return NextResponse.json(db);
}
