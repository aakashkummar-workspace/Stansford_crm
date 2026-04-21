import { NextResponse } from "next/server";
import { readAllData, BACKEND } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await readAllData();
  return NextResponse.json(data, { headers: { "x-data-backend": BACKEND } });
}
