import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST /api/payments/webhook
 * Handles Webhook callbacks & Instant Payment Notifications (IPN)
 * from JazzCash, Easypaisa, and Stripe.
 */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider")?.toUpperCase() || "GENERIC";

    const payload = await req.json().catch(() => ({}));
    console.log(`[Webhook Received] Provider: ${provider}`, payload);

    // 1. Extract transaction details based on provider format
    let pnr = payload.pnr || payload.pp_BillReference || payload.orderId || payload.data?.object?.metadata?.pnr;
    let transactionRef = payload.transactionRef || payload.pp_TxnRefNo || payload.transaction_id || payload.data?.object?.id;
    let status = payload.status || payload.pp_ResponseCode === "000" ? "SUCCESS" : payload.type === "payment_intent.succeeded" ? "SUCCESS" : "PENDING";
    let amount = Number(payload.amount || payload.pp_Amount || payload.data?.object?.amount_received || 0);

    if (!pnr) {
      return NextResponse.json({ error: "Missing booking PNR reference in webhook payload." }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { pnr: pnr.trim().toUpperCase() },
    });

    if (!booking) {
      return NextResponse.json({ error: `Booking ${pnr} not found.` }, { status: 404 });
    }

    if (status === "SUCCESS" && booking.paymentStatus !== "PAID") {
      await prisma.$transaction([
        prisma.payment.create({
          data: {
            bookingId: booking.id,
            method: provider,
            amount: booking.totalAmount,
            status: "SUCCESS",
            transactionRef: transactionRef || `WH-${provider}-${Date.now()}`,
          },
        }),
        prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: "CONFIRMED",
            paymentStatus: "PAID",
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Booking ${pnr} confirmed via webhook.`,
      });
    }

    return NextResponse.json({
      received: true,
      provider,
      status,
      pnr,
    });
  } catch (error: any) {
    console.error("Webhook handling error:", error);
    return NextResponse.json({ error: error?.message || "Webhook processing error" }, { status: 500 });
  }
}
