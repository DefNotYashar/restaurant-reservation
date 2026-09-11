"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Power } from "lucide-react";
import type { TableDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAllTables, createTable, updateTable, deleteTable } from "@/lib/tables";
import {
  fetchMenu,
  createCategory,
  createMenuItem,
  updateMenuItem,
  type MenuCategoryDto,
} from "@/lib/menu";
import { toFaDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";

export default function AdminSettingsPage() {
  const [tables, setTables] = useState<TableDto[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState(4);
  const [menu, setMenu] = useState<MenuCategoryDto[]>([]);
  const [newCat, setNewCat] = useState("");
  const [newItem, setNewItem] = useState({ name: "", price: 0, station: "KITCHEN" as "KITCHEN" | "KEBAB", categoryId: "" });

  const load = useCallback(() => {
    return Promise.all([
      fetchAllTables("ALL"),
      fetch("/api/restaurants", { cache: "no-store" }).then((r) => r.json()),
      fetchMenu("ALL").catch(() => [] as MenuCategoryDto[]),
    ])
      .then(([list, rest, menuList]) => {
        setTables(list.sort((a, b) => a.name.localeCompare(b.name, "fa")));
        if (Array.isArray(rest) && rest[0]) {
          setRestaurantId(rest[0].id);
          setRestaurantName(rest[0].name ?? "");
        }
        setMenu(menuList);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "خطا در بارگذاری");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchAllTables("ALL"),
      fetch("/api/restaurants", { cache: "no-store" }).then((r) => r.json()),
      fetchMenu("ALL").catch(() => [] as MenuCategoryDto[]),
    ])
      .then(([list, rest, menuList]: [TableDto[], { id: string; name?: string }[], MenuCategoryDto[]]) => {
        if (cancelled) return;
        setTables(list.sort((a, b) => a.name.localeCompare(b.name, "fa")));
        if (Array.isArray(rest) && rest[0]) {
          setRestaurantId(rest[0].id);
          setRestaurantName(rest[0].name ?? "");
        }
        setMenu(menuList);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "خطا در بارگذاری");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "عملیات ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات</h1>
        {restaurantName && <p className="text-sm text-zinc-400 mt-0.5">{restaurantName}</p>}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="font-semibold mb-1">میزها</h2>
        <p className="text-xs text-zinc-500 mb-3">
          چیدمان نقشه میزها از همین فهرست ساخته می‌شود. میز غیرفعال در نقشه نمایش داده نمی‌شود.
        </p>

        {loading ? (
          <div className="text-sm text-zinc-500 py-4 text-center">در حال بارگذاری…</div>
        ) : (
          <div className="space-y-2">
            {tables.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${t.active ? "border-zinc-800 bg-zinc-950" : "border-zinc-800/60 bg-zinc-950/50 opacity-60"}`}
              >
                <Input
                  defaultValue={t.name}
                  key={`${t.id}-${t.name}`}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== t.name)
                      run(`name-${t.id}`, () => updateTable(t.id, { name: e.target.value.trim() }));
                  }}
                  className="w-28"
                  aria-label="نام میز"
                />
                <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                  ظرفیت
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    defaultValue={t.capacity}
                    key={`${t.id}-${t.capacity}`}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0 && v !== t.capacity) run(`cap-${t.id}`, () => updateTable(t.id, { capacity: v }));
                    }}
                    className="w-16"
                    aria-label="ظرفیت"
                  />
                </label>
                <span className="text-xs text-zinc-500 mr-auto">{toFaDigits(t.capacity)} نفر</span>
                <Button
                  size="sm"
                  variant="ghost"
                  title={t.active ? "غیرفعال کردن" : "فعال کردن"}
                  disabled={busy !== null}
                  onClick={() => run(`toggle-${t.id}`, () => updateTable(t.id, { active: !t.active }))}
                >
                  <Power className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="حذف میز"
                  disabled={busy !== null}
                  onClick={() => {
                    if (window.confirm(`میز «${t.name}» حذف شود؟`)) run(`del-${t.id}`, () => deleteTable(t.id));
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <Input placeholder="نام میز جدید (مثل میز ۷)" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-48" />
          <Input
            type="number"
            min={1}
            max={30}
            value={newCapacity}
            onChange={(e) => setNewCapacity(Number(e.target.value))}
            className="w-20"
            aria-label="ظرفیت"
          />
          <Button
            size="sm"
            disabled={!newName.trim() || !restaurantId || busy !== null}
            onClick={() => {
              run("create", () =>
                createTable({ restaurantId: restaurantId!, name: newName.trim(), capacity: newCapacity }),
              ).then(() => {
                setNewName("");
                setNewCapacity(4);
              });
            }}
          >
            <Plus className="w-4 h-4" /> افزودن میز
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="font-semibold mb-1">منوی رستوران</h2>
        <p className="text-xs text-zinc-500 mb-3">
          آیتم ناموجود را با دکمه موجود/ناموجود مشخص کنید. آیتم ناموجود در سفارش‌گیری کم‌رنگ و غیرقابل انتخاب می‌شود، ولی از منو حذف نمی‌شود.
        </p>

        {loading ? (
          <div className="text-sm text-zinc-500 py-4 text-center">در حال بارگذاری…</div>
        ) : (
          <div className="space-y-4">
            {menu.map((cat) => (
              <div key={cat.id} className="rounded-lg border border-zinc-800 p-3">
                <div className="font-semibold text-sm mb-2">{cat.name}</div>
                <div className="space-y-1.5">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-1.5",
                        item.available ? "border-zinc-800 bg-zinc-950" : "border-zinc-800/60 bg-zinc-950/50 opacity-60",
                      )}
                    >
                      <button
                        onClick={() => run(`avail-${item.id}`, () => updateMenuItem(item.id, { available: !item.available }))}
                        disabled={busy !== null}
                        title={item.available ? "ناموجود شود" : "موجود شود"}
                        className={cn(
                          "shrink-0 text-[11px] px-2.5 py-1 rounded-full font-semibold",
                          item.available ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400",
                        )}
                      >
                        {item.available ? "موجود" : "ناموجود"}
                      </button>
                      <Input
                        defaultValue={item.name}
                        key={`${item.id}-${item.name}`}
                        onBlur={(e) => {
                          if (e.target.value.trim() && e.target.value !== item.name)
                            run(`iname-${item.id}`, () => updateMenuItem(item.id, { name: e.target.value.trim() }));
                        }}
                        className="flex-1 min-w-24 h-8 text-sm"
                        aria-label="نام آیتم"
                      />
                      <Input
                        type="number"
                        min={0}
                        defaultValue={item.price}
                        key={`${item.id}-${item.price}`}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v >= 0 && v !== item.price) run(`iprice-${item.id}`, () => updateMenuItem(item.id, { price: v }));
                        }}
                        className="w-24 h-8 text-sm"
                        aria-label="قیمت"
                        dir="ltr"
                      />
                      <select
                        value={item.station}
                        onChange={(e) => run(`istation-${item.id}`, () => updateMenuItem(item.id, { station: e.target.value as "KITCHEN" | "KEBAB" }))}
                        disabled={busy !== null}
                        className="h-8 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs"
                        aria-label="ایستگاه"
                      >
                        <option value="KITCHEN">آشپزخانه</option>
                        <option value="KEBAB">کبابی</option>
                      </select>
                    </div>
                  ))}
                  {cat.items.length === 0 && <div className="text-xs text-zinc-600">آیتمی ثبت نشده.</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
          <div className="flex gap-2">
            <Input placeholder="دسته جدید (مثل دسر)" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <Button
              size="sm"
              disabled={!newCat.trim() || !restaurantId || busy !== null}
              onClick={() => {
                run("create-cat", () => createCategory(restaurantId!, newCat.trim())).then(() => setNewCat(""));
              }}
            >
              <Plus className="w-4 h-4" /> دسته
            </Button>
          </div>
          <div className="flex gap-2">
            <Input placeholder="آیتم جدید" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
            <select
              value={newItem.categoryId}
              onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs max-w-28"
              aria-label="دسته"
            >
              <option value="">دسته…</option>
              {menu.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={newItem.station}
              onChange={(e) => setNewItem({ ...newItem, station: e.target.value as "KITCHEN" | "KEBAB" })}
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-xs"
              aria-label="ایستگاه"
            >
              <option value="KITCHEN">آشپزخانه</option>
              <option value="KEBAB">کبابی</option>
            </select>
            <Button
              size="sm"
              disabled={!newItem.name.trim() || !restaurantId || busy !== null}
              onClick={() => {
                run("create-item", () =>
                  createMenuItem({
                    restaurantId: restaurantId!,
                    categoryId: newItem.categoryId || null,
                    name: newItem.name.trim(),
                    price: newItem.price,
                    station: newItem.station,
                  }),
                ).then(() => setNewItem({ name: "", price: 0, station: "KITCHEN", categoryId: "" }));
              }}
            >
              <Plus className="w-4 h-4" /> آیتم
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
