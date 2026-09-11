import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments, reservations } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { paymentService } from "@/lib/services/payment-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });

  const { reservationId } = body;

  if (!reservationId) {
    return NextResponse.json({ error: "reservationId الزامی است" }, { status: 400 });
  }

  try {
    const payment = await paymentService.createPayment(reservationId);
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطای داخلی سرور";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
