"use client";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBasket, X } from "lucide-react";
import type { ReservationDto, TableDto } from "@/lib/api";
import { toFaDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";
import { fetchMenu, type MenuCategoryDto } from "@/lib/menu";
import { ITEM_STATUS_FA } from "@/lib/orders";

interface TableOrder {
  id: string;
  note: string | null;
  createdAt: string;
  derivedStatus: string;
  items: { id: string; name: string; quantity: number; status: string; note: string | null }[];
}

interface Props {
  table: TableDto;
  reservation: ReservationDto | null;
  onClose: () => void;
  onSubmitted: () => void;
}

function faMoney(n: number): string {
  return Number(n || 0).toLocaleString("fa-IR");
}

export default function TableOrderPanel({ table, reservation, onClose, onSubmitted }: Props) {
  const [menu, setMenu] = useState<MenuCategoryDto[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [orderNote, setOrderNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchMenu("ALL").catch(() => [] as MenuCategoryDto[]),
      fetch("/api/restaurants", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([m, rest]) => {
        if (cancelled) return;
        setMenu(m);
        if (Array.isArray(rest) && rest[0]) setRestaurantId(rest[0].id);
        const first = m.find((c) => c.items.length > 0);
        setCategoryId(first?.id ?? null);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadOrders = () => {
      fetch(`/api/orders?tableId=${table.id}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setOrders(Array.isArray(d) ? d : []);
        })
        .catch(console.error);
    };
    loadOrders();
    const t = setInterval(loadOrders, 5000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [table.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const itemById = useMemo(() => {
    const map = new Map(menu.flatMap((c) => c.items).map((i) => [i.id, i]));
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

  function setQty(id: string, qty: number) {
    if (qty <= 0) {
      setDraft((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setDraftNotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setDraft((prev) => ({ ...prev, [id]: Math.min(qty, 99) }));
    }
  }

  async function submit() {
    if (!restaurantId || draftLines.length === 0) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableId: table.id,
          customerId: reservation?.customerId,
          note: orderNote || undefined,
          items: draftLines.map((l) => ({
            menuItemId: l.item.id,
            quantity: l.qty,
            note: draftNotes[l.item.id]?.trim() || undefined,
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "ثبت سفارش ناموفق بود");
      setDraft({});
      setDraftNotes({});
      setOrderNote("");
      setSuccess(true);
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ثبت سفارش ناموفق بود");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-zinc-950/70" onClick={onClose} />
      <aside className="absolute left-0 top-0 h-full w-full max-w-md bg-zinc-900 border-r border-zinc-800 shadow-2xl overflow-y-auto pb-24">
        <div className="flex items-center justify-between px-5 h-16 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <div>
            <div className="font-bold">{table.name}</div>
            {reservation && (
              <div className="text-xs text-zinc-400">
                {reservation.customer?.name} · {toFaDigits(reservation.partySize)} نفر · {toFaDigits(reservation.time.slice(0, 5))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400" aria-label="بستن">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
          {success && <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">سفارش ثبت شد.</div>}

          <div>
            <div className="text-xs text-zinc-500 mb-1.5">سفارش‌های فعلی</div>
            {orders.length === 0 ? (
              <div className="text-sm text-zinc-600">سفارشی ثبت نشده است.</div>
            ) : (
              <div className="space-y-2">
                {orders.map((o) => (
                  <div key={o.id} className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2">
                    {o.items.map((i) => (
                      <div key={i.id} className="py-1 border-b border-zinc-800/50 last:border-0">
                        <div className="flex items-center justify-between text-sm">
                          <span>
                            {i.name} <span className="text-zinc-400">×{toFaDigits(i.quantity)}</span>
                          </span>
                          <span className="text-[11px] text-zinc-500">{ITEM_STATUS_FA[i.status as keyof typeof ITEM_STATUS_FA] ?? i.status}</span>
                        </div>
                        {i.note && <div className="text-[11px] text-amber-400/90">{i.note}</div>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-zinc-500 mb-1.5">افزودن سفارش</div>
            <div className="flex gap-1.5 overflow-x-auto pb-2">
              {menu.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "shrink-0 h-9 px-4 rounded-xl text-sm font-semibold border active:scale-[0.98]",
                    activeCategory?.id === c.id ? "bg-amber-500 text-zinc-950 border-amber-500" : "bg-zinc-950 border-zinc-800 text-zinc-200",
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(activeCategory?.items ?? []).map((item) => {
                const qty = draft[item.id] ?? 0;
                const off = !item.available;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border p-2.5 flex flex-col gap-1.5",
                      off ? "border-zinc-800/60 bg-zinc-950/40 opacity-50" : qty > 0 ? "border-amber-500/60 bg-amber-500/5" : "border-zinc-800 bg-zinc-950",
                    )}
                  >
                    <div className="font-medium text-sm leading-snug">{item.name}</div>
                    <div className="text-[11px] text-zinc-500">{faMoney(item.price)} تومان</div>
                    {off ? (
                      <div className="text-[11px] text-zinc-500">فعلاً موجود نیست</div>
                    ) : (
                      <div className="mt-auto flex items-center justify-between">
                        <button
                          onClick={() => setQty(item.id, qty + 1)}
                          className="w-9 h-9 rounded-lg bg-zinc-800 active:scale-95"
                          aria-label="افزودن"
                        >
                          <Plus className="w-4 h-4 mx-auto" />
                        </button>
                        <span className="font-bold w-6 text-center">{toFaDigits(qty)}</span>
                        <button
                          onClick={() => setQty(item.id, qty - 1)}
                          disabled={qty === 0}
                          className="w-9 h-9 rounded-lg bg-zinc-800 active:scale-95 disabled:opacity-30"
                          aria-label="کم کردن"
                        >
                          <Minus className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {draftLines.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-1.5">سفارش جدید — {table.name}</div>
              <div className="space-y-2">
                {draftLines.map((l) => (
                  <div key={l.item.id} className="rounded-lg bg-zinc-950 border border-amber-500/30 px-3 py-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {l.item.name} <span className="text-zinc-400">×{toFaDigits(l.qty)}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setQty(l.item.id, l.qty + 1)} className="w-8 h-8 rounded-lg bg-zinc-800 active:scale-95" aria-label="افزودن">
                          <Plus className="w-3.5 h-3.5 mx-auto" />
                        </button>
                        <button onClick={() => setQty(l.item.id, l.qty - 1)} className="w-8 h-8 rounded-lg bg-zinc-800 active:scale-95" aria-label="کم کردن">
                          <Minus className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </div>
                    </div>
                    <input
                      value={draftNotes[l.item.id] ?? ""}
                      onChange={(e) => setDraftNotes((prev) => ({ ...prev, [l.item.id]: e.target.value }))}
                      placeholder="یادداشت این آیتم (اختیاری)"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <input
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="توضیح سفارش (اختیاری)"
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs placeholder:text-zinc-600 focus:border-amber-400 focus:outline-none"
              />
              <div className="mt-1.5 text-xs text-zinc-400">
                {toFaDigits(draftCount)} قلم · {faMoney(draftTotal)} تومان
              </div>
            </div>
          )}
        </div>

        {draftLines.length > 0 && (
          <div className="fixed bottom-0 left-0 w-full max-w-md p-4 bg-zinc-900/95 backdrop-blur border-t border-zinc-800">
            <button
              onClick={submit}
              disabled={submitting}
              className="w-full h-13 py-3.5 rounded-2xl bg-amber-500 text-zinc-950 font-bold text-lg disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <ShoppingBasket className="w-5 h-5" />
              {submitting ? "…" : "ثبت سفارش"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
