import { PaymentFailedClient } from "./payment-failed-client";

export const dynamic = "force-dynamic";

export default function PaymentFailedPage({ searchParams }: { searchParams: Promise<{ paymentId?: string; reservationId?: string }> }) {
  return <PaymentFailedClient initialSearchParams={searchParams} />;
}