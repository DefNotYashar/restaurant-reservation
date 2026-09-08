"use client";
import { useEffect, useState } from "react";
import { TableDto } from "@/lib/api";
import { toFaDigits } from "@/lib/persian";

export default function AdminFloorPage() {
  const [tables, setTables] = useState<TableDto[]>([]);

  useEffect(() => {
    fetch("/api/tables?restaurantId=ALL").then((r) => r.json()).then((d) => setTables(d ?? []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">میزها</h1>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {tables.map((t) => (
          <div key={t.id} className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/40 hover:bg-zinc-800/40 transition-colors">
            <div className="text-lg font-bold">{t.name}</div>
            <div className="text-xs text-zinc-400">ظرفیت: {toFaDigits(t.capacity)} نفر</div>
          </div>
        ))}
      </div>
    </div>
  );
}