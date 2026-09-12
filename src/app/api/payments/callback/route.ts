import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { paymentService } from "@/lib/services/payment-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get("Authority");
  const status = searchParams.get("Status");

  if (!authority) {
    return NextResponse.json({ error: "Authority الزامی است" }, { status: 400 });
  }

  try {
    if (status === "OK") {
      const payment = await paymentService.verifyPayment(authority);
      return NextResponse.redirect(new URL(`/payment/success?paymentId=${payment.id}`, req.url));
    }

    const [payment] = await db.select().from(payments).where(eq(payments.authority, authority)).limit(1);
    if (payment) {
      await db
        .update(payments)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
      return NextResponse.redirect(new URL(`/payment/failed?paymentId=${payment.id}`, req.url));
    }

    return NextResponse.redirect(new URL("/payment/failed", req.url));
  } catch {
    try {
      const [failedPayment] = await db.select().from(payments).where(eq(payments.authority, authority)).limit(1);
      if (failedPayment) {
        return NextResponse.redirect(new URL(`/payment/failed?paymentId=${failedPayment.id}`, req.url));
      }
    } catch {
      return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
    }
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
