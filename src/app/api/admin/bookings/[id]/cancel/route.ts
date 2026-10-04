import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { calculateRefundPolicy } from "@/lib/refundPolicy";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    let requestBody: {
      refundAmount?: number;
      refundPercentage?: number;
      reason?: string;
      fullRefund?: boolean;
    } = {};

    try {
      requestBody = await req.json();
    } catch {
      // Body is optional
    }

    const cancellationResult = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          OR: [{ id: bookingId }, { pnr: bookingId.toUpperCase().trim() }],
        },
        include: {
          trip: true,
          seats: true,
          payments: { orderBy: { createdAt: "desc" } },
        },
      });

      if (!booking) {
        throw new Error("NOT_FOUND: Booking not found.");
      }

      if (booking.status === "CANCELLED") {
        throw new Error("ALREADY_CANCELLED: This booking is already cancelled.");
      }

      const wasPaid = booking.paymentStatus === "PAID";
      let refundAmount = 0;
      let refundPercentage = 100;

      if (wasPaid) {
        if (requestBody.fullRefund || requestBody.refundPercentage === 100) {
          refundPercentage = 100;
          refundAmount = booking.totalAmount;
        } else if (typeof requestBody.refundAmount === "number") {
          refundAmount = Math.max(0, Math.min(booking.totalAmount, requestBody.refundAmount));
          refundPercentage = Math.round((refundAmount / booking.totalAmount) * 100);
        } else if (typeof requestBody.refundPercentage === "number") {
          refundPercentage = Math.max(0, Math.min(100, requestBody.refundPercentage));
          refundAmount = Math.round((booking.totalAmount * refundPercentage) / 100);
        } else {
          // Standard policy calculation or fallback to 100%
          const policy = calculateRefundPolicy(
            new Date(booking.trip.departureTime),
            booking.totalAmount,
            booking.paymentStatus
          );
          refundAmount = policy.refundAmount;
          refundPercentage = policy.refundPercentage;
        }
      }

      const newPaymentStatus = wasPaid ? "REFUNDED" : "UNPAID";

      // 1. Delete BookingSeats to instantly release the seats on the trip
      await tx.bookingSeat.deleteMany({
        where: { bookingId: booking.id },
      });

      // 2. If payment was paid and refundAmount > 0, create refund payment log
      if (wasPaid && refundAmount > 0) {
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            method: booking.payments[0]?.method || "ADMIN_REFUND",
            amount: refundAmount,
            status: "REFUNDED",
            transactionRef: `REF-ADM-${booking.pnr}-${Date.now().toString().slice(-6)}`,
          },
        });
      }

      // 3. Update Booking status to CANCELLED
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          paymentStatus: newPaymentStatus,
        },
      });

      return {
        booking: updatedBooking,
        refundAmount,
        refundPercentage,
        releasedSeatsCount: booking.seats.length,
        wasPaid,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Booking ${cancellationResult.booking.pnr} has been cancelled successfully.${
        cancellationResult.wasPaid ? ` Refund of Rs. ${cancellationResult.refundAmount} (${cancellationResult.refundPercentage}%) issued.` : ""
      }`,
      pnr: cancellationResult.booking.pnr,
      status: cancellationResult.booking.status,
      paymentStatus: cancellationResult.booking.paymentStatus,
      refundAmount: cancellationResult.refundAmount,
      refundPercentage: cancellationResult.refundPercentage,
      releasedSeatsCount: cancellationResult.releasedSeatsCount,
    });
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : "Cancellation failed";
    console.error("Admin cancel booking error:", rawMessage);

    if (rawMessage.startsWith("NOT_FOUND:")) {
      return NextResponse.json({ error: rawMessage.replace("NOT_FOUND: ", "") }, { status: 404 });
    }
    if (rawMessage.startsWith("ALREADY_CANCELLED:")) {
      return NextResponse.json({ error: rawMessage.replace("ALREADY_CANCELLED: ", "") }, { status: 400 });
    }

    return NextResponse.json(
      { error: rawMessage || "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
