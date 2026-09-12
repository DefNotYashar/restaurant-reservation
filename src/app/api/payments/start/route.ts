import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getPaymentGatewayUrl, paymentService } from "@/lib/services/payment-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("paymentId");

  if (!paymentId) {
    return NextResponse.json({ error: "paymentId الزامی است" }, { status: 400 });
  }

  try {
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment) return NextResponse.json({ error: "پرداخت یافت نشد" }, { status: 404 });
    if (payment.status === "PAID") return NextResponse.json({ error: "این پرداخت قابل پردازش نیست" }, { status: 400 });

    let paymentToStart = payment;
    if (!payment.reservationId) {
      return NextResponse.json({ error: "پرداخت بدون رزرو معتبر نیست" }, { status: 400 });
    }
    if (payment.status === "FAILED" || payment.status === "CANCELLED") {
      paymentToStart = await paymentService.createPayment(payment.reservationId);
    } else if (!paymentToStart.authority) {
      paymentToStart = await paymentService.createPayment(payment.reservationId);
    }

    if (!paymentToStart.authority) return NextResponse.json({ error: "درگاه پرداخت در دسترس نیست" }, { status: 503 });
    return NextResponse.json({ authority: paymentToStart.authority, gatewayUrl: getPaymentGatewayUrl(paymentToStart.authority) });
  } catch {
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}