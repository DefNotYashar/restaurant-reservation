"use client";
import { useEffect, useState } from "react";
import { Clock, Users, UserCheck, Table, AlertCircle } from "lucide-react";
import { ReservationDto } from "@/lib/api";
import { Badge, statusVariant, statusLabel } from "@/components/ui/badge";
import { formatJalali, toFaDigits } from "@/lib/persian";

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${className}`}>{children}</div>;
}

export default function AdminPage() {
  const [reservations, setReservations] = useState<ReservationDto[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reservations?restaurantId=ALL&date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        const arr = Array.isArray(d) ? d : [];
        setReservations(arr);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date]);

  const pending = reservations.filter((r) => r.status === "PENDING").length;
  const confirmed = reservations.filter((r) => r.status === "CONFIRMED").length;
  const arrived = reservations.filter((r) => r.status === "ARRIVED").length;
  const total = reservations.length;
  const guests = reservations.reduce((s, r) => s + r.partySize, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">امروز</h1>
          <p className="text-sm text-zinc-400">{formatJalali(date)}</p>
        </div>
        <div>
          <label className="text-xs text-zinc-500">تاریخ</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ml-2 h-8 px-2 rounded bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><div className="text-xs text-zinc-500">کل رزروها</div><div className="text-2xl font-bold mt-1">{toFaDigits(total)}</div></Card>
        <Card><div className="text-xs text-zinc-500">مهمانان</div><div className="text-2xl font-bold text-amber-400 mt-1">{toFaDigits(guests)}</div></Card>
        <Card><div className="text-xs text-zinc-500">در انتظار</div><div className="text-2xl font-bold text-amber-500 mt-1">{toFaDigits(pending)}</div></Card>
        <Card><div className="text-xs text-zinc-500">حاضر شده</div><div className="text-2xl font-bold text-emerald-400 mt-1">{toFaDigits(arrived)}</div></Card>
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-xs">
            <tr>
              <th className="text-right px-4 py-3">ساعت</th>
              <th className="text-right px-4 py-3">نام</th>
              <th className="text-right px-4 py-3">تعداد</th>
              <th className="text-right px-4 py-3">وضعیت</th>
              <th className="text-right px-4 py-3">کد رزرو</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-zinc-500">در حال بارگذاری...</td></tr>
            ) : reservations.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-zinc-500">رزروی برای این تاریخ وجود ندارد.</td></tr>
            ) : (
              reservations.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800 hover:bg-zinc-900/30">
                  <td className="px-4 py-3 font-medium">{toFaDigits(r.time)}</td>
                  <td className="px-4 py-3">{r.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3">{r.partySize}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{r.code}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}