import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "./db";
import { restaurants, customers, tables, users } from "./schema";
import { toFaDigits } from "./persian";

export async function seed() {
  const [restaurant] = await db
    .insert(restaurants)
    .values({
      name: "رستوران نمونه",
      phone: "+982112345678",
      address: "تهران",
      openTime: "18:00",
      closeTime: "23:30",
      reservationDurationMinutes: 90,
      bufferMinutes: 15,
      maxPartySize: 500,
      minAdvanceDays: 0,
      maxAdvanceDays: 30,
    })
    .returning();

  await db
    .insert(users)
    .values({
      restaurantId: restaurant.id,
      name: "مدیر",
      phone: "+989121111111",
      role: "MANAGER",
      passwordHash: "CHANGE_ME",
    });

  const [customer] = await db
    .insert(customers)
    .values({
      restaurantId: restaurant.id,
      name: "محمد احمدی",
      phone: "+989121234567",
      channel: "WEB",
    })
    .returning();

  const tableCaps = [2, 2, 4, 4, 6, 8, 2, 4, 2, 6, 4, 8, 2, 4, 6, 4, 2, 8, 6, 4, 2, 4, 10, 6, 2];
  await db.insert(tables).values(
    tableCaps.map((capacity, i) => ({
      restaurantId: restaurant.id,
      name: `میز ${toFaDigits(i + 1)}`,
      capacity,
      x: 20 + (i % 5) * 140,
      y: 80 + Math.floor(i / 5) * 140,
      width: 60,
      height: 60,
    })),
  );

  console.log("Seed complete.");
  return { restaurant, customer };
}