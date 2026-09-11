import {
  cancelReservation,
  fetchReservations,
  updateReservation,
  type ReservationDto,
  type TableDto,
} from "./api";

export type { ReservationDto, TableDto };
export { updateReservation };

export const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "ARRIVED", "SEATED"];

/** Accepted by staff: allowed onto the table plan. PENDING stays off until confirmed. */
export const ACCEPTED_STATUSES = ["CONFIRMED", "ARRIVED", "SEATED"];

/** Finished visits: shown in the customers history log. Ongoing ones stay out. */
export const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "NO_SHOW"];

export type Presence = "pending" | "coming" | "here" | "cancelled" | "done";

export function presenceOf(r: ReservationDto): Presence {
  switch (r.status) {
    case "PENDING":
      return "pending";
    case "CONFIRMED":
      return "coming";
    case "ARRIVED":
    case "SEATED":
      return "here";
    case "CANCELLED":
      return "cancelled";
    default:
      return "done";
  }
}

/** Right-edge (visual start in RTL) row accent per presence. */
export const PRESENCE_BAR: Record<Presence, string> = {
  pending: "border-r-yellow-400",
  coming: "border-r-emerald-500",
  here: "border-r-sky-500",
  cancelled: "border-r-red-500",
  done: "border-r-zinc-700",
};

/** Full card tint per presence (table plan + lists). */
export const PRESENCE_CARD: Record<Presence, string> = {
  pending: "border-yellow-400/40 bg-yellow-400/10",
  coming: "border-emerald-500/40 bg-emerald-500/10",
  here: "border-sky-500/40 bg-sky-500/10",
  cancelled: "border-red-500/40 bg-red-500/10",
  done: "border-zinc-700 bg-zinc-950 opacity-70",
};

export function isActiveReservation(r: ReservationDto): boolean {
  return ACTIVE_STATUSES.includes(r.status);
}

export function isAcceptedReservation(r: ReservationDto): boolean {
  return ACCEPTED_STATUSES.includes(r.status);
}

export function isUnassigned(r: ReservationDto): boolean {
  return isActiveReservation(r) && (!r.assignedTables || r.assignedTables.length === 0);
}

export function assignedTableNames(r: ReservationDto): string {
  const names = (r.assignedTables ?? [])
    .map((a) => a.table?.name)
    .filter(Boolean) as string[];
  return names.length > 0 ? names.join("، ") : "تخصیص‌نیافته";
}

export function maskPhone(phone: string | undefined | null): string {
  if (!phone) return "-";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone;
  return `${digits.slice(0, 4)}•••${digits.slice(-2)}`;
}

export function displayNotes(r: ReservationDto): string | null {
  return r.customerNotes ?? r.notes ?? null;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Duration defaults to 120 min when the row has none. */
export function reservationInterval(r: ReservationDto, durationMin = 120): [number, number] {
  const start = toMinutes(r.time.slice(0, 5));
  return [start, start + durationMin];
}

export function overlaps(a: ReservationDto, b: ReservationDto, durationMin = 120): boolean {
  if (a.date !== b.date || a.id === b.id) return false;
  const [s1, e1] = reservationInterval(a, durationMin);
  const [s2, e2] = reservationInterval(b, durationMin);
  return s1 < e2 && s2 < e1;
}

/** Reservations on the same table overlapping the given one. */
export function findConflicts(
  target: ReservationDto,
  all: ReservationDto[],
  tableId: string,
  durationMin = 120,
): ReservationDto[] {
  return all.filter(
    (r) =>
      r.id !== target.id &&
      isActiveReservation(r) &&
      (r.assignedTables ?? []).some((a) => a.table?.id === tableId) &&
      r.date === target.date &&
      overlaps(r, target, durationMin),
  );
}

export function exceedsCapacity(r: ReservationDto, table: TableDto): boolean {
  return r.partySize > table.capacity;
}

export async function reloadReservations(date?: string): Promise<ReservationDto[]> {
  return fetchReservations("ALL", date);
}

export async function assignTables(reservationId: string, tableIds: string[]): Promise<ReservationDto> {
  return updateReservation(reservationId, { tableIds });
}

export async function unassignTables(reservationId: string): Promise<ReservationDto> {
  return updateReservation(reservationId, { tableIds: [] });
}

export async function confirmReservation(id: string): Promise<ReservationDto> {
  return updateReservation(id, { status: "CONFIRMED" });
}

export async function arriveReservation(id: string): Promise<ReservationDto> {
  return updateReservation(id, { status: "ARRIVED" });
}

export async function cancelReservationById(id: string): Promise<ReservationDto> {
  return cancelReservation(id);
}

export async function completeReservation(id: string): Promise<ReservationDto> {
  return updateReservation(id, { status: "COMPLETED" });
}

export async function markNoShow(id: string): Promise<ReservationDto> {
  return updateReservation(id, { status: "NO_SHOW" });
}

export async function saveStaffNotes(id: string, staffNotes: string): Promise<ReservationDto> {
  return updateReservation(id, { staffNotes });
}

export async function updateReservationDetails(
  id: string,
  input: { date?: string; time?: string; partySize?: number; customerNotes?: string },
): Promise<ReservationDto> {
  return updateReservation(id, input);
}
