import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, reservations } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId الزامی است" }, { status: 400 });

  const list =
    restaurantId === "ALL"
      ? await db.select().from(customers).orderBy(desc(customers.createdAt))
      : await db
          .select()
          .from(customers)
          .where(eq(customers.restaurantId, restaurantId))
          .orderBy(desc(customers.createdAt));

  const withStats = await Promise.all(
    list.map(async (c) => {
      const history = await db
        .select()
        .from(reservations)
        .where(eq(reservations.customerId, c.id))
        .orderBy(desc(reservations.date));
      const active = history.filter((r) => ["PENDING", "CONFIRMED", "ARRIVED", "SEATED"].includes(r.status));
      return {
        ...c,
        totalReservations: history.length,
        activeReservations: active.length,
        lastVisit: history[0]?.date ?? null,
        reservations: history.slice(0, 10),
      };
    }),
  );

  return NextResponse.json(withStats);
}
