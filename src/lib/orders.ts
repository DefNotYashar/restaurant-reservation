export type Station = "KITCHEN" | "KEBAB";
export type OrderItemStatus = "NEW" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

export interface StationBoardItem {
  id: string;
  orderId: string;
  tableId: string | null;
  tableName: string | null;
  name: string;
  quantity: number;
  note: string | null;
  status: OrderItemStatus;
  orderNote: string | null;
  orderedAt: string;
}

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

export async function fetchStationBoard(restaurantId: string, station: Station): Promise<StationBoardItem[]> {
  return req<StationBoardItem[]>(`/api/stations/${station}?restaurantId=${restaurantId}&include=ready`);
}

export interface ActiveOrder {
  id: string;
  tableId: string | null;
  derivedStatus: string;
  items: { id: string; status: OrderItemStatus; quantity: number }[];
}

export async function fetchActiveOrders(restaurantId: string): Promise<ActiveOrder[]> {
  return req<ActiveOrder[]>(`/api/orders/active?restaurantId=${restaurantId}`);
}

export interface TableOrderSummary {
  fresh: number;
  preparing: number;
  ready: number;
}

export function summarizeTableOrders(orders: ActiveOrder[], tableId: string): TableOrderSummary | null {
  let fresh = 0;
  let preparing = 0;
  let ready = 0;
  let any = false;
  for (const o of orders) {
    if (o.tableId !== tableId) continue;
    for (const i of o.items) {
      if (i.status === "NEW") {
        fresh += i.quantity;
        any = true;
      } else if (i.status === "PREPARING") {
        preparing += i.quantity;
        any = true;
      } else if (i.status === "READY") {
        ready += i.quantity;
        any = true;
      }
    }
  }
  return any ? { fresh, preparing, ready } : null;
}

export async function setOrderItemStatus(id: string, status: OrderItemStatus) {
  return req(`/api/order-items/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export const ITEM_STATUS_FA: Record<OrderItemStatus, string> = {
  NEW: "جدید",
  PREPARING: "در حال آماده‌سازی",
  READY: "آماده",
  SERVED: "سرو شد",
  CANCELLED: "لغو شد",
};
