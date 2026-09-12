"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPaymentByReservation, fetchPaymentStatus, type PaymentDto } from "@/lib/api";

interface Props {
  initialSearchParams: Promise<{ paymentId?: string; reservationId?: string }>;
}

export function PaymentClient({ initialSearchParams }: Props) {
  const router = useRouter();
  const [searchParams, setSearchParams] = useState<{ paymentId?: string; reservationId?: string }>({});
  const [payment, setPayment] = useState<PaymentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    initialSearchParams.then(setSearchParams);
  }, [initialSearchParams]);

  const { paymentId, reservationId } = searchParams;

  useEffect(() => {
    async function load() {
      if (!paymentId && !reservationId) {
        setError("شناسه پرداخت یا رزرو الزامی است");
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
      } catch (e) {
        setError(e instanceof Error ? e.message : "خطا در بارگذاری");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [paymentId, reservationId]);

  const handleStartPayment = async () => {
    if (!payment) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments/start?paymentId=${payment.id}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.gatewayUrl) {
          window.location.href = data.gatewayUrl;
        } else {
          setError("خطا در شروع پرداخت");
        }
      } else {
        const data = await res.json();
        setError(data.error ?? "خطا در شروع پرداخت");
      }
    } catch {
      setError("خطای ارتباط با سرور");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/40 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
          <p className="mt-2 text-zinc-400">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error && !payment) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
        <Button variant="secondary" onClick={() => router.back()}>بازگشت</Button>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-sm text-zinc-500 text-center">پرداختی یافت نشد</div>
        <Button variant="secondary" onClick={() => router.back()}>بازگشت</Button>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    PENDING: "در انتظار پرداخت",
    PAID: "پرداخت موفق",
    FAILED: "پرداخت ناموفق",
    CANCELLED: "لغو شده",
  };

  const statusColors: Record<string, string> = {
    PENDING: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    PAID: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    FAILED: "text-red-400 bg-red-500/10 border-red-500/20",
    CANCELLED: "text-zinc-500 bg-zinc-800/50 border-zinc-700",
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">پرداخت بیعانه رزرو</h1>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
      )}

      <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/40 space-y-4">
        <div className="space-y-3">
          <p>مبلغ: <span className="text-amber-400 font-bold">{payment.amount} ریال</span></p>
          <p>وضعیت: <span className={`font-semibold rounded-lg border px-2 py-1 text-sm ${statusColors[payment.status] ?? ""}`}>{statusLabels[payment.status] ?? payment.status}</span></p>
          {payment.referenceId && <p>شماره مرجع: <span className="font-mono text-sm">{payment.referenceId}</span></p>}
          {payment.paidAt && <p>تاریخ پرداخت: {new Date(payment.paidAt).toLocaleString("fa-IR")}</p>}
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

        {payment.status === "PENDING" && (
          <Button onClick={handleStartPayment} disabled={processing} className="w-full bg-amber-500 text-zinc-950">
            <CreditCard className="w-4 h-4 mr-2" />
            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <>شروع پرداخت <ArrowRight className="w-4 h-4 ml-2" /></>}
          </Button>
        )}

        {payment.status === "PAID" && (
          <div className="text-center p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <p className="font-bold">پرداخت با موفقیت انجام شد</p>
            <p className="text-sm mt-1">رزرو شما منتظر تأیید کارکنان است.</p>
          </div>
        )}

        {["FAILED", "CANCELLED"].includes(payment.status) && (
          <div className="text-center">
            <Button variant="secondary" onClick={handleStartPayment} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "تلاش مجدد"}
            </Button>
            <p className="text-xs text-zinc-500 mt-2">پرداخت انجام نشد. می‌توانید مجدداً تلاش کنید.</p>
          </div>
        )}
      </div>
    </div>
  );
}