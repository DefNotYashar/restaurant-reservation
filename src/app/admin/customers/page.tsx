"use client";
import { useEffect, useMemo, useState, Fragment } from "react";
import { Search, Phone, ChevronRight, ChevronLeft, Cake } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { Badge, statusVariant, statusLabel } from "@/components/ui/badge";
import type { ReservationDto, TableDto } from "@/lib/api";
import { assignedTableNames, displayNotes, TERMINAL_STATUSES } from "@/lib/reservations";
import { toFaDigits, formatJalaliShort } from "@/lib/persian";
import ReservationDrawer from "@/components/admin/ReservationDrawer";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface CustomerGroup {
  id: string;
  name: string;
  phone: string;
  channel?: string | null;
  visits: ReservationDto[];
  doneCount: number;
  cancelledCount: number;
  noShowCount: number;
}

async function loadActivity(date: string | null): Promise<{ reservations: ReservationDto[]; tables: TableDto[] }> {
  const url =
    date === null
      ? "/api/reservations?restaurantId=ALL"
      : `/api/reservations?restaurantId=ALL&date=${date}`;
  const [resR, resT] = await Promise.all([
    fetch(url, { cache: "no-store" }).then((r) => r.json()),
    fetch("/api/tables?restaurantId=ALL", { cache: "no-store" }).then((r) => r.json()),
  ]);
  return {
    reservations: Array.isArray(resR) ? resR : [],
    tables: Array.isArray(resT) ? resT : [],
  };
}

export default function AdminCustomersPage() {
  const [reservations, setReservations] = useState<ReservationDto[]>([]);
  const [tables, setTables] = useState<TableDto[]>([]);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(todayISO());
  const [range, setRange] = useState<"day" | "month" | "all">("day");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleGroup(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    loadActivity(range === "day" ? date : null)
      .then((d) => {
        if (cancelled) return;
        const month = date.slice(0, 7);
        setReservations(range === "month" ? d.reservations.filter((r) => r.date.startsWith(month)) : d.reservations);
        setTables(d.tables);
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
  }, [date, range]);

  const groups = useMemo<CustomerGroup[]>(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, CustomerGroup>();
    const finished = reservations.filter((r) => TERMINAL_STATUSES.includes(r.status));
    const sorted = [...finished].sort((a, b) =>
      a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
    );
    for (const r of sorted) {
      const c = r.customer;
      if (!c) continue;
      if (q && !`${c.name} ${c.phone} ${r.code}`.toLowerCase().includes(q)) continue;
      const g = map.get(c.id) ?? { id: c.id, name: c.name, phone: c.phone, channel: null, visits: [], doneCount: 0, cancelledCount: 0, noShowCount: 0 };
      g.visits.push(r);
      if (r.status === "COMPLETED") g.doneCount += 1;
      else if (r.status === "CANCELLED") g.cancelledCount += 1;
      else if (r.status === "NO_SHOW") g.noShowCount += 1;
      map.set(c.id, g);
    }
    return [...map.values()].sort((a, b) => {
      const t1 = `${a.visits[0].date} ${a.visits[0].time}`;
      const t2 = `${b.visits[0].date} ${b.visits[0].time}`;
      return t1.localeCompare(t2);
    });
  }, [reservations, query]);

  const visitCount = groups.reduce((s, g) => s + g.visits.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">مشتریان</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {toFaDigits(groups.length)} مشتری · {toFaDigits(visitCount)} مراجعه پایان‌یافته
            {range === "day" ? ` · ${formatJalaliShort(date)}` : range === "month" ? " · این ماه" : " · همه روزها"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {range === "day" && (
            <>
              <button
                onClick={() => { setLoading(true); setDate(shiftDate(date, -1)); }}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-300"
                aria-label="روز قبل"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <Input
                type="date"
                value={date}
                onChange={(e) => { setLoading(true); setDate(e.target.value); }}
                className="w-auto"
              />
              <button
                onClick={() => { setLoading(true); setDate(shiftDate(date, 1)); }}
                className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-300"
                aria-label="روز بعد"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}
          <Select value={range} onChange={(e) => { setLoading(true); setRange(e.target.value as "day" | "month" | "all"); }} className="w-auto">
            <option value="day">این روز</option>
            <option value="month">این ماه</option>
            <option value="all">همه روزها</option>
          </Select>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو: نام / تلفن / کد رزرو"
          className="pr-9"
        />
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-xs">
              <tr>
                <th className="text-right px-4 py-3">مشتری</th>
                {range === "all" && <th className="text-right px-4 py-3">تاریخ</th>}
                <th className="text-right px-4 py-3">ساعت</th>
                <th className="text-right px-4 py-3">نفر</th>
                <th className="text-right px-4 py-3">میز</th>
                <th className="text-right px-4 py-3">وضعیت</th>
                <th className="text-right px-4 py-3">کد</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-800">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-5 rounded-md bg-zinc-800 animate-pulse" style={{ width: `${90 - i * 8}%` }} />
                    </td>
                  </tr>
                ))
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-500">
                    {range === "day" ? "در این روز مراجعه پایان‌یافته‌ای ثبت نشده است." : "مراجعه پایان‌یافته‌ای یافت نشد."}
                  </td>
                </tr>
              ) : (
                groups.map((g) => (
                  <Fragment key={g.id}>
                    <tr
                      onClick={() => toggleGroup(g.id)}
                      className="bg-zinc-900/50 border-b border-zinc-800 hover:bg-zinc-900 cursor-pointer"
                    >
                      <td colSpan={7} className="px-4 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span
                              className="font-semibold hover:text-amber-400 cursor-pointer"
                              title="مشاهده و ویرایش جزئیات"
                              onClick={(e) => {
                                e.stopPropagation();
                                const latest = g.visits[g.visits.length - 1];
                                if (latest) setDrawerId(latest.id);
                              }}
                            >
                              {g.name}
                            </span>
                            <a
                              href={`tel:${g.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
                              dir="ltr"
                            >
                              <Phone className="w-3.5 h-3.5" /> {g.phone}
                            </a>
                          </div>
                          <span className="text-[11px] text-zinc-500 whitespace-nowrap">
                            {toFaDigits(g.visits.length)} مراجعه
                            {g.doneCount > 0 && ` · ${toFaDigits(g.doneCount)} تکمیل`}
                            {g.cancelledCount > 0 && ` · ${toFaDigits(g.cancelledCount)} لغو`}
                            {g.noShowCount > 0 && ` · ${toFaDigits(g.noShowCount)} عدم حضور`}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {(collapsed.has(g.id) ? [] : g.visits).map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => setDrawerId(r.id)}
                        className="border-b border-zinc-800/60 hover:bg-zinc-900/30 cursor-pointer"
                        title="مشاهده و ویرایش جزئیات"
                      >
                        <td className="px-4 py-2.5 pr-8">
                          {displayNotes(r) ? (
                            <span className="flex items-center gap-1 text-[11px] text-amber-400">
                              <Cake className="w-3 h-3 shrink-0" /> {displayNotes(r)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-zinc-600">{r.source ?? ""}</span>
                          )}
                        </td>
                        {range === "all" && <td className="px-4 py-2.5 text-zinc-300 whitespace-nowrap">{r.date}</td>}
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap">{toFaDigits(r.time.slice(0, 5))}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap">{toFaDigits(r.partySize)} نفر</td>
                        <td className="px-4 py-2.5 text-zinc-300 whitespace-nowrap">{assignedTableNames(r)}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-zinc-500" dir="ltr">
                          {r.code}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-zinc-600">
        روی نام هر مشتری یا هر ردیف کلیک کنید تا جزئیات کامل باز شود. روی سربرگ گروه کلیک کنید تا جمع شود.
      </p>

      <ReservationDrawer
        reservation={reservations.find((r) => r.id === drawerId) ?? null}
        tables={tables}
        allReservations={reservations}
        onClose={() => setDrawerId(null)}
        onChanged={() => {
          setLoading(true);
          loadActivity(range === "day" ? date : null)
            .then((d) => {
              const month = date.slice(0, 7);
              setReservations(range === "month" ? d.reservations.filter((r) => r.date.startsWith(month)) : d.reservations);
              setTables(d.tables);
              setLoading(false);
            })
            .catch((e) => {
              console.error(e);
              setLoading(false);
            });
        }}
      />
    </div>
  );
}
