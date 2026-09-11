import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments } from "@/lib/schema";
import { eq } from "drizzle-orm";

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
    if (payment.status !== "PENDING") return NextResponse.json({ error: "این پرداخت قابل پردازش نیست" }, { status: 400 });
    if (!payment.authority) return NextResponse.json({ error: "Authority وجود ندارد" }, { status: 400 });

    return NextResponse.json({ authority: payment.authority });
  } catch (e) {
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}