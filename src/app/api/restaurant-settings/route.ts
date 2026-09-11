import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { restaurantSettings } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId الزامی است" }, { status: 400 });

  try {
    const [settings] = await db.select().from(restaurantSettings).where(eq(restaurantSettings.restaurantId, restaurantId));
    if (!settings) return NextResponse.json({ depositEnabled: false, depositAmount: 0 }, { status: 200 });
    return NextResponse.json({ depositEnabled: settings.depositEnabled, depositAmount: settings.depositAmount });
  } catch (e) {
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });

  const { restaurantId, depositEnabled, depositAmount } = body;
  if (!restaurantId) return NextResponse.json({ error: "restaurantId الزامی است" }, { status: 400 });

  try {
    const [existing] = await db.select().from(restaurantSettings).where(eq(restaurantSettings.restaurantId, restaurantId)).limit(1);

    if (existing) {
      const [updated] = await db
        .update(restaurantSettings)
        .set({ depositEnabled: depositEnabled ?? existing.depositEnabled, depositAmount: depositAmount ?? existing.depositAmount, updatedAt: new Date() })
        .where(eq(restaurantSettings.restaurantId, restaurantId))
        .returning();
      return NextResponse.json({ depositEnabled: updated.depositEnabled, depositAmount: updated.depositAmount });
    }

    const [created] = await db
      .insert(restaurantSettings)
      .values({ restaurantId, depositEnabled: depositEnabled ?? false, depositAmount: depositAmount ?? 0 })
      .returning();
    return NextResponse.json({ depositEnabled: created.depositEnabled, depositAmount: created.depositAmount });
  } catch (e) {
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
