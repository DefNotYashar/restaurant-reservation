import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 });

  const { name, phone } = body;
  if (!name && !phone) return NextResponse.json({ error: "name یا phone الزامی است" }, { status: 400 });

  const patch: Partial<typeof customers.$inferInsert> = { updatedAt: new Date() };
  if (typeof name === "string" && name.trim()) patch.name = name.trim();
  if (typeof phone === "string" && phone.trim()) patch.phone = phone.trim();

  const [updated] = await db.update(customers).set(patch).where(eq(customers.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "مشتری پیدا نشد" }, { status: 404 });
  return NextResponse.json(updated);
}
