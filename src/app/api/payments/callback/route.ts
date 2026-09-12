import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/services/payment-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get("Authority");
  const status = searchParams.get("Status");

  if (!authority) {
    return NextResponse.json({ error: "Authority الزامی است" }, { status: 400 });
  }

  if (status !== "OK") {
    return NextResponse.redirect(new URL("/payment/failed", req.url));
  }

  try {
    const result = await paymentService.verifyPaymentAndCreateReservation(authority);
    if (result.alreadyPaid) {
      return NextResponse.redirect(new URL(`/payment/success?paymentId=${result.payment.id}`, req.url));
    }
    return NextResponse.redirect(new URL(`/payment/success?paymentId=${result.payment.id}&reservationId=${result.reservation?.id}`, req.url));
  } catch {
    return NextResponse.redirect(new URL("/payment/failed", req.url));
  }
}
