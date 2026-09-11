"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Power } from "lucide-react";
import type { TableDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAllTables, createTable, updateTable, deleteTable } from "@/lib/tables";
import { toFaDigits } from "@/lib/persian";

export default function AdminSettingsPage() {
  const [tables, setTables] = useState<TableDto[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCapacity, setNewCapacity] = useState(4);

  const load = useCallback(() => {
    return Promise.all([
      fetchAllTables("ALL"),
      fetch("/api/restaurants", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([list, rest]) => {
        setTables(list.sort((a, b) => a.name.localeCompare(b.name, "fa")));
        if (Array.isArray(rest) && rest[0]) {
          setRestaurantId(rest[0].id);
          setRestaurantName(rest[0].name ?? "");
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "خطا در بارگذاری");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchAllTables("ALL"),
      fetch("/api/restaurants", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([list, rest]: [TableDto[], { id: string; name?: string }[]]) => {
        if (cancelled) return;
        setTables(list.sort((a, b) => a.name.localeCompare(b.name, "fa")));
        if (Array.isArray(rest) && rest[0]) {
          setRestaurantId(rest[0].id);
          setRestaurantName(rest[0].name ?? "");
        }
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "خطا در بارگذاری");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "عملیات ناموفق بود");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات</h1>
        {restaurantName && <p className="text-sm text-zinc-400 mt-0.5">{restaurantName}</p>}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="font-semibold mb-1">میزها</h2>
        <p className="text-xs text-zinc-500 mb-3">
          چیدمان نقشه میزها از همین فهرست ساخته می‌شود. میز غیرفعال در نقشه نمایش داده نمی‌شود.
        </p>

        {loading ? (
          <div className="text-sm text-zinc-500 py-4 text-center">در حال بارگذاری…</div>
        ) : (
          <div className="space-y-2">
            {tables.map((t) => (
              <div
                key={t.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${t.active ? "border-zinc-800 bg-zinc-950" : "border-zinc-800/60 bg-zinc-950/50 opacity-60"}`}
              >
                <Input
                  defaultValue={t.name}
                  key={`${t.id}-${t.name}`}
                  onBlur={(e) => {
                    if (e.target.value.trim() && e.target.value !== t.name)
                      run(`name-${t.id}`, () => updateTable(t.id, { name: e.target.value.trim() }));
                  }}
                  className="w-28"
                  aria-label="نام میز"
                />
                <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                  ظرفیت
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    defaultValue={t.capacity}
                    key={`${t.id}-${t.capacity}`}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0 && v !== t.capacity) run(`cap-${t.id}`, () => updateTable(t.id, { capacity: v }));
                    }}
                    className="w-16"
                    aria-label="ظرفیت"
                  />
                </label>
                <span className="text-xs text-zinc-500 mr-auto">{toFaDigits(t.capacity)} نفر</span>
                <Button
                  size="sm"
                  variant="ghost"
                  title={t.active ? "غیرفعال کردن" : "فعال کردن"}
                  disabled={busy !== null}
                  onClick={() => run(`toggle-${t.id}`, () => updateTable(t.id, { active: !t.active }))}
                >
                  <Power className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="حذف میز"
                  disabled={busy !== null}
                  onClick={() => {
                    if (window.confirm(`میز «${t.name}» حذف شود؟`)) run(`del-${t.id}`, () => deleteTable(t.id));
                  }}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <Input placeholder="نام میز جدید (مثل میز ۷)" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-48" />
          <Input
            type="number"
            min={1}
            max={30}
            value={newCapacity}
            onChange={(e) => setNewCapacity(Number(e.target.value))}
            className="w-20"
            aria-label="ظرفیت"
          />
          <Button
            size="sm"
            disabled={!newName.trim() || !restaurantId || busy !== null}
            onClick={() => {
              run("create", () =>
                createTable({ restaurantId: restaurantId!, name: newName.trim(), capacity: newCapacity }),
              ).then(() => {
                setNewName("");
                setNewCapacity(4);
              });
            }}
          >
            <Plus className="w-4 h-4" /> افزودن میز
          </Button>
        </div>
      </section>
    </div>
  );
}
