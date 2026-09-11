import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { menuCategories, menuItems } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });

  try {
    if (body.kind === "category") {
      const { restaurantId, name, sortOrder } = body;
      if (!restaurantId || !name) return NextResponse.json({ error: "restaurantId و name الزامی هستند" }, { status: 400 });
      const [cat] = await db.insert(menuCategories).values({ restaurantId, name, sortOrder: sortOrder ?? 0 }).returning();
      return NextResponse.json(cat, { status: 201 });
    }

    const { restaurantId, categoryId, name, price, station, sortOrder } = body;
    if (!restaurantId || !name) return NextResponse.json({ error: "restaurantId و name الزامی هستند" }, { status: 400 });
    if (station && !["KITCHEN", "KEBAB"].includes(station)) {
      return NextResponse.json({ error: "station نامعتبر است" }, { status: 400 });
    }
    const [item] = await db
      .insert(menuItems)
      .values({ restaurantId, categoryId, name, price: price ?? 0, station: station ?? "KITCHEN", sortOrder: sortOrder ?? 0 })
      .returning();
    return NextResponse.json(item, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطای داخلی سرور" }, { status: 400 });
  }
}
