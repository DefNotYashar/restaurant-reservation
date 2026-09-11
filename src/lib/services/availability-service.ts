import { and, eq, inArray, not } from "drizzle-orm";
import { db } from "@/lib/db";
import { tables as tablesSchema, reservations, reservationStatus } from "@/lib/schema";
import type { AvailabilityCheck, AvailabilityResponse, TableSuggestion, TimeSlot } from "@/lib/types/availability";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export class AvailabilityService {
  async check(input: AvailabilityCheck): Promise<AvailabilityResponse> {
    const restaurant = await db.query.restaurants.findFirst({
      where: (r) => eq(r.id, input.restaurantId),
    });

    if (!restaurant) return { status: "NOT_AVAILABLE", reason: "رستوران پیدا نشد" };

    const requestedTime = timeToMinutes(input.time);
    const duration = restaurant.reservationDurationMinutes;
    const requestedEnd = requestedTime + duration;
    const open = timeToMinutes(restaurant.openTime);
    const close = timeToMinutes(restaurant.closeTime);

    if (requestedTime < open || requestedEnd > close) {
      return {
        status: "NOT_AVAILABLE",
        reason: "رستوران در این ساعت باز نیست",
      };
    }

    // Party size is intentionally NOT limited here: staff handle seating
    // decisions (combining tables, large groups). Only opening hours are enforced.
    return {
      status: "AVAILABLE",
      availableTimeSlots: await this.getAvailableSlots(input),
    };
  }

  async getAvailableTables(input: AvailabilityCheck): Promise<TableSuggestion[]> {
    const restaurant = await db.query.restaurants.findFirst({
      where: (r) => eq(r.id, input.restaurantId),
    });

    if (!restaurant) return [];

    const duration = restaurant.reservationDurationMinutes;
    const startMin = timeToMinutes(input.time);
    const endMin = startMin + duration;

    const activeTables = await db
      .select()
      .from(tablesSchema)
      .where(and(eq(tablesSchema.restaurantId, input.restaurantId), eq(tablesSchema.active, true)));

    const occupyingStatuses = ["PENDING", "CONFIRMED", "ARRIVED", "SEATED"] as const;

    const whereConditions = [
      eq(reservations.restaurantId, input.restaurantId),
      eq(reservations.date, input.date),
      inArray(reservations.status, occupyingStatuses as unknown as ("PENDING" | "CONFIRMED" | "ARRIVED" | "SEATED")[]),
    ];

    if (input.excludeReservationId) {
      whereConditions.push(not(eq(reservations.id, input.excludeReservationId)));
    }

    const conflictingReservations = await db
      .select()
      .from(reservations)
      .where(and(...whereConditions));

    const unavailableTableIds = new Set<string>();

    for (const r of conflictingReservations) {
      const rStart = timeToMinutes(r.time);
      const rEnd = rStart + (r.durationMinutes ?? duration);

      if (overlap(startMin, endMin, rStart, rEnd)) {
        const assigned = await db.query.reservationTables.findMany({
          where: (rt) => eq(rt.reservationId, r.id),
        });
        for (const t of assigned) unavailableTableIds.add(t.tableId);
      }
    }

    return activeTables
      .filter((t) => !unavailableTableIds.has(t.id))
      .filter((t) => t.capacity >= input.partySize)
      .map((t) => ({
        tableId: t.id,
        name: t.name,
        capacity: t.capacity,
      }));
  }

  async getAvailableSlots(input: AvailabilityCheck): Promise<TimeSlot[]> {
    const restaurant = await db.query.restaurants.findFirst({
      where: (r) => eq(r.id, input.restaurantId),
    });

    if (!restaurant) return [];

    const duration = restaurant.reservationDurationMinutes;
    const open = timeToMinutes(restaurant.openTime);
    const close = timeToMinutes(restaurant.closeTime);

    const slots: TimeSlot[] = [];

    const reservedCapacities = await this.getReservedCapacities(input);

    // 30-minute steps so the bot offers real choices, not 2-3 coarse slots.
    for (let t = open; t + duration <= close; t += 30) {
      const time = minutesToTime(t);
      const available = (reservedCapacities[time] ?? 0) >= input.partySize;

      slots.push({
        time,
        available,
        reason: available ? undefined : "ظرفیت کافی در این ساعت وجود ندارد",
      });
    }

    return slots;
  }

  private async getReservedCapacities(input: AvailabilityCheck): Promise<Record<string, number>> {
    const restaurant = await db.query.restaurants.findFirst({
      where: (r) => eq(r.id, input.restaurantId),
    });

    if (!restaurant) return {};

    const duration = restaurant.reservationDurationMinutes;
    const open = timeToMinutes(restaurant.openTime);
    const close = timeToMinutes(restaurant.closeTime);

    const allTables = await db
      .select()
      .from(tablesSchema)
      .where(and(eq(tablesSchema.restaurantId, input.restaurantId), eq(tablesSchema.active, true)));

    const totalCapacity = allTables.reduce((sum, t) => sum + t.capacity, 0);

    const occupyingStatuses = ["PENDING", "CONFIRMED", "ARRIVED", "SEATED"] as const;

    const whereConditions = [
      eq(reservations.restaurantId, input.restaurantId),
      eq(reservations.date, input.date),
      inArray(reservations.status, occupyingStatuses as unknown as ("PENDING" | "CONFIRMED" | "ARRIVED" | "SEATED")[]),
    ];

    if (input.excludeReservationId) {
      whereConditions.push(not(eq(reservations.id, input.excludeReservationId)));
    }

    const conflictingReservations = await db
      .select()
      .from(reservations)
      .where(and(...whereConditions));

    const capacities: Record<string, number> = {};

    for (let t = open; t + duration <= close; t += 30) {
      capacities[minutesToTime(t)] = totalCapacity;
    }

    for (const r of conflictingReservations) {
      const rStart = timeToMinutes(r.time);
      const rEnd = rStart + (r.durationMinutes ?? duration);

      for (let t = open; t + duration <= close; t += 30) {
        const slotTime = minutesToTime(t);
        const slotStart = t;
        const slotEnd = t + duration;

        if (overlap(slotStart, slotEnd, rStart, rEnd)) {
          capacities[slotTime] = (capacities[slotTime] ?? totalCapacity) - r.partySize;
        }
      }
    }

    return capacities;
  }
}

function overlap(start1: number, end1: number, start2: number, end2: number): boolean {
  return start1 < end2 && start2 < end1;
}
