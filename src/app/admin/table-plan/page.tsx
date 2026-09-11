"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, Cake, Check } from "lucide-react";
import type { ReservationDto, TableDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import TableCard from "@/components/admin/TableCard";
import ReservationDrawer from "@/components/admin/ReservationDrawer";
import TableOrderPanel from "@/components/admin/TableOrderPanel";
import {
  unassignTables,
  isAcceptedReservation,
  isUnassigned,
  reservationInterval,
  presenceOf,
  PRESENCE_CARD,
} from "@/lib/reservations";
import { fetchActiveOrders, summarizeTableOrders, type ActiveOrder } from "@/lib/orders";
import { toFaDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const TIME_OPTIONS = ["ALL", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30"];

function relevantAtTime(r: ReservationDto, time: string): boolean {
  if (time === "ALL") return true;
  const [h, m] = time.split(":").map(Number);
  const t = h * 60 + m;
  const [s, e] = reservationInterval(r);
  return s <= t && t < e;
}

async function loadPlanData(date: string): Promise<{ reservations: ReservationDto[]; tables: TableDto[]; activeOrders: ActiveOrder[] }> {
  const [resR, resT, ao] = await Promise.all([
    fetch(`/api/reservations?restaurantId=ALL&date=${date}`, { cache: "no-store" }).then((r) => r.json()),
    fetch(`/api/tables?restaurantId=ALL`, { cache: "no-store" }).then((r) => r.json()),
    fetchActiveOrders("ALL").catch(() => [] as ActiveOrder[]),
  ]);
  return {
    reservations: Array.isArray(resR) ? resR : [],
    tables: Array.isArray(resT) ? resT.filter((t: TableDto) => t.active) : [],
    activeOrders: Array.isArray(ao) ? ao : [],
  };
}

export default function TablePlanPage() {
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("ALL");
  const [reservations, setReservations] = useState<ReservationDto[]>([]);
  const [tables, setTables] = useState<TableDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTableId, setDropTableId] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [orderTableId, setOrderTableId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);

  const load = useCallback(() => {
    return loadPlanData(date)
      .then((d) => {
        setReservations(d.reservations);
        setTables(d.tables);
        setActiveOrders(d.activeOrders);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [date]);

  useEffect(() => {
    let cancelled = false;
    loadPlanData(date)
      .then((d) => {
        if (cancelled) return;
        setReservations(d.reservations);
        setTables(d.tables);
        setActiveOrders(d.activeOrders);
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
  }, [date]);

  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const visible = useMemo(
    () => reservations.filter((r) => isAcceptedReservation(r) && relevantAtTime(r, time)),
    [reservations, time],
  );
  const pendingCount = useMemo(() => reservations.filter((r) => r.status === "PENDING").length, [reservations]);
  const unassigned = useMemo(() => visible.filter(isUnassigned), [visible]);
  const selected = reservations.find((r) => r.id === (dragId ?? selectedId)) ?? null;
  const drawerReservation = reservations.find((r) => r.id === drawerId) ?? null;

  const assignedFor = useCallback(
    (tableId: string) =>
      visible.filter((r) => (r.assignedTables ?? []).some((a) => a.table?.id === tableId)),
    [visible],
  );

  async function doAssign(reservationId: string, tableId: string) {
    setError(null);
    try {
      const apiRes = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableIds: [tableId] }),
      });
      const data = await apiRes.json().catch(() => null);
      if (!apiRes.ok) throw new Error(data?.error ?? "تخصیص ناموفق بود");
      setSelectedId(null);
      setDragId(null);
      setDropTableId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تخصیص ناموفق بود");
    }
  }

  async function doUnassign(r: ReservationDto) {
    setError(null);
    try {
      await unassignTables(r.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "لغو تخصیص ناموفق بود");
    }
  }

  function handleTableClick(table: TableDto) {
    const activeId = dragId ?? selectedId;
    if (activeId) {
      doAssign(activeId, table.id);
      return;
    }
    setOrderTableId(table.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">نقشه میزها</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setLoading(true); setDate(shiftDate(date, -1)); }} aria-label="روز قبل">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Input type="date" value={date} onChange={(e) => { setLoading(true); setDate(e.target.value); }} className="w-auto" />
          <Button size="sm" variant="ghost" onClick={() => { setLoading(true); setDate(todayISO()); }}>
            امروز
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setLoading(true); setDate(shiftDate(date, 1)); }} aria-label="روز بعد">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Select value={time} onChange={(e) => setTime(e.target.value)} className="w-auto">
            <option value="ALL">همه ساعت‌ها</option>
            {TIME_OPTIONS.slice(1).map((t) => (
              <option key={t} value={t}>
                {toFaDigits(t)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
      )}
      {selected && (
        <div className="flex items-center justify-between text-sm rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <span>
            {selected.customer?.name} ({selected.code}) انتخاب شد. روی یک میز کلیک کنید.
          </span>
          <button
            className="text-xs text-zinc-400 hover:text-zinc-100"
            onClick={() => {
              setSelectedId(null);
              setDragId(null);
            }}
          >
            لغو انتخاب
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col lg:flex-row gap-4" aria-label="در حال بارگذاری">
          <div className="lg:w-64 shrink-0 rounded-xl border border-zinc-800 p-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-zinc-800 animate-pulse" />
            ))}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4">
          <aside className="lg:w-64 shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 h-fit lg:sticky lg:top-4">
            <div className="text-sm font-semibold mb-2 px-1">
              تخصیص‌نیافته‌ها ({toFaDigits(unassigned.length)})
            </div>
            {pendingCount > 0 && (
              <Link
                href="/admin"
                className="block text-[11px] text-yellow-300 hover:text-yellow-200 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-2.5 py-1.5 mb-2"
              >
                {toFaDigits(pendingCount)} رزرو در انتظار تأیید است. فقط تأییدشده‌ها اینجا می‌آیند.
              </Link>
            )}
            {unassigned.length === 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 px-1 py-3"><Check className="w-3.5 h-3.5 text-emerald-400" />همه رزروها میز دارند</div>
            ) : (
              <div className="space-y-2">
                {unassigned.map((r) => {
                  const isSel = (dragId ?? selectedId) === r.id;
                  return (
                    <div
                      key={r.id}
                      draggable
                      onDragStart={() => setDragId(r.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => {
                        setSelectedId(isSel ? null : r.id);
                        setDragId(null);
                      }}
                      className={cn(
                        "rounded-lg border p-2.5 text-sm cursor-pointer",
                        PRESENCE_CARD[presenceOf(r)],
                        isSel && "ring-1 ring-amber-400 border-amber-400",
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[11px] text-zinc-500" dir="ltr">
                          {r.code}
                        </span>
                        <button
                          className="text-[11px] text-sky-400 hover:text-sky-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerId(r.id);
                          }}
                        >
                          جزئیات
                        </button>
                      </div>
                      <div
                        className="font-medium mt-0.5 hover:text-amber-400 cursor-pointer w-fit"
                        title="مشاهده و ویرایش جزئیات"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerId(r.id);
                        }}
                      >
                        {r.customer?.name ?? "-"}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {toFaDigits(r.partySize)} نفر · {toFaDigits(r.time.slice(0, 5))}
                        {(r.customerNotes ?? r.notes) && <Cake className="w-3 h-3 text-amber-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </aside>

          <div className="flex-1">
            <div className="text-xs text-zinc-500 mb-2">سالن رستوران ({toFaDigits(tables.length)} میز)</div>
            {tables.length === 0 ? (
              <div className="text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-xl p-8 text-center">
                میزی ثبت نشده است. از بخش تنظیمات میز اضافه کنید.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {tables.map((t) => (
                  <TableCard
                    key={t.id}
                    table={t}
                    reservations={assignedFor(t.id)}
                    allReservations={reservations}
                    selectedId={dragId ?? selectedId}
                    dropTarget={dropTableId === t.id}
                    orderSummary={summarizeTableOrders(activeOrders, t.id)}
                    onTableClick={handleTableClick}
                    onReservationSelect={(r) => {
                      setSelectedId(r.id);
                      setDragId(null);
                    }}
                    onReservationDetails={(r) => setDrawerId(r.id)}
                    onUnassign={doUnassign}
                    onDragStartReservation={(r) => setDragId(r.id)}
                    onDropOnTable={(tbl) => {
                      if (dragId) doAssign(dragId, tbl.id);
                    }}
                    onDragOverTable={(tbl) => setDropTableId(tbl.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ReservationDrawer
        reservation={drawerReservation}
        tables={tables}
        allReservations={reservations}
        onClose={() => setDrawerId(null)}
        onChanged={load}
      />

      {(() => {
        const orderTable = tables.find((t) => t.id === orderTableId) ?? null;
        if (!orderTable) return null;
        return (
          <TableOrderPanel
            table={orderTable}
            reservation={assignedFor(orderTable.id)[0] ?? null}
            onClose={() => setOrderTableId(null)}
            onSubmitted={load}
          />
        );
      })()}
    </div>
  );
}
