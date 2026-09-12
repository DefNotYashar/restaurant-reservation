"use client";
import { useState, useEffect } from "react";
import { XCircle, Loader2, ArrowRight } from "lucide-react";
import { fetchPaymentStatus, fetchPaymentByReservation, type PaymentDto } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Props {
  initialSearchParams: Promise<{ paymentId?: string; reservationId?: string }>;
}

export function PaymentFailedClient({ initialSearchParams }: Props) {
  const [searchParams, setSearchParams] = useState<{ paymentId?: string; reservationId?: string }>({});
  const [payment, setPayment] = useState<PaymentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    initialSearchParams.then(setSearchParams);
  }, [initialSearchParams]);

  const { paymentId, reservationId } = searchParams;

  useEffect(() => {
    async function load() {
      if (!paymentId && !reservationId) {
        setLoading(false);
        return;
      }

      try {
        let p: PaymentDto | null = null;
        if (paymentId) {
          p = await fetchPaymentStatus(paymentId);
        } else if (reservationId) {
          p = await fetchPaymentByReservation(reservationId);
        }
        setPayment(p);
      } catch {}
      setLoading(false);
    }
    load();
  }, [paymentId, reservationId]);

  const handleRetry = async () => {
    if (!payment) return;
    setRetrying(true);
    try {
      const res = await fetch(`/api/payments/start?paymentId=${payment.id}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "خطا در شروع مجدد پرداخت");
        return;
      }
      const data = await res.json();
      if (data.gatewayUrl) {
        window.location.href = data.gatewayUrl;
      } else {
        alert("خطا در شروع مجدد پرداخت");
      }
    } catch {
      alert("خطا در شروع مجدد پرداخت");
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pt-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
        <p className="text-zinc-400">در حال بارگذاری...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pt-20">
      <div className="text-center">
        <XCircle className="w-16 h-16 mx-auto text-red-400" />
        <h1 className="text-2xl font-bold mt-4 text-red-400">پرداخت انجام نشد</h1>
        <p className="text-zinc-400 mt-2">پرداخت با خطا مواجه شد یا توسط کاربر لغو گردید.</p>
      </div>

      {payment && (
        <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/40 space-y-3">
          <div className="space-y-2">
            <p>مبلغ: <span className="text-amber-400 font-bold">{payment.amount} ریال</span></p>
            {payment.reservation && (
              <div className="border-t border-zinc-800 pt-3 mt-3 space-y-1">
                <p className="font-semibold">اطلاعات رزرو</p>
                <p>کد رزرو: {payment.reservation.code}</p>
                <p>تاریخ: {payment.reservation.date}</p>
                <p>ساعت: {payment.reservation.time.slice(0, 5)}</p>
                <p>تعداد مهمان: {payment.reservation.partySize} نفر</p>
              </div>
            )}
          </div>

          <div className="space-y-2 mt-4">
            <Button onClick={handleRetry} disabled={retrying} className="w-full bg-amber-500 text-zinc-950">
              <ArrowRight className="w-4 h-4 mr-2" />
              {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : "تلاش مجدد برای پرداخت"}
            </Button>
            <p className="text-xs text-zinc-500 text-center">رزرو شما همچنان در وضعیت «در انتظار پرداخت» باقی مانده است.</p>
          </div>
        </div>
      )}

      <Link href="/reserve" className="block text-center text-amber-400 hover:text-amber-300">رزرو جدید</Link>
    </div>
  );
}