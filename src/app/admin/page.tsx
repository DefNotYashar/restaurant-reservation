"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X, Eye, EyeOff, Clock } from "lucide-react";
import type { ReservationDto, TableDto } from "@/lib/api";
import { Badge, statusVariant, statusLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ReservationDrawer from "@/components/admin/ReservationDrawer";
import {
  assignedTableNames,
  displayNotes,
  maskPhone,
  confirmReservation,
  arriveReservation,
  cancelReservationById,
  presenceOf,
  PRESENCE_BAR,
} from "@/lib/reservations";
import { formatJalali, toFaDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${className}`}>{children}</div>;
}

async function loadDayData(date: string): Promise<{ reservations: ReservationDto[]; tables: TableDto[] }> {
  const [resR, resT] = await Promise.all([
    fetch(`/api/reservations?restaurantId=ALL&date=${date}`, { cache: "no-store" }).then((r) => r.json()),
    fetch(`/api/tables?restaurantId=ALL`, { cache: "no-store" }).then((r) => r.json()),
  ]);
  return {
    reservations: Array.isArray(resR) ? resR : [],
    tables: Array.isArray(resT) ? resT : [],
  };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + (m || 0);
}

function nowMinutes(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function todayISO(): string {
  const n = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}

const DISMISS_KEY = "dismissed-cancelled";

function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

export default function AdminPage() {
  const [reservations, setReservations] = useState<ReservationDto[]>([]);
  const [tables, setTables] = useState<TableDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [showDismissed, setShowDismissed] = useState(false);
  const date = todayISO();

  const load = useCallback(() => {
    return loadDayData(todayISO())
      .then((d) => {
        setReservations(d.reservations);
        setTables(d.tables);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadDayData(todayISO())
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
  }, []);

  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  async function runAction(id: string, fn: () => Promise<unknown>) {
    setActionId(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "عملیات ناموفق بود");
    } finally {
      setActionId(null);
    }
  }

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  const groups = useMemo(() => {
    const now = nowMinutes();
    const byTime = (a: ReservationDto, b: ReservationDto) => a.time.localeCompare(b.time);
    const pending = reservations.filter((r) => r.status === "PENDING").sort(byTime);
    const coming = reservations.filter((r) => r.status === "CONFIRMED").sort(byTime);
    const here = reservations.filter((r) => ["ARRIVED", "SEATED"].includes(r.status)).sort(byTime);
    const soonIds = new Set(
      coming
        .filter((r) => timeToMinutes(r.time) - now >= -15 && timeToMinutes(r.time) - now <= 90)
        .map((r) => r.id),
    );
    const unassigned = reservations.filter(
      (r) => ["CONFIRMED", "ARRIVED", "SEATED"].includes(r.status) && (!r.assignedTables || r.assignedTables.length === 0),
    ).length;
    const cancelled = reservations
      .filter((r) => ["CANCELLED", "NO_SHOW"].includes(r.status) && (showDismissed || !dismissed.has(r.id)))
      .sort(byTime);
    const hiddenCount = reservations.filter((r) => ["CANCELLED", "NO_SHOW"].includes(r.status) && dismissed.has(r.id)).length;
    const done = reservations.filter((r) => r.status === "COMPLETED").sort(byTime);
    return { pending, coming, here, soonIds, unassigned, cancelled, hiddenCount, done };
  }, [reservations, dismissed, showDismissed]);

  const drawerReservation = reservations.find((r) => r.id === drawerId) ?? null;
  const total = reservations.length;
  const guests = reservations.reduce((s, r) => s + r.partySize, 0);

  function row(r: ReservationDto, opts?: { quickActions?: boolean; arrive?: boolean; dim?: boolean; soon?: boolean }) {
    const busy = actionId === r.id;
    return (
      <tr
        key={r.id}
        onClick={() => setDrawerId(r.id)}
        className={cn("border-b border-zinc-800 hover:bg-zinc-900/40 cursor-pointer last:border-0", opts?.dim && "opacity-60")}
      >
        <td className={cn("px-4 py-3 font-medium whitespace-nowrap border-r-4", PRESENCE_BAR[presenceOf(r)])}>
          {toFaDigits(r.time.slice(0, 5))}
          {opts?.soon && (
            <span className="mr-2 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">نزدیک</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="font-medium">{r.customer?.name ?? "-"}</div>
          <div className="text-[11px] text-zinc-500" dir="ltr">
            {maskPhone(r.customer?.phone)}
          </div>
          {displayNotes(r) && <div className="text-[11px] text-amber-400/90 truncate max-w-44">{displayNotes(r)}</div>}
        </td>
        <td className="px-4 py-3 whitespace-nowrap">{toFaDigits(r.partySize)} نفر</td>
        <td className="px-4 py-3 text-sm text-zinc-300 whitespace-nowrap">{assignedTableNames(r)}</td>
        <td className="px-4 py-3">
          <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-zinc-500" dir="ltr">
          {r.code}
        </td>
        {opts?.quickActions && (
          <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="success"
                disabled={busy}
                onClick={() => runAction(r.id, () => confirmReservation(r.id))}
                title="تأیید رزرو"
              >
                <Check className="w-3.5 h-3.5" /> تأیید
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => runAction(r.id, () => cancelReservationById(r.id))}
                title="لغو رزرو"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </td>
        )}
        {opts?.arrive && (
          <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => runAction(r.id, () => arriveReservation(r.id))}
              title="مهمان رسید"
            >
              حاضر شد
            </Button>
          </td>
        )}
      </tr>
    );
  }

  function section(
    key: string,
    title: string,
    count: number,
    accent: string,
    rows: React.ReactNode,
    extra?: React.ReactNode,
  ) {
    if (count === 0) return null;
    return (
      <div id={`today-${key}`} className="border border-zinc-800 rounded-xl overflow-hidden scroll-mt-4">
        <div className={cn("flex items-center justify-between px-4 py-2.5 border-b border-zinc-800", accent)}>
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs opacity-80">{toFaDigits(count)}</span>
        </div>
        {extra}
        <table className="w-full text-sm">
          <tbody>{rows}</tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">امروز</h1>
        <p className="text-sm text-zinc-400">{formatJalali(date)}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card><div className="text-xs text-zinc-500">کل رزروها</div><div className="text-2xl font-bold mt-1">{toFaDigits(total)}</div></Card>
        <Card><div className="text-xs text-zinc-500">مهمانان</div><div className="text-2xl font-bold text-amber-400 mt-1">{toFaDigits(guests)}</div></Card>
        <a href="#today-pending" className="block hover:border-yellow-400/40 transition-colors rounded-xl">
          <Card className="h-full">
            <div className="text-xs text-zinc-500">نیازمند تأیید</div>
            <div className="text-2xl font-bold text-yellow-300 mt-1">{toFaDigits(groups.pending.length)}</div>
          </Card>
        </a>
        <a href="#today-coming" className="block hover:border-emerald-500/40 transition-colors rounded-xl">
          <Card className="h-full">
            <div className="text-xs text-zinc-500">در راه</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{toFaDigits(groups.coming.length)}</div>
          </Card>
        </a>
        <a href="#today-here" className="block hover:border-sky-500/40 transition-colors rounded-xl">
          <Card className="h-full">
            <div className="text-xs text-zinc-500">در رستوران</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">{toFaDigits(groups.here.length)}</div>
          </Card>
        </a>
        <Link href="/admin/table-plan" className="block hover:border-amber-400/40 transition-colors rounded-xl">
          <Card className="h-full">
            <div className="text-xs text-zinc-500">بدون میز</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{toFaDigits(groups.unassigned)}</div>
          </Card>
        </Link>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-zinc-800 p-4 space-y-2">
              <div className="h-5 w-32 rounded-md bg-zinc-800 animate-pulse" />
              <div className="h-10 rounded-md bg-zinc-800 animate-pulse" />
              <div className="h-10 rounded-md bg-zinc-800 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {section(
            "pending",
            "نیازمند تأیید",
            groups.pending.length,
            "bg-yellow-400/10 text-yellow-300",
            groups.pending.map((r) => row(r, { quickActions: true })),
          )}
          {section(
            "coming",
            "در راه",
            groups.coming.length,
            "bg-emerald-500/10 text-emerald-400",
            groups.coming.map((r) => row(r, { arrive: true, soon: groups.soonIds.has(r.id) })),
          )}
          {section(
            "here",
            "در رستوران",
            groups.here.length,
            "bg-sky-500/10 text-sky-400",
            groups.here.map((r) => row(r)),
          )}
          {section(
            "cancelled",
            "لغوشده",
            groups.cancelled.length,
            "bg-red-500/10 text-red-400",
            groups.cancelled.map((r) => (
              <tr key={r.id} className="border-b border-zinc-800 last:border-0 opacity-60">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{toFaDigits(r.time.slice(0, 5))}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{r.customer?.name ?? "-"}</div>
                  <div className="text-[11px] text-zinc-500" dir="ltr">
                    {maskPhone(r.customer?.phone)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{toFaDigits(r.partySize)} نفر</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500" dir="ltr">
                  {r.code}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => dismiss(r.id)}
                    className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200"
                    title="حذف از فهرست"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> حذف
                  </button>
                </td>
              </tr>
            )),
            groups.hiddenCount > 0 ? (
              <button
                onClick={() => setShowDismissed(!showDismissed)}
                className="flex items-center gap-1.5 w-full px-4 py-2 text-[11px] text-zinc-500 hover:text-zinc-300 border-b border-zinc-800"
              >
                {showDismissed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showDismissed ? "پنهان کردن حذف‌شده‌ها" : `نمایش ${toFaDigits(groups.hiddenCount)} مورد حذف‌شده`}
              </button>
            ) : undefined,
          )}
          {section(
            "done",
            "پایان‌یافته",
            groups.done.length,
            "bg-zinc-800/40 text-zinc-500",
            groups.done.map((r) => row(r, { dim: true })),
          )}
          {total === 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 border border-dashed border-zinc-800 rounded-xl p-8">
              <Clock className="w-4 h-4" /> رزروی برای این تاریخ وجود ندارد.
            </div>
          )}
        </div>
      )}

      <ReservationDrawer
        reservation={drawerReservation}
        tables={tables}
        allReservations={reservations}
        onClose={() => setDrawerId(null)}
        onChanged={load}
      />
    </div>
  );
}
