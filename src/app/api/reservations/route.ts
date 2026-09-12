import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, reservations, reservationTables, restaurantSettings, payments } from "@/lib/schema";
import { ReservationService } from "@/lib/services/reservation-service";
import { paymentService } from "@/lib/services/payment-service";

export const dynamic = "force-dynamic";

const service = new ReservationService();

async function withRelations(list: (typeof reservations.$inferSelect)[]) {
  return Promise.all(
    list.map(async (r) => {
      const [customer, links, payment] = await Promise.all([
        db.query.customers.findFirst({ where: (c) => eq(c.id, r.customerId) }),
        db.select().from(reservationTables).where(eq(reservationTables.reservationId, r.id)),
        db.query.payments.findFirst({
          where: (p) => eq(p.reservationId, r.id),
          orderBy: (p, { desc }) => [desc(p.createdAt)],
        }),
      ]);
      const assignedTables = await Promise.all(
        links.map(async (l) => {
          const table = await db.query.tables.findFirst({ where: (t) => eq(t.id, l.tableId) });
          return { ...l, table };
        }),
      );
      return { ...r, customer, assignedTables, payment };
    }),
  );
}

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  const date = req.nextUrl.searchParams.get("date");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId الزامی است" }, { status: 400 });
  }

  try {
    if (date) {
      const list = await service.getForDate(restaurantId, date);
      return NextResponse.json(await withRelations(list));
    }

    const list = await service.getAll(restaurantId);
    return NextResponse.json(await withRelations(list));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });

  const { restaurantId, date, time, partySize, name, phone, notes, source, tableIds } = body;

  if (!restaurantId || !date || !time || !partySize || !name || !phone) {
    return NextResponse.json(
      { error: "restaurantId, date, time, partySize, name, phone الزامی هستند" },
      { status: 400 },
    );
  }

  try {
    const settings = await db.query.restaurantSettings.findFirst({
      where: (s) => eq(s.restaurantId, restaurantId),
    });

    const payment = await paymentService.createPaymentIntent({
      restaurantId,
      amount: settings?.depositAmount ?? 0,
      metadata: {
        name,
        phone,
        date,
        time,
        partySize,
        notes,
        source: source ?? "WEB",
        restaurantId,
      },
    });

    const requiresPayment = !!settings && settings.depositAmount > 0 ? true : false;

    return NextResponse.json({ payment, requiresPayment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطای داخلی سرور";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}