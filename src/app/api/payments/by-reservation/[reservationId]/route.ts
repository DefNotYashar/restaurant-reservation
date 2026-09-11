import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { paymentService } from "@/lib/services/payment-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;

  try {
    const payment = await paymentService.getPaymentByReservationId(reservationId);
    if (!payment) return NextResponse.json({ error: "پرداختی یافت نشد" }, { status: 404 });
    return NextResponse.json(payment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطای داخلی سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
