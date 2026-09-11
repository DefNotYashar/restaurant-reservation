import type { TableDto } from "./api";

export type { TableDto };

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "خطای ارتباط با سرور");
  return data as T;
}

export async function fetchAllTables(restaurantId = "ALL"): Promise<TableDto[]> {
  return req<TableDto[]>(`/api/tables?restaurantId=${restaurantId}`);
}

export async function createTable(input: {
  restaurantId: string;
  name: string;
  capacity: number;
}): Promise<TableDto> {
  return req<TableDto>("/api/tables", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTable(id: string, input: Partial<TableDto>): Promise<TableDto> {
  return req<TableDto>(`/api/tables/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteTable(id: string): Promise<void> {
  const res = await fetch(`/api/tables/${id}`, { method: "DELETE", cache: "no-store" });
  if (!res.ok) throw new Error("حذف میز ناموفق بود");
}
