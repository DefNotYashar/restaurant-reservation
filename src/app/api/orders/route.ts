import { NextRequest, NextResponse } from "next/server";
import { OrderService } from "@/lib/services/order-service";

export const dynamic = "force-dynamic";

const service = new OrderService();

export async function GET(req: NextRequest) {
  const tableId = req.nextUrl.searchParams.get("tableId");
  if (!tableId) return NextResponse.json({ error: "tableId الزامی است" }, { status: 400 });
  return NextResponse.json(await service.getTableOrders(tableId));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });

  const { restaurantId, tableId, customerId, note, items } = body;
  if (!restaurantId || !items) {
    return NextResponse.json({ error: "restaurantId و items الزامی هستند" }, { status: 400 });
  }

  try {
    const order = await service.submitOrder({ restaurantId, tableId, customerId, note, items });
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطای داخلی سرور" }, { status: 409 });
  }
}
