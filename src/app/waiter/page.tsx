"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Minus, Plus, ShoppingBasket, X } from "lucide-react";
import type { TableDto } from "@/lib/api";
import { toFaDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  station: string;
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  status: string;
}

interface Order {
  id: string;
  tableId: string | null;
  note: string | null;
  createdAt: string;
  derivedStatus: string;
  items: OrderItem[];
}

const ITEM_STATUS_FA: Record<string, string> = {
  NEW: "جدید",
  PREPARING: "در حال آماده‌سازی",
  READY: "آماده",
  SERVED: "سرو شد",
  CANCELLED: "لغو شد",
};

const ORDER_STATUS_STYLE: Record<string, string> = {
  NEW: "bg-yellow-400/15 text-yellow-300",
  PREPARING: "bg-orange-500/15 text-orange-400",
  READY: "bg-sky-500/15 text-sky-400",
  SERVED: "bg-zinc-700/40 text-zinc-400",
  CANCELLED: "bg-zinc-700/40 text-zinc-500",
};

function faMoney(n: number): string {
  return Number(n || 0).toLocaleString("fa-IR");
}

export default function WaiterPage() {
  const [tables, setTables] = useState<TableDto[]>([]);
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<{ name: "tables" } | { name: "table"; tableId: string } | { name: "build"; tableId: string }>({ name: "tables" });
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [draftNote, setDraftNote] = useState("");
  const [review, setReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/tables?restaurantId=ALL", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/menu?restaurantId=ALL", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/restaurants", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/orders/active?restaurantId=ALL", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([t, m, rest, ao]) => {
        if (cancelled) return;
        setTables(Array.isArray(t) ? t.filter((x: TableDto) => x.active) : []);
        setMenu(Array.isArray(m) ? m : []);
        if (Array.isArray(rest) && rest[0]) setRestaurantId(rest[0].id);
        setActiveOrders(Array.isArray(ao) ? ao : []);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error(e);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function reloadTableOrders(tableId: string) {
    fetch(`/api/orders?tableId=${tableId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setTableOrders(Array.isArray(d) ? d : []))
      .catch(console.error);
    fetch("/api/orders/active?restaurantId=ALL", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setActiveOrders(Array.isArray(d) ? d : []))
      .catch(console.error);
  }

  function openTable(tableId: string) {
    setView({ name: "table", tableId });
    setTableOrders([]);
    reloadTableOrders(tableId);
  }

  function startOrder(tableId: string) {
    setDraft({});
    setDraftNote("");
    setError(null);
    setReview(false);
    const first = menu.find((c) => c.items.length > 0);
    setCategoryId(first?.id ?? null);
    setView({ name: "build", tableId });
  }

  const itemById = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (const c of menu) for (const i of c.items) map.set(i.id, i);
    return map;
  }, [menu]);

  const draftLines = useMemo(
    () =>
      Object.entries(draft)
        .filter(([, q]) => q > 0)
        .map(([id, qty]) => ({ item: itemById.get(id)!, qty }))
        .filter((l) => l.item),
    [draft, itemById],
  );

  const draftCount = draftLines.reduce((s, l) => s + l.qty, 0);
  const draftTotal = draftLines.reduce((s, l) => s + l.qty * (l.item.price || 0), 0);
  const activeCategory = menu.find((c) => c.id === categoryId) ?? menu.find((c) => c.items.length > 0);
  const currentTable = tables.find((t) => t.id === (view.name === "tables" ? null : view.tableId));

  function setQty(id: string, qty: number) {
    setDraft((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(qty, 99);
      return next;
    });
  }

  async function submit() {
    if (view.name !== "build" || !restaurantId || draftLines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableId: view.tableId,
          note: draftNote || undefined,
          items: draftLines.map((l) => ({ menuItemId: l.item.id, quantity: l.qty })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "ثبت سفارش ناموفق بود");
      setDraft({});
      setDraftNote("");
      setReview(false);
      openTable(view.tableId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ثبت سفارش ناموفق بود");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4" dir="rtl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-zinc-900 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-28" dir="rtl">
      <header className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 h-16 flex items-center gap-3">
        {view.name !== "tables" && (
          <button
            onClick={() => (view.name === "build" ? openTable(view.tableId) : setView({ name: "tables" }))}
            className="p-2.5 rounded-xl hover:bg-zinc-800"
            aria-label="بازگشت"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        )}
        <div className="font-bold text-lg">
          {view.name === "tables" && "سفارش‌گیری"}
          {view.name !== "tables" && currentTable?.name}
          {view.name === "build" && <span className="text-sm font-normal text-zinc-400"> · سفارش جدید</span>}
        </div>
      </header>

      {view.name === "tables" && (
        <main className="p-4 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
          {tables.map((t) => {
            const live = activeOrders.filter((o) => o.tableId === t.id);
            return (
              <button
                key={t.id}
                onClick={() => openTable(t.id)}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 min-h-24 text-right active:scale-[0.98] transition-transform hover:border-zinc-600"
              >
                <div className="font-bold text-xl">{t.name}</div>
                {live.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {live.slice(0, 2).map((o) => (
                      <span
                        key={o.id}
                        className={cn("text-[11px] px-2 py-0.5 rounded-full", ORDER_STATUS_STYLE[o.derivedStatus] ?? "bg-zinc-800 text-zinc-300")}
                      >
                        {o.items.reduce((s, i) => s + i.quantity, 0)} قلم ·{" "}
                        {o.derivedStatus === "NEW" ? "جدید" : o.derivedStatus === "PREPARING" ? "در حال تهیه" : o.derivedStatus === "READY" ? "آماده" : o.derivedStatus}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1.5 text-xs text-zinc-500">خالی</div>
                )}
              </button>
            );
          })}
        </main>
      )}

      {view.name === "table" && (
        <main className="p-4 space-y-3 max-w-2xl mx-auto">
          {tableOrders.length === 0 ? (
            <div className="text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-2xl p-8 text-center">
              سفارشی برای این میز ثبت نشده است.
            </div>
          ) : (
            tableOrders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", ORDER_STATUS_STYLE[o.derivedStatus] ?? "bg-zinc-800 text-zinc-300")}>
                    {ITEM_STATUS_FA[o.derivedStatus] ?? o.derivedStatus}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {new Date(o.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran", timeStyle: "short" })}
                  </span>
                </div>
                <div className="space-y-1">
                  {o.items.map((i) => (
                    <div key={i.id} className="flex items-center justify-between text-base">
                      <span>
                        {i.name} <span className="text-zinc-400">×{toFaDigits(i.quantity)}</span>
                      </span>
                      <span className="text-xs text-zinc-500">{ITEM_STATUS_FA[i.status] ?? i.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <button
            onClick={() => startOrder(view.tableId)}
            className="w-full h-14 rounded-2xl bg-amber-500 text-zinc-950 font-bold text-lg active:scale-[0.98] transition-transform"
          >
            + سفارش جدید
          </button>
        </main>
      )}

      {view.name === "build" && (
        <main className="p-4 space-y-4 max-w-3xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-1 sticky top-16 bg-zinc-950/95 backdrop-blur py-2 z-10">
            {menu.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "shrink-0 h-12 px-5 rounded-2xl font-semibold text-base border active:scale-[0.98] transition-transform",
                  activeCategory?.id === c.id
                    ? "bg-amber-500 text-zinc-950 border-amber-500"
                    : "bg-zinc-900 border-zinc-800 text-zinc-200",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(activeCategory?.items ?? []).map((item) => {
              const qty = draft[item.id] ?? 0;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl border p-3 flex flex-col gap-2 min-h-32",
                    qty > 0 ? "border-amber-500/60 bg-amber-500/5" : "border-zinc-800 bg-zinc-900/60",
                  )}
                >
                  <div className="font-semibold text-base leading-snug">{item.name}</div>
                  <div className="text-xs text-zinc-500">{faMoney(item.price)} تومان</div>
                  <div className="mt-auto flex items-center justify-between">
                    <button
                      onClick={() => setQty(item.id, qty + 1)}
                      className="w-11 h-11 rounded-xl bg-zinc-800 text-xl font-bold active:scale-95 transition-transform"
                      aria-label="افزودن"
                    >
                      <Plus className="w-5 h-5 mx-auto" />
                    </button>
                    <span className="font-bold text-lg w-8 text-center">{toFaDigits(qty)}</span>
                    <button
                      onClick={() => setQty(item.id, qty - 1)}
                      className="w-11 h-11 rounded-xl bg-zinc-800 text-xl font-bold active:scale-95 transition-transform disabled:opacity-30"
                      disabled={qty === 0}
                      aria-label="کم کردن"
                    >
                      <Minus className="w-5 h-5 mx-auto" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {(activeCategory?.items.length ?? 0) === 0 && (
            <div className="text-sm text-zinc-500 text-center py-8">منویی ثبت نشده است. از تنظیمات منو اضافه کنید.</div>
          )}
        </main>
      )}

      {view.name === "build" && draftCount > 0 && !review && (
        <div className="fixed bottom-0 inset-x-0 z-20 p-4 bg-zinc-950/95 backdrop-blur border-t border-zinc-800">
          <button
            onClick={() => {
              setError(null);
              setReview(true);
            }}
            className="w-full max-w-3xl mx-auto h-14 rounded-2xl bg-amber-500 text-zinc-950 font-bold text-lg flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
          >
            <ShoppingBasket className="w-5 h-5" />
            مشاهده سفارش · {toFaDigits(draftCount)} قلم · {faMoney(draftTotal)} تومان
          </button>
        </div>
      )}

      {review && view.name === "build" && (
        <div className="fixed inset-0 z-30 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-zinc-950/70" onClick={() => !submitting && setReview(false)} />
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-t-3xl md:rounded-3xl p-5 space-y-3 max-h-[85dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">بررسی سفارش · {currentTable?.name}</h2>
              <button onClick={() => !submitting && setReview(false)} className="p-2 rounded-lg hover:bg-zinc-800" aria-label="بستن">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</div>}
            <div className="space-y-2">
              {draftLines.map((l) => (
                <div key={l.item.id} className="flex items-center justify-between gap-2 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2">
                  <div>
                    <div className="font-medium">{l.item.name}</div>
                    <div className="text-xs text-zinc-500">{faMoney(l.item.price)} تومان</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(l.item.id, l.qty + 1)} className="w-9 h-9 rounded-lg bg-zinc-800 active:scale-95" aria-label="افزودن">
                      <Plus className="w-4 h-4 mx-auto" />
                    </button>
                    <span className="font-bold w-6 text-center">{toFaDigits(l.qty)}</span>
                    <button onClick={() => setQty(l.item.id, l.qty - 1)} className="w-9 h-9 rounded-lg bg-zinc-800 active:scale-95" aria-label="کم کردن">
                      <Minus className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <input
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="توضیح سفارش (اختیاری)"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm placeholder:text-zinc-500 focus:border-amber-400 focus:outline-none"
            />
            <div className="flex items-center justify-between text-sm text-zinc-400">
              <span>مجموع اقلام: {toFaDigits(draftCount)}</span>
              <span>مبلغ: {faMoney(draftTotal)} تومان</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={submitting || draftLines.length === 0}
                className="flex-1 h-13 py-3.5 rounded-2xl bg-amber-500 text-zinc-950 font-bold text-lg disabled:opacity-50 active:scale-[0.99]"
              >
                {submitting ? "…" : "ثبت سفارش"}
              </button>
              <button
                onClick={() => !submitting && setReview(false)}
                className="h-13 px-5 py-3.5 rounded-2xl bg-zinc-800 font-semibold"
              >
                لغو
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
