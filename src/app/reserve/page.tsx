"use client";
import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { getRestaurant, createReservation } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function ReservePage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<{ openTime: string; closeTime: string; id: string } | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState(4);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getRestaurant().then((r) => {
      setRestaurant(r);
      fetch(`/api/restaurant-settings?restaurantId=${r.id}`)
        .then((res) => res.json())
        .then((settings: { depositAmount: number }) => {
          setDepositAmount(settings.depositAmount);
        })
        .catch(() => {});
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage("");

    try {
      const data = await createReservation({
        restaurantId: restaurant!.id,
        date,
        time,
        partySize,
        name,
        phone,
        notes,
        source: "WEB",
      });

      if (data.requiresPayment && data.payment) {
        router.push(`/payment?paymentId=${data.payment.id}`);
      } else {
        setMessage(`رزرو با موفقیت ثبت شد. کد: ${data.reservation?.code}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطای ارتباط با سرور";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">رزرو میز</h1>

      {restaurant && (
        <div className="text-sm text-zinc-400">
          ساعت کاری: {restaurant.openTime} - {restaurant.closeTime}
          {depositAmount > 0 && (
            <span className="mr-2 text-amber-400">بیعانه: {depositAmount} ریال</span>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
      )}

      {message && (
        <div className={`text-sm mt-2 ${message.includes("موفقیت") ? "text-emerald-400" : "text-amber-500"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 border border-zinc-800 rounded-xl p-6 bg-zinc-900/40">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">تاریخ</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[2, 3, 4, 5, 6, 8].map((n) => (
            <button key={n} type="button" onClick={() => setPartySize(n)} className={`h-10 rounded-lg border text-sm ${partySize === n ? "bg-amber-500 text-zinc-950 border-amber-500" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}>{n} نفر</button>
          ))}
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">ساعت</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">نام</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" placeholder="محمد احمدی" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">شماره تماس</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" placeholder="0912..." dir="ltr" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">توضیحات (اختیاری)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" placeholder="هر درخواست ویژه‌ای..." />
        </div>
        <button type="submit" disabled={loading} className="w-full h-10 rounded-lg bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          تأیید رزرو
        </button>
      </form>
    </div>
  );
}