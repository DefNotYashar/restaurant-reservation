import { PaymentSuccessClient } from "./payment-success-client";

export const dynamic = "force-dynamic";

export default function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ paymentId?: string }> }) {
  return <PaymentSuccessClient initialSearchParams={searchParams} />;
}