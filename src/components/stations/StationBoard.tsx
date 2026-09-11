"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, ChefHat, Flame, RefreshCw } from "lucide-react";
import {
  fetchStationBoard,
  setOrderItemStatus,
  ITEM_STATUS_FA,
  type Station,
  type StationBoardItem,
  type OrderItemStatus,
} from "@/lib/orders";
import { toFaDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";

interface Props {
  station: Station;
}

// Live updates: 5s polling. Simplest reliable mechanism on this stack
// (no websocket infra); kitchen work moves slower than the poll interval.
const POLL_MS = 5000;

export default function StationBoard({ station }: Props) {
  const isKebab = station === "KEBAB";
  const [items, setItems] = useState<StationBoardItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (quiet = true) => {
      if (!restaurantId) return Promise.resolve();
      if (!quiet) setLoading(true);
      return fetchStationBoard(restaurantId, station)
        .then((d) => {
          setItems(d);
          setLoading(false);
        })
        .catch((e) => {
          console.error(e);
          setLoading(false);
        });
    },
    [restaurantId, station],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/restaurants", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d) && d[0]) setRestaurantId(d[0].id);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    fetchStationBoard(restaurantId, station)
      .then((d) => {
        if (cancelled) return;
        setItems(d);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error(e);
        setLoading(false);
      });
    const t = setInterval(() => load(true), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [restaurantId, station, load]);

  async function advance(id: string, status: OrderItemStatus) {
    setBusy(id);
    setError(null);
    try {
      await setOrderItemStatus(id, status);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "عملیات ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  const fresh = items.filter((i) => i.status === "NEW");
  const preparing = items.filter((i) => i.status === "PREPARING");
  const ready = items.filter((i) => i.status === "READY");

  function itemCard(item: StationBoardItem, action?: { label: string; status: OrderItemStatus }) {
    const running = busy === item.id;
    return (
      <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-lg">{item.tableName ?? "بدون میز"}</span>
          <span className="font-mono text-[11px] text-zinc-500" dir="ltr">
            #{item.orderId.slice(0, 8)}
          </span>
        </div>
        <div className="mt-1 text-xl">
          {item.name} <span className="text-zinc-400">×{toFaDigits(item.quantity)}</span>
        </div>
        {(item.note || item.orderNote) && (
          <div className="mt-1 text-sm text-amber-400/90">
            {[item.note, item.orderNote].filter(Boolean).join(" · ")}
          </div>
        )}
        <div className="mt-1 text-[11px] text-zinc-500">
          {new Date(item.orderedAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran", timeStyle: "short" })}
        </div>
        {action && (
          <button
            disabled={busy !== null}
            onClick={() => advance(item.id, action.status)}
            className={cn(
              "mt-3 w-full h-12 rounded-xl font-bold text-base active:scale-[0.99] transition-transform disabled:opacity-50",
              action.status === "PREPARING" ? "bg-amber-500 text-zinc-950" : "bg-sky-500 text-zinc-950",
            )}
          >
            {running ? "…" : action.label}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" dir="rtl">
      <header className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg">
          {isKebab ? <Flame className="w-5 h-5 text-orange-400" /> : <ChefHat className="w-5 h-5 text-sky-400" />}
          {isKebab ? "کبابی" : "آشپزخانه"}
        </div>
        <button onClick={() => load(false)} className="p-2.5 rounded-xl hover:bg-zinc-800" aria-label="بروزرسانی">
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      <main className="p-4 space-y-5 max-w-3xl mx-auto">
        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</div>
        )}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-zinc-900 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl p-10">
            <Check className="w-5 h-5 text-emerald-400" /> کاری نیست. همه سفارش‌ها آماده‌اند.
          </div>
        ) : (
          <>
            <section>
              <h2 className="font-bold mb-2">
                جدید <span className="text-sm font-normal text-zinc-500">({toFaDigits(fresh.length)})</span>
              </h2>
              {fresh.length === 0 ? (
                <div className="text-sm text-zinc-600">مورد جدیدی نیست.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fresh.map((i) => itemCard(i, { label: "شروع آماده‌سازی", status: "PREPARING" }))}
                </div>
              )}
            </section>
            <section>
              <h2 className="font-bold mb-2">
                در حال آماده‌سازی <span className="text-sm font-normal text-zinc-500">({toFaDigits(preparing.length)})</span>
              </h2>
              {preparing.length === 0 ? (
                <div className="text-sm text-zinc-600">موردی در حال تهیه نیست.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {preparing.map((i) => itemCard(i, { label: "آماده شد", status: "READY" }))}
                </div>
              )}
            </section>
            <section>
              <h2 className="font-bold mb-2">
                آماده <span className="text-sm font-normal text-zinc-500">({toFaDigits(ready.length)})</span>
              </h2>
              {ready.length === 0 ? (
                <div className="text-sm text-zinc-600">مورد آماده‌ای نیست.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ready.map((i) => itemCard(i, { label: "سرو شد", status: "SERVED" }))}
                </div>
              )}
            </section>
          </>
        )}
        <p className="text-[11px] text-zinc-600 text-center">
          وضعیت‌ها: {ITEM_STATUS_FA.NEW} ← {ITEM_STATUS_FA.PREPARING} ← {ITEM_STATUS_FA.READY} ← {ITEM_STATUS_FA.SERVED}. صفحه هر ۵ ثانیه خودکار به‌روز می‌شود.
        </p>
      </main>
    </div>
  );
}
