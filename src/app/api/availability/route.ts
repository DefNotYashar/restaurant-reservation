import { NextRequest, NextResponse } from "next/server";
import { AvailabilityService } from "@/lib/services/availability-service";

export const dynamic = "force-dynamic";

const service = new AvailabilityService();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });

  const { restaurantId, date, time, partySize, excludeReservationId } = body;

  if (!restaurantId || !date || !time || !partySize) {
    return NextResponse.json({ error: "مقدارهای restaurantId, date, time, partySize الزامی هستند" }, { status: 400 });
  }

  try {
    const result = await service.check({
      restaurantId,
      date,
      time,
      partySize,
      excludeReservationId,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}