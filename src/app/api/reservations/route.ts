import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, reservations, reservationTables } from "@/lib/schema";
import { ReservationService } from "@/lib/services/reservation-service";

export const dynamic = "force-dynamic";

const service = new ReservationService();

async function withRelations(list: (typeof reservations.$inferSelect)[]) {
  return Promise.all(
    list.map(async (r) => {
      const [customer, links] = await Promise.all([
        db.query.customers.findFirst({ where: (c) => eq(c.id, r.customerId) }),
        db.select().from(reservationTables).where(eq(reservationTables.reservationId, r.id)),
      ]);
      const assignedTables = await Promise.all(
        links.map(async (l) => {
          const table = await db.query.tables.findFirst({ where: (t) => eq(t.id, l.tableId) });
          return { ...l, table };
        }),
      );
      return { ...r, customer, assignedTables };
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
    let customer = await db.query.customers.findFirst({
      where: (c) => eq(c.phone, phone),
    });

    if (!customer) {
      const [created] = await db
        .insert(customers)
        .values({
          restaurantId,
          name,
          phone,
          channel: source ?? "WEB",
        })
        .returning();
      customer = created;
    } else {
      [customer] = await db
        .update(customers)
        .set({ name, restaurantId })
        .where(eq(customers.id, customer.id))
        .returning();
    }

    const reservation = await service.createReservation({
      restaurantId,
      customerId: customer.id,
      date,
      time,
      partySize,
      notes,
      source,
      tableIds,
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطای داخلی سرور";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}