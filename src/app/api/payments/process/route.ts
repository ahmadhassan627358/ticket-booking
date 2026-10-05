import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments";
import { normalizePakPhone } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * POST /api/payments/process
 * Processes payment for an existing unpaid booking or retry.
 */
export async function POST(req: Request) {
  try {
    const rateLimit = checkRateLimit(req, { limit: 30, windowMs: 60000, keyPrefix: "payment_process" });
    if (!rateLimit.success && rateLimit.errorResponse) {
      return rateLimit.errorResponse;
    }

    const body = await req.json();
    const { pnr, method, metadata } = body;

    if (!pnr || typeof pnr !== "string") {
      return NextResponse.json({ error: "Booking PNR is required." }, { status: 400 });
    }

    if (!method || typeof method !== "string") {
      return NextResponse.json({ error: "Payment method is required (e.g. EASYPAISA, JAZZCASH, STRIPE, MOCK_ONLINE, CASH)." }, { status: 400 });
    }

    // Find booking
    const booking = await prisma.booking.findUnique({
      where: { pnr: pnr.trim().toUpperCase() },
      include: {
        trip: {
          include: { route: true, bus: true },
        },
        user: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found with the specified PNR." }, { status: 404 });
    }

    if (booking.status === "CANCELLED" || booking.status === "EXPIRED") {
      return NextResponse.json({ error: `Cannot process payment. Booking is ${booking.status.toLowerCase()}.` }, { status: 400 });
    }

    if (booking.paymentStatus === "PAID") {
      return NextResponse.json({
        success: true,
        message: "This booking is already fully paid.",
        pnr: booking.pnr,
        status: "CONFIRMED",
        paymentStatus: "PAID",
      });
    }

    // Resolve provider
    const provider = getPaymentProvider(method);

    const paymentResult = await provider.processPayment({
      pnr: booking.pnr,
      amount: booking.totalAmount,
      method: method.toUpperCase(),
      contactPhone: booking.contactPhone,
      contactEmail: booking.user?.email || undefined,
      metadata: metadata || {},
    });

    if (!paymentResult.success) {
      // Record failed payment attempt
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          method: method.toUpperCase(),
          amount: booking.totalAmount,
          status: "FAILED",
          transactionRef: paymentResult.transactionRef,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: paymentResult.message,
          errorCode: paymentResult.error,
          transactionRef: paymentResult.transactionRef,
        },
        { status: 402 }
      );
    }

    // Success! Update booking atomically
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          bookingId: booking.id,
          method: method.toUpperCase(),
          amount: booking.totalAmount,
          status: "SUCCESS",
          transactionRef: paymentResult.transactionRef,
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
      message: paymentResult.message,
      pnr: booking.pnr,
      transactionRef: paymentResult.transactionRef,
      bookingStatus: "CONFIRMED",
      paymentStatus: "PAID",
      amountPaid: booking.totalAmount,
    });
  } catch (error: any) {
    console.error("Payment processing error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error while processing payment." },
      { status: 500 }
    );
  }
}
