import { NextRequest, NextResponse } from "next/server";
import { OrderService, type Station } from "@/lib/services/order-service";

export const dynamic = "force-dynamic";

const service = new OrderService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ station: string }> }) {
  const { station } = await params;
  if (station !== "KITCHEN" && station !== "KEBAB") {
    return NextResponse.json({ error: "station نامعتبر است" }, { status: 400 });
  }
  const url = new URL(_req.url);
  const restaurantId = url.searchParams.get("restaurantId");
  if (!restaurantId) return NextResponse.json({ error: "restaurantId الزامی است" }, { status: 400 });
  const include = (url.searchParams.get("include") ?? "").split(",");
  const statuses = include.includes("ready")
    ? (["NEW", "PREPARING", "READY"] as const)
    : (["NEW", "PREPARING"] as const);
  return NextResponse.json(await service.getStationBoard(restaurantId, station as Station, [...statuses]));
}
