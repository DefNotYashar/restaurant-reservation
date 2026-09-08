import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { restaurants } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = await db.select().from(restaurants);
  return NextResponse.json(list);
}