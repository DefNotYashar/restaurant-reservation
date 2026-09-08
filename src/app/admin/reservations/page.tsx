"use client";
import { useEffect, useState } from "react";
import { ReservationDto } from "@/lib/api";
import { Badge, statusVariant, statusLabel } from "@/components/ui/badge";

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<ReservationDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reservations?restaurantId=ALL")
      .then((r) => r.json())
      .then((d) => setReservations(d ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">رزروها</h1>
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-xs">
            <tr>
              <th className="text-right px-4 py-3">کد</th>
              <th className="text-right px-4 py-3">نام</th>
              <th className="text-right px-4 py-3">تاریخ</th>
              <th className="text-right px-4 py-3">ساعت</th>
              <th className="text-right px-4 py-3">تعداد</th>
              <th className="text-right px-4 py-3">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-zinc-500">در حال بارگذاری...</td></tr>
            ) : (
              reservations.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800 hover:bg-zinc-900/30">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{r.code}</td>
                  <td className="px-4 py-3">{r.customer?.name ?? "-"}</td>
                  <td className="px-4 py-3">{r.date}</td>
                  <td className="px-4 py-3">{r.time}</td>
                  <td className="px-4 py-3">{r.partySize}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}