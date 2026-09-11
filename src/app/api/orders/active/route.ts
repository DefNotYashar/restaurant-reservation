import { NextRequest, NextResponse } from "next/server";
import { OrderService } from "@/lib/services/order-service";

export const dynamic = "force-dynamic";

const service = new OrderService();

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId الزامی است" }, { status: 400 });
  if (restaurantId === "ALL") {
    const { db } = await import("@/lib/db");
    const { restaurants } = await import("@/lib/schema");
    const list = await db.select().from(restaurants).limit(1);
    if (list.length === 0) return NextResponse.json([], { status: 200 });
    return NextResponse.json(await service.getActiveOrders(list[0].id));
  }
  return NextResponse.json(await service.getActiveOrders(restaurantId));
}
