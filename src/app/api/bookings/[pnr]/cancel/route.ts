import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateRefundPolicy } from "@/lib/refundPolicy";

// GET: Preview refund details before confirming cancellation
export async function GET(
  req: Request,
  { params }: { params: { pnr: string } }
) {
  try {
    const pnr = params.pnr?.toUpperCase().trim();
    if (!pnr) {
      return NextResponse.json({ error: "PNR is required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { pnr },
      include: {
        trip: true,
        seats: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This booking is already cancelled.", status: booking.status },
        { status: 400 }
      );
    }

    const refundInfo = calculateRefundPolicy(
      new Date(booking.trip.departureTime),
      booking.totalAmount,
      booking.paymentStatus
    );

    return NextResponse.json({
      success: true,
      pnr: booking.pnr,
      totalAmount: booking.totalAmount,
      paymentStatus: booking.paymentStatus,
      departureTime: booking.trip.departureTime,
      ...refundInfo,
    });
  } catch (error: unknown) {
    console.error("Error previewing cancellation:", error);
    return NextResponse.json(
      { error: "Failed to calculate refund details" },
      { status: 500 }
    );
  }
}

// POST: Execute atomic cancellation and seat release
export async function POST(
  req: Request,
  { params }: { params: { pnr: string } }
) {
  try {
    const pnr = params.pnr?.toUpperCase().trim();
    if (!pnr) {
      return NextResponse.json({ error: "PNR is required" }, { status: 400 });
    }

    const now = new Date();

    const cancellationResult = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { pnr },
        include: {
          trip: true,
          seats: true,
          payments: true,
        },
      });

      if (!booking) {
        throw new Error("NOT_FOUND: Booking not found.");
      }

      if (booking.status === "CANCELLED") {
        throw new Error("ALREADY_CANCELLED: This booking has already been cancelled.");
      }

      if (booking.status === "COMPLETED") {
        throw new Error("TRIP_COMPLETED: Cannot cancel a completed journey.");
      }

      if (booking.status === "EXPIRED") {
        throw new Error("BOOKING_EXPIRED: This reservation has already expired.");
      }

      const refundPolicy = calculateRefundPolicy(
        new Date(booking.trip.departureTime),
        booking.totalAmount,
        booking.paymentStatus,
        now
      );

      if (!refundPolicy.isAllowed) {
        throw new Error(`NOT_ALLOWED: ${refundPolicy.message || "Cancellation is not allowed after departure."}`);
      }

      const wasPaid = booking.paymentStatus === "PAID";
      const refundAmount = wasPaid ? refundPolicy.refundAmount : 0;
      const newPaymentStatus = wasPaid ? "REFUNDED" : "UNPAID";

      // 1. Delete BookingSeats to instantly free up seats for future searches & bookings
      await tx.bookingSeat.deleteMany({
        where: { bookingId: booking.id },
      });

      // 2. If payment was paid, create a refund record in Payment table
      if (wasPaid && refundAmount > 0) {
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            method: booking.payments[0]?.method || "ONLINE",
            amount: refundAmount,
            status: "REFUNDED",
            transactionRef: `REF-${booking.pnr}-${Date.now().toString().slice(-6)}`,
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
        refundPolicy,
        refundAmount,
        releasedSeatsCount: booking.seats.length,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully. Seats have been released.",
      pnr: cancellationResult.booking.pnr,
      status: cancellationResult.booking.status,
      paymentStatus: cancellationResult.booking.paymentStatus,
      refundPercentage: cancellationResult.refundPolicy.refundPercentage,
      refundAmount: cancellationResult.refundAmount,
      tierDescription: cancellationResult.refundPolicy.tierDescription,
      releasedSeatsCount: cancellationResult.releasedSeatsCount,
    });
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : "Cancellation failed";
    console.error("Cancellation error:", rawMessage);

    if (rawMessage.startsWith("NOT_FOUND:")) {
      return NextResponse.json({ error: rawMessage.replace("NOT_FOUND: ", "") }, { status: 404 });
    }

    if (rawMessage.startsWith("ALREADY_CANCELLED:") || rawMessage.startsWith("NOT_ALLOWED:") || rawMessage.startsWith("TRIP_COMPLETED:")) {
      return NextResponse.json(
        { error: rawMessage.replace(/^[^:]+:\s*/, "") },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: rawMessage || "Internal server error while processing cancellation" },
      { status: 500 }
    );
  }
}
