import { PaymentClient } from "./payment-client";

export const dynamic = "force-dynamic";

export default function PaymentPage({ searchParams }: { searchParams: Promise<{ paymentId?: string; reservationId?: string }> }) {
  return <PaymentClient initialSearchParams={searchParams} />;
}