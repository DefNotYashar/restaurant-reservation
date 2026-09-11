import { and, desc, eq, gte, inArray, like, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, reservations, reservationTables, tables, reservationStatus, users, restaurants } from "@/lib/schema";
import { AvailabilityService } from "./availability-service";

export interface CreateReservationInput {
  restaurantId: string;
  customerId: string;
  date: string;
  time: string;
  partySize: number;
  notes?: string;
  source?: "WEB" | "TELEGRAM" | "WHATSAPP" | "STAFF";
  tableIds?: string[];
}

export interface UpdateReservationInput {
  date?: string;
  time?: string;
  partySize?: number;
  notes?: string;
  customerNotes?: string;
  staffNotes?: string;
  status?: (typeof reservationStatus.enumValues)[number];
  tableIds?: string[];
}

export class ReservationService {
  private availability = new AvailabilityService();

  /** Legal status moves. Downgrades (e.g. ARRIVED → CONFIRMED) are rejected.
   *  CANCELLED → PENDING is allowed as a staff correction (reopen). */
  private static transitions: Record<string, string[]> = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["ARRIVED", "CANCELLED", "NO_SHOW"],
    ARRIVED: ["COMPLETED", "CANCELLED"],
    SEATED: ["COMPLETED", "CANCELLED"],
    CANCELLED: ["PENDING"],
    COMPLETED: [],
    NO_SHOW: [],
  };
  async createReservation(input: CreateReservationInput) {
    const restaurant = await db.query.restaurants.findFirst({
      where: (r) => eq(r.id, input.restaurantId),
    });

    if (!restaurant) throw new Error("رستوران پیدا نشد");

    const available = await this.availability.check({
      restaurantId: input.restaurantId,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
    });

    if (available.status !== "AVAILABLE") {
      throw new Error(available.reason ?? "این زمان در دسترس نیست");
    }

    const startOfYear = `${input.date.slice(0, 4)}-01-01`;

    const lastReservation = await db
      .select()
      .from(reservations)
      .where(eq(reservations.restaurantId, input.restaurantId))
      .orderBy(desc(reservations.createdAt))
      .limit(1);

    const nextNumber =
      lastReservation.length > 0
        ? (parseInt(lastReservation[0].code.replace("#", ""), 10) || 0) + 1
        : 1;

    const code = `#${nextNumber}`;

    const [reservation] = await db
      .insert(reservations)
      .values({
        restaurantId: input.restaurantId,
        customerId: input.customerId,
        date: input.date,
        time: input.time,
        partySize: input.partySize,
        notes: input.notes,
        customerNotes: input.notes,
        source: input.source ?? "WEB",
        status: "PENDING",
        durationMinutes: restaurant.reservationDurationMinutes,
        code,
      })
      .returning();

    if (input.tableIds && input.tableIds.length > 0) {
      await this.assignTables(reservation.id, input.tableIds);
    }

    return reservation;
  }

  async confirmReservation(id: string) {
    return this.updateReservation(id, { status: "CONFIRMED" });
  }

  async updateReservation(id: string, input: UpdateReservationInput) {
    const existing = await db.query.reservations.findFirst({
      where: (r) => eq(r.id, id),
    });

    if (!existing) throw new Error("رزرو پیدا نشد");

    if (input.status && input.status !== existing.status) {
      const allowed = ReservationService.transitions[existing.status] ?? [];
      if (!allowed.includes(input.status)) {
        throw new Error(`تغییر وضعیت از ${existing.status} به ${input.status} مجاز نیست`);
      }
    }

    const newDate = input.date ?? existing.date;
    const newTime = input.time ?? existing.time;
    const newPartySize = input.partySize ?? existing.partySize;

    const available = await this.availability.check({
      restaurantId: existing.restaurantId,
      date: newDate,
      time: newTime,
      partySize: newPartySize,
      excludeReservationId: id,
    });

    if (available.status !== "AVAILABLE") {
      throw new Error(available.reason ?? "زمان جدید در دسترس نیست");
    }

    const [updated] = await db
      .update(reservations)
      .set({
        date: input.date ?? existing.date,
        time: input.time ?? existing.time,
        partySize: input.partySize ?? existing.partySize,
        notes: input.notes ?? existing.notes,
        customerNotes: input.customerNotes ?? existing.customerNotes,
        staffNotes: input.staffNotes ?? existing.staffNotes,
        status: input.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(eq(reservations.id, id))
      .returning();

    if (input.tableIds) {
      await db
        .delete(reservationTables)
        .where(eq(reservationTables.reservationId, id));

      if (input.tableIds.length > 0) {
        await this.assignTables(id, input.tableIds);
      }
    }

    return updated;
  }

  async cancelReservation(id: string) {
    return this.updateReservation(id, { status: "CANCELLED" });
  }

  async markArrived(id: string) {
    return this.updateReservation(id, { status: "ARRIVED" });
  }

  async markSeated(id: string) {
    return this.updateReservation(id, { status: "SEATED" });
  }

  async completeReservation(id: string) {
    return this.updateReservation(id, { status: "COMPLETED" });
  }

  async markNoShow(id: string) {
    return this.updateReservation(id, { status: "NO_SHOW" });
  }

  async assignTables(reservationId: string, tableIds: string[]) {
    const existing = await db.query.reservations.findFirst({
      where: (r) => eq(r.id, reservationId),
    });

    if (!existing) throw new Error("رزرو پیدا نشد");

    const values = tableIds.map((tableId) => ({
      reservationId,
      tableId,
    }));

    const assigned = await db
      .insert(reservationTables)
      .values(values)
      .onConflictDoNothing()
      .returning();

    if (existing.status === "PENDING") {
      await db
        .update(reservations)
        .set({ status: "CONFIRMED", updatedAt: new Date() })
        .where(eq(reservations.id, reservationId));
    }

    return assigned;
  }

  async findSuggestions(
    restaurantId: string,
    date: string,
    time: string,
    partySize: number,
  ): Promise<any[]> {
    const suggestions = await this.availability.getAvailableTables({
      restaurantId,
      date,
      time,
      partySize,
    });

    return suggestions;
  }

  async findByCustomer(customerId: string, activeOnly = true) {
    const where = [eq(reservations.customerId, customerId)];

    if (activeOnly) {
      where.push(
        inArray(reservations.status, [
          "PENDING",
          "CONFIRMED",
          "ARRIVED",
          "SEATED",
        ]),
      );
    }

    const result = await db
      .select()
      .from(reservations)
      .where(and(...where))
      .orderBy(desc(reservations.date), desc(reservations.time));

    return result;
  }

  async getForDate(restaurantId: string, date: string) {
    const conditions = [eq(reservations.date, date)];

    if (restaurantId !== "ALL") {
      conditions.push(eq(reservations.restaurantId, restaurantId));
    }

    return db
      .select()
      .from(reservations)
      .where(and(...conditions))
      .orderBy(reservations.time);
  }

  async getById(id: string) {
    return db.query.reservations.findFirst({
      where: (r) => eq(r.id, id),
      with: {
        customer: true,
        reservationTables: {
          with: {
            table: true,
          },
        },
      },
    });
  }

  async getAll(restaurantId: string) {
    if (restaurantId === "ALL") {
      return db
        .select()
        .from(reservations)
        .orderBy(desc(reservations.date), desc(reservations.time));
    }

    return db
      .select()
      .from(reservations)
      .where(eq(reservations.restaurantId, restaurantId))
      .orderBy(desc(reservations.date), desc(reservations.time));
  }
}