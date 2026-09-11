import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reservationTables, tables } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });

  const [updated] = await db.update(tables).set(body).where(eq(tables.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "میز پیدا نشد" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(reservationTables).where(eq(reservationTables.tableId, id));
  await db.delete(tables).where(eq(tables.id, id));
  return NextResponse.json({ ok: true });
}