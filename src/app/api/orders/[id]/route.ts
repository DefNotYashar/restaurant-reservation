import { NextRequest, NextResponse } from "next/server";
import { OrderService } from "@/lib/services/order-service";

export const dynamic = "force-dynamic";

const service = new OrderService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await service.getOrder(id);
  if (!order) return NextResponse.json({ error: "سفارش پیدا نشد" }, { status: 404 });
  return NextResponse.json(order);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.items) return NextResponse.json({ error: "items الزامی است" }, { status: 400 });

  try {
    const created = await service.addItems(id, body.items);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطای داخلی سرور" }, { status: 409 });
  }
}
