"use client";
import { useState, useEffect } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { fetchPaymentStatus, type PaymentDto } from "@/lib/api";
import Link from "next/link";

interface Props {
  initialSearchParams: Promise<{ paymentId?: string }>;
}

export function PaymentSuccessClient({ initialSearchParams }: Props) {
  const [searchParams, setSearchParams] = useState<{ paymentId?: string }>({});
  const [payment, setPayment] = useState<PaymentDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initialSearchParams.then(setSearchParams);
  }, [initialSearchParams]);

  const { paymentId } = searchParams;

  useEffect(() => {
    async function load() {
      if (paymentId) {
        try {
          const p = await fetchPaymentStatus(paymentId);
          setPayment(p);
        } catch {}
      }
      setLoading(false);
    }
    load();
  }, [paymentId]);

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
        <CheckCircle className="w-16 h-16 mx-auto text-emerald-400" />
        <h1 className="text-2xl font-bold mt-4 text-emerald-400">پرداخت با موفقیت انجام شد</h1>
      </div>

      {payment && (
        <div className="border border-zinc-800 rounded-xl p-6 bg-zinc-900/40 space-y-3">
          <div className="space-y-2">
            <p>مبلغ: <span className="text-amber-400 font-bold">{payment.amount} ریال</span></p>
            {payment.referenceId && <p>شماره مرجع: <span className="font-mono text-sm">{payment.referenceId}</span></p>}
            {payment.paidAt && <p>تاریخ پرداخت: {new Date(payment.paidAt).toLocaleString("fa-IR")}</p>}
          </div>
          {payment.reservation && (
            <div className="border-t border-zinc-800 pt-3 mt-3 space-y-1">
              <p className="font-semibold">اطلاعات رزرو</p>
              <p>کد رزرو: {payment.reservation.code}</p>
              <p>تاریخ: {payment.reservation.date}</p>
              <p>ساعت: {payment.reservation.time.slice(0, 5)}</p>
              <p>تعداد مهمان: {payment.reservation.partySize} نفر</p>
            </div>
          )}
          <div className="text-center p-4 mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <p className="font-bold">رزرو شما ثبت گردید</p>
            <p className="text-sm mt-1">منتظر تأیید کارکنان بمانید. کد رزرو: {payment.reservation?.code}</p>
          </div>
        </div>
      )}

      <Link href="/reserve" className="block text-center text-amber-400 hover:text-amber-300">رزرو جدید</Link>
    </div>
  );
}