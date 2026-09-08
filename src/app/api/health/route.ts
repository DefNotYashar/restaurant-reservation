import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "OK" | "FAIL"> = {
    application: "OK",
  };

  try {
    await db.execute(sql`select 1`);
    checks.database = "OK";
  } catch {
    checks.database = "FAIL";
  }

  const ok = Object.values(checks).every((s) => s === "OK");
  return NextResponse.json({ status: ok ? "OK" : "DEGRADED", ...checks }, { status: ok ? 200 : 503 });
}