import { db } from "@/lib/db";
import { payments, reservations, restaurantSettings } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

const ZARINPAL_MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID!;
const ZARINPAL_SANDBOX = process.env.ZARINPAL_SANDBOX !== "false";
const BASE_URL = ZARINPAL_SANDBOX
  ? "https://sandbox.zarinpal.com/pg/rest/WebPayment"
  : "https://zarinpal.com/pg/rest/WebPayment";

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

  async createPayment(reservationId: string, userId?: string) {
    const [reservation] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1);

    if (!reservation) throw new Error("رزرو پیدا نشد");

    const settings = await this.getDepositSettings(reservation.restaurantId);
    if (!settings || !settings.depositEnabled || settings.depositAmount <= 0) {
      throw new Error("دریافت بیعانه غیرفعال است");
    }

    const existingActivePayment = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.reservationId, reservationId),
          eq(payments.status, "PENDING"),
        ),
      )
      .limit(1);

    if (existingActivePayment.length > 0) {
      return existingActivePayment[0];
    }

    const amount = settings.depositAmount;
    const description = `بیعانه رزرو ${reservation.code}`;
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback`;

    const body = {
      MerchantID: ZARINPAL_MERCHANT_ID,
      Amount: amount,
      CallbackURL: callbackUrl,
      Description: description,
    };

    const res = await fetch(`${BASE_URL}/Request.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data: ZarinPalRequestResponse = await res.json();

    if (data.status !== 100 || !data.authority) {
      throw new Error(data.error?.message ?? "خطا در درخواست پرداخت");
    }

    const [payment] = await db
      .insert(payments)
      .values({
        reservationId,
        amount,
        currency: "IRT",
        status: "PENDING",
        authority: data.authority,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return payment;
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

    const body = {
      MerchantID: ZARINPAL_MERCHANT_ID,
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
      .orderBy(payments.createdAt)
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
