import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tables } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId الزامی است" }, { status: 400 });

  const list = await db.select().from(tables).where(eq(tables.restaurantId, restaurantId));
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });

  const { restaurantId, name, capacity, x, y, width, height, rotation } = body;

  if (!restaurantId || !name || !capacity) {
    return NextResponse.json({ error: "restaurantId, name, capacity الزامی هستند" }, { status: 400 });
  }

  const [table] = await db
    .insert(tables)
    .values({ restaurantId, name, capacity, x, y, width, height, rotation })
    .returning();

  return NextResponse.json(table, { status: 201 });
}