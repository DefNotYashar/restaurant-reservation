import { NextRequest, NextResponse } from "next/server";
import { OrderService, type ItemStatus } from "@/lib/services/order-service";

export const dynamic = "force-dynamic";

const service = new OrderService();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.status) return NextResponse.json({ error: "status الزامی است" }, { status: 400 });

  try {
    const updated = await service.setItemStatus(id, body.status as ItemStatus);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "خطای داخلی سرور" }, { status: 409 });
  }
}
