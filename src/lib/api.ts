export interface CustomerDto {
  id: string;
  name: string;
  phone: string;
}

export interface ReservationDto {
  id: string;
  restaurantId: string;
  customerId: string;
  date: string;
  time: string;
  partySize: number;
  status: string;
  notes?: string | null;
  source?: string | null;
  code: string;
  customer?: CustomerDto | null;
  assignedTables?: { table?: TableDto }[];
}

export interface TableDto {
  id: string;
  restaurantId: string;
  name: string;
  capacity: number;
  status: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  active: boolean;
}

export interface RestaurantDto {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
  reservationDurationMinutes: number;
  bufferMinutes: number;
  maxPartySize: number;
  minAdvanceDays: number;
  maxAdvanceDays: number;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error ?? "خطای ارتباط با سرور");
  }

  return data as T;
}

export async function getRestaurant(): Promise<RestaurantDto> {
  const list = await request<RestaurantDto[]>("/api/restaurants");
  return list[0];
}

export async function fetchToday(date?: string): Promise<ReservationDto[]> {
  const d = date ?? new Date().toISOString().slice(0, 10);
  return request<ReservationDto[]>(`/api/reservations?restaurantId=ALL&date=${d}`);
}

export async function fetchReservations(restaurantId: string, date?: string): Promise<ReservationDto[]> {
  const params = new URLSearchParams({ restaurantId });
  if (date) params.set("date", date);
  return request<ReservationDto[]>(`/api/reservations?${params}`);
}

export async function fetchTables(restaurantId: string): Promise<TableDto[]> {
  return request<TableDto[]>(`/api/tables?restaurantId=${restaurantId}`);
}

export async function createReservation(input: Record<string, unknown>) {
  return request<ReservationDto>("/api/reservations", { method: "POST", body: JSON.stringify(input) });
}

export async function updateReservation(id: string, input: Record<string, unknown>) {
  return request<ReservationDto>(`/api/reservations/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function cancelReservation(id: string) {
  return request<ReservationDto>(`/api/reservations/${id}`, { method: "DELETE" });
}

export async function checkAvailability(input: Record<string, unknown>) {
  return request<{ status: string; availableTimeSlots?: { time: string; available: boolean }[] }>("/api/availability", {
    method: "POST",
    body: JSON.stringify(input),
  });
}