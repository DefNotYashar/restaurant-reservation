import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reservationTables } from "@/lib/schema";
import { ReservationService } from "@/lib/services/reservation-service";

export const dynamic = "force-dynamic";

const service = new ReservationService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reservation = await service.getById(id);
  if (!reservation) return NextResponse.json({ error: "رزرو پیدا نشد" }, { status: 404 });
  const { reservationTables: links, ...rest } = reservation as typeof reservation & { reservationTables: unknown[] };
  return NextResponse.json({ ...rest, assignedTables: links });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });

  try {
    const updated = await service.updateReservation(id, body);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطای داخلی سرور";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cancelled = await service.cancelReservation(id);
  await db.delete(reservationTables).where(eq(reservationTables.reservationId, id));
  return NextResponse.json(cancelled);
}