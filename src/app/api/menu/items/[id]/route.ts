import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { menuItems } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["name", "price", "station", "sortOrder", "active", "categoryId"]) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  if (patch.station && !["KITCHEN", "KEBAB"].includes(patch.station as string)) {
    return NextResponse.json({ error: "station نامعتبر است" }, { status: 400 });
  }

  const [updated] = await db.update(menuItems).set(patch).where(eq(menuItems.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "آیتم پیدا نشد" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.update(menuItems).set({ active: false, updatedAt: new Date() }).where(eq(menuItems.id, id));
  return NextResponse.json({ ok: true });
}
