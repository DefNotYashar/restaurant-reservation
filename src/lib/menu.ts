export interface MenuItemDto {
  id: string;
  restaurantId: string;
  categoryId: string | null;
  name: string;
  price: number;
  station: "KITCHEN" | "KEBAB";
  sortOrder: number;
  active: boolean;
}

export interface MenuCategoryDto {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  active: boolean;
  items: MenuItemDto[];
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

export async function fetchMenu(restaurantId: string): Promise<MenuCategoryDto[]> {
  return req<MenuCategoryDto[]>(`/api/menu?restaurantId=${restaurantId}`);
}

export async function createCategory(restaurantId: string, name: string): Promise<MenuCategoryDto> {
  return req<MenuCategoryDto>("/api/menu/items", {
    method: "POST",
    body: JSON.stringify({ kind: "category", restaurantId, name }),
  });
}

export async function createMenuItem(input: {
  restaurantId: string;
  categoryId?: string | null;
  name: string;
  price?: number;
  station?: "KITCHEN" | "KEBAB";
}): Promise<MenuItemDto> {
  return req<MenuItemDto>("/api/menu/items", { method: "POST", body: JSON.stringify(input) });
}

export async function updateMenuItem(
  id: string,
  input: Partial<Pick<MenuItemDto, "name" | "price" | "station" | "active" | "categoryId">>,
): Promise<MenuItemDto> {
  return req<MenuItemDto>(`/api/menu/items/${id}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function setItemAvailable(id: string, available: boolean): Promise<MenuItemDto> {
  return updateMenuItem(id, { active: available });
}
