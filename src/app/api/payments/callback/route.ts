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

    await db
      .update(payments)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(payments.authority, authority));

    return NextResponse.redirect(new URL("/payment/failed", req.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطای داخلی سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
