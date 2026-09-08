import { db } from "./db";
import { restaurants, customers, tables, users } from "./schema";

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
      maxPartySize: 10,
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

  await db.insert(tables).values([
    { restaurantId: restaurant.id, name: "T1", capacity: 2, x: 20, y: 80, width: 60, height: 60 },
    { restaurantId: restaurant.id, name: "T2", capacity: 2, x: 160, y: 80, width: 60, height: 60 },
    { restaurantId: restaurant.id, name: "T3", capacity: 4, x: 40, y: 220, width: 80, height: 80 },
    { restaurantId: restaurant.id, name: "T4", capacity: 4, x: 180, y: 220, width: 80, height: 80 },
    { restaurantId: restaurant.id, name: "T5", capacity: 6, x: 320, y: 180, width: 90, height: 90 },
    { restaurantId: restaurant.id, name: "T6", capacity: 8, x: 40, y: 380, width: 100, height: 100 },
  ]);

  console.log("Seed complete.");
  return { restaurant, customer };
}