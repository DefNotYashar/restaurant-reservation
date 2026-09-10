"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { ReservationDto } from "@/lib/api";

export default function BookPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [partySize, setPartySize] = useState(4);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [time, setTime] = useState("18:00");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("در حال ارسال رزرو...");
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId: await fetch("/api/restaurants").then(r => r.json()).then(list => list[0]?.id || "RESTAURANT_ID"), date, time, partySize, name, phone }),
      });
      const data = await res.json();
      if (res.ok) setMessage(`رزرو با موفقیت ثبت شد. کد: ${data.code}`);
      else setMessage(data.error ?? "خطا در ثبت رزرو");
    } catch {
      setMessage("خطای ارتباط با سرور");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">رزرو میز</h1>
      <form onSubmit={handleSubmit} className="space-y-4 border border-zinc-800 rounded-xl p-6 bg-zinc-900/40">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">تاریخ</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[2, 3, 4, 5, 6, 8].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPartySize(n)}
              className={`h-10 rounded-lg border text-sm ${partySize === n ? "bg-amber-500 text-zinc-950 border-amber-500" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}
            >
              {n} نفر
            </button>
          ))}
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">نام</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" placeholder="محمد احمدی" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">شماره تماس</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" placeholder="0912..." />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["18:00", "19:00", "20:00", "21:00", "22:00"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTime(t)}
              className={`h-10 rounded-lg border text-sm ${time === t ? "bg-amber-500 text-zinc-950 border-amber-500" : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <button type="submit" className="w-full h-10 rounded-lg bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> تأیید رزرو
        </button>
        {message && <p className={`text-sm mt-2 ${message.includes("موفقیت") ? "text-emerald-400" : "text-amber-500"}`}>{message}</p>}
      </form>
    </div>
  );
}