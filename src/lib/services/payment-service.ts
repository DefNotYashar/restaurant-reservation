import { db } from "@/lib/db";
import { payments, reservations, restaurantSettings } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

const ZARINPAL_MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID?.trim();
const ZARINPAL_SANDBOX = process.env.ZARINPAL_SANDBOX?.toLowerCase() !== "false";
const BASE_URL = ZARINPAL_SANDBOX
  ? "https://sandbox.zarinpal.com/pg/rest/WebPayment"
  : "https://zarinpal.com/pg/rest/WebPayment";
const GATEWAY_URL = ZARINPAL_SANDBOX
  ? "https://sandbox.zarinpal.com/pg/StartPay"
  : "https://zarinpal.com/pg/StartPay";

function requireMerchantId() {
  if (!ZARINPAL_MERCHANT_ID || ZARINPAL_MERCHANT_ID === "your_merchant_id_here") {
    throw new Error("ZARINPAL_MERCHANT_ID is not configured");
  }
  return ZARINPAL_MERCHANT_ID;
}

function getCallbackUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  return `${appUrl}/api/payments/callback`;
}

export function getPaymentGatewayUrl(authority: string) {
  return `${GATEWAY_URL}/${authority}`;
}

export interface CreatePaymentRequest {
  reservationId: string;
  description?: string;
}

export interface ZarinPalRequestResponse {
  status: number;
  authority?: string;
  error?: { code: number; message: string };
}

export interface ZarinPalVerificationResponse {
  status: number;
  refId?: string;
  error?: { code: number; message: string };
}

export class PaymentService {
  async getDepositSettings(restaurantId: string) {
    const [settings] = await db
      .select()
      .from(restaurantSettings)
      .where(eq(restaurantSettings.restaurantId, restaurantId));
    return settings;
  }

  async createPayment(reservationId: string) {
    const [reservation] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1);

    if (!reservation) throw new Error("رزرو پیدا نشد");

    const [existingPayment] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.reservationId, reservationId),
          eq(payments.status, "PENDING"),
        ),
      )
      .limit(1);

    if (existingPayment?.authority) return existingPayment;

    const settings = await this.getDepositSettings(reservation.restaurantId);
    if (!settings || !settings.depositEnabled || settings.depositAmount <= 0) {
      throw new Error("دریافت بیعانه غیرفعال است");
    }

    const merchantId = requireMerchantId();
    const callbackUrl = getCallbackUrl();
    const amount = settings.depositAmount;
    const description = `بیعانه رزرو ${reservation.code}`;
    const body = {
      MerchantID: merchantId,
      Amount: amount,
      CallbackURL: callbackUrl,
      Description: description,
    };

    const requestAuthority = async () => {
      try {
        const res = await fetch(`${BASE_URL}/Request.json`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return null;
        const data: ZarinPalRequestResponse = await res.json().catch(() => null);
        return data?.status === 100 && data.authority ? data.authority : null;
      } catch {
        return null;
      }
    };

    if (existingPayment) {
      requireMerchantId();
      const authority = await requestAuthority();
      if (!authority) return existingPayment;
      const [updated] = await db
        .update(payments)
        .set({ authority, updatedAt: new Date() })
        .where(eq(payments.id, existingPayment.id))
        .returning();
      return updated ?? existingPayment;
    }

    const [payment] = await db
      .insert(payments)
      .values({
        reservationId,
        amount,
        currency: "IRT",
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    requireMerchantId();
    const authority = await requestAuthority();
    if (!authority) return payment;

    const [updated] = await db
      .update(payments)
      .set({ authority, updatedAt: new Date() })
      .where(eq(payments.id, payment.id))
      .returning();

    return updated ?? payment;
  }

  async verifyPayment(authority: string) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.authority, authority))
      .limit(1);

    if (!payment) throw new Error("پرداخت یافت نشد");

    if (payment.status === "PAID") {
      return payment;
    }

    requireMerchantId();
    const merchantId = ZARINPAL_MERCHANT_ID as string;
    const body = {
      MerchantID: merchantId,
      Amount: payment.amount,
      Authority: authority,
    };

    const res = await fetch(`${BASE_URL}/Verification.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data: ZarinPalVerificationResponse = await res.json();

    if (data.status !== 100) {
      await db
        .update(payments)
        .set({ status: "FAILED", updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
      throw new Error(data.error?.message ?? "تأیید پرداخت ناموفق");
    }

    const [updated] = await db
      .update(payments)
      .set({
        status: "PAID",
        referenceId: data.refId,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id))
      .returning();

    return updated;
  }

  async getPaymentByReservationId(reservationId: string) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.reservationId, reservationId))
      .orderBy(desc(payments.createdAt))
      .limit(1);
    return payment;
  }

  async getPaymentById(id: string) {
    return db.query.payments.findFirst({
      where: (p) => eq(p.id, id),
      with: { reservation: true },
    });
  }
}

export const paymentService = new PaymentService();
