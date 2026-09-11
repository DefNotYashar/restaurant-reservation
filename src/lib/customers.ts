import type { ReservationDto } from "./api";

export interface CustomerWithStats {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  channel?: string | null;
  totalReservations: number;
  activeReservations: number;
  lastVisit: string | null;
  reservations: ReservationDto[];
}

export async function fetchCustomers(restaurantId = "ALL"): Promise<CustomerWithStats[]> {
  const res = await fetch(`/api/customers?restaurantId=${restaurantId}`, { cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "خطای ارتباط با سرور");
  return data as CustomerWithStats[];
}

export async function updateCustomer(id: string, input: { name?: string; phone?: string }) {
  const res = await fetch(`/api/customers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "ویرایش مشتری ناموفق بود");
  return data;
}
