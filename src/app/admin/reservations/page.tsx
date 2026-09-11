"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, RefreshCw, Cake } from "lucide-react";
import type { ReservationDto, TableDto } from "@/lib/api";
import { Badge, statusVariant, statusLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReservationDrawer from "@/components/admin/ReservationDrawer";
import {
  assignedTableNames,
  displayNotes,
  isUnassigned,
  maskPhone,
  presenceOf,
  PRESENCE_BAR,
} from "@/lib/reservations";
import { toFaDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";

async function loadPageData(date: string): Promise<{ reservations: ReservationDto[]; tables: TableDto[] }> {
  const [resR, resT] = await Promise.all([
    fetch(`/api/reservations?restaurantId=ALL&date=${date}`, { cache: "no-store" }).then((r) => r.json()),
    fetch(`/api/tables?restaurantId=ALL`, { cache: "no-store" }).then((r) => r.json()),
  ]);
  return {
    reservations: Array.isArray(resR) ? resR : [],
    tables: Array.isArray(resT) ? resT : [],
  };
}

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<ReservationDto[]>([]);
  const [tables, setTables] = useState<TableDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [query, setQuery] = useState("");
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ name: "", phone: "", time: "20:00", partySize: 2, notes: "" });
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const load = useCallback(() => {
    return loadPageData(date)
      .then((d) => {
        setReservations(d.reservations);
        setTables(d.tables);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [date]);

  useEffect(() => {
    let cancelled = false;
    loadPageData(date)
      .then((d) => {
        if (cancelled) return;
        setReservations(d.reservations);
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
  }, [date]);

  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reservations.filter((r) => {
      if (onlyUnassigned && !isUnassigned(r)) return false;
      if (q) {
        const hay = `${r.customer?.name ?? ""} ${r.customer?.phone ?? ""} ${r.code}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reservations, query, onlyUnassigned]);

  const groups = useMemo(() => {
    const byTime = (a: ReservationDto, b: ReservationDto) => a.time.localeCompare(b.time);
    const inList = (list: string[]) => base.filter((r) => list.includes(r.status)).sort(byTime);
    return {
      pending: inList(["PENDING"]),
      coming: inList(["CONFIRMED"]),
      here: inList(["ARRIVED", "SEATED"]),
      cancelled: inList(["CANCELLED", "NO_SHOW"]),
      done: inList(["COMPLETED"]),
    };
  }, [base]);

  const guests = base.reduce((s, r) => s + r.partySize, 0);
  const selected = reservations.find((r) => r.id === selectedId) ?? null;

  function rows(list: ReservationDto[], dim = false) {
    return list.map((r) => (
      <tr
        key={r.id}
        onClick={() => setSelectedId(r.id)}
        className={cn("border-b border-zinc-800 hover:bg-zinc-900/40 cursor-pointer last:border-0", dim && "opacity-60")}
      >
        <td className={cn("px-4 py-3 font-mono text-xs text-zinc-500 border-r-4", PRESENCE_BAR[presenceOf(r)])} dir="ltr">
          {r.code}
        </td>
        <td className="px-4 py-3">
          <div className="font-medium">{r.customer?.name ?? "-"}</div>
          {displayNotes(r) && (
            <div className="flex items-center gap-1 text-[11px] text-amber-400/90 truncate max-w-40">
              <Cake className="w-3 h-3 shrink-0" />
              <span className="truncate">{displayNotes(r)}</span>
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-zinc-300 whitespace-nowrap" dir="ltr">
          {maskPhone(r.customer?.phone)}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">{toFaDigits(r.partySize)}</td>
        <td className="px-4 py-3 font-medium whitespace-nowrap">{toFaDigits(r.time.slice(0, 5))}</td>
        <td className="px-4 py-3 whitespace-nowrap">
          {(r.assignedTables?.length ?? 0) > 0 ? (
            assignedTableNames(r)
          ) : (
            <span className="text-amber-400 text-xs">تخصیص‌نیافته</span>
          )}
        </td>
        <td className="px-4 py-3">
          <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
        </td>
      </tr>
    ));
  }

  function renderSection(title: string, list: ReservationDto[], accent: string, dim = false) {
    if (list.length === 0) return null;
    return (
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <div className={cn("flex items-center justify-between px-4 py-2.5 border-b border-zinc-800", accent)}>
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs opacity-80">{toFaDigits(list.length)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <tbody>{rows(list, dim)}</tbody>
          </table>
        </div>
      </div>
    );
  }

  async function createManual() {
    setManualBusy(true);
    setManualError(null);
    try {
      const rest = await fetch("/api/restaurants", { cache: "no-store" }).then((r) => r.json());
      const restaurantId = rest?.[0]?.id;
      if (!restaurantId) throw new Error("رستورانی یافت نشد");
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          date,
          time: manual.time,
          partySize: manual.partySize,
          name: manual.name,
          phone: manual.phone,
          notes: manual.notes || undefined,
          source: "STAFF",
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "ثبت رزرو ناموفق بود");
      setShowManual(false);
      setManual({ name: "", phone: "", time: "20:00", partySize: 2, notes: "" });
      await load();
    } catch (e) {
      setManualError(e instanceof Error ? e.message : "ثبت رزرو ناموفق بود");
    } finally {
      setManualBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">رزروها</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {toFaDigits(base.length)} رزرو · {toFaDigits(guests)} مهمان
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={load} aria-label="بروزرسانی">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => setShowManual(true)}>
            <Plus className="w-4 h-4" /> ثبت دستی
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={date} onChange={(e) => { setLoading(true); setDate(e.target.value); }} className="w-auto" />
        <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
          <input type="checkbox" checked={onlyUnassigned} onChange={(e) => setOnlyUnassigned(e.target.checked)} />
          فقط تخصیص‌نیافته‌ها
        </label>
        <div className="relative flex-1 min-w-40">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو: نام / تلفن / کد"
            className="pr-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded-md bg-zinc-800 animate-pulse" style={{ width: `${92 - i * 6}%` }} />
            ))}
          </div>
        </div>
      ) : base.length === 0 ? (
        <div className="text-center py-10 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          رزروی یافت نشد.
        </div>
      ) : (
        <div className="space-y-4">
          {renderSection("در انتظار تأیید", groups.pending, "bg-yellow-400/10 text-yellow-300")}
          {renderSection("در راه", groups.coming, "bg-emerald-500/10 text-emerald-400")}
          {renderSection("در رستوران", groups.here, "bg-sky-500/10 text-sky-400")}
          {renderSection("لغوشده", groups.cancelled, "bg-red-500/10 text-red-400", true)}
          {renderSection("پایان‌یافته", groups.done, "bg-zinc-800/40 text-zinc-500", true)}
        </div>
      )}

      <ReservationDrawer
        reservation={selected}
        tables={tables}
        allReservations={reservations}
        onClose={() => setSelectedId(null)}
        onChanged={load}
      />

      {showManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/70" onClick={() => setShowManual(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <h2 className="font-bold">ثبت دستی رزرو ({date})</h2>
            {manualError && <div className="text-sm text-red-400">{manualError}</div>}
            <Input placeholder="نام مشتری" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
            <Input placeholder="تلفن" value={manual.phone} onChange={(e) => setManual({ ...manual, phone: e.target.value })} dir="ltr" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="time" value={manual.time} onChange={(e) => setManual({ ...manual, time: e.target.value })} />
              <Input
                type="number"
                min={1}
                max={500}
                value={manual.partySize}
                onChange={(e) => setManual({ ...manual, partySize: Number(e.target.value) })}
              />
            </div>
            <Input placeholder="توضیح (اختیاری)" value={manual.notes} onChange={(e) => setManual({ ...manual, notes: e.target.value })} />
            <div className="flex gap-2">
              <Button disabled={manualBusy || !manual.name || !manual.phone} onClick={createManual}>
                {manualBusy ? "…" : "ثبت رزرو"}
              </Button>
              <Button variant="ghost" onClick={() => setShowManual(false)}>
                انصراف
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
