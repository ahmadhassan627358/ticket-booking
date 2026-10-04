import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const tripId = params.id;

    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: {
          route: true,
          bus: true,
          bookings: {
            include: {
              payments: true,
              seats: true,
            },
          },
        },
      });

      if (!trip) {
        throw new Error("NOT_FOUND: Trip not found.");
      }

      if (trip.status === "CANCELLED") {
        throw new Error("ALREADY_CANCELLED: This trip is already cancelled.");
      }

      // 1. Update Trip status to CANCELLED
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: { status: "CANCELLED" },
      });

      let totalRefundAmount = 0;
      let cancelledBookingsCount = 0;

      // 2. Process full refund for all bookings of this trip
      for (const booking of trip.bookings) {
        if (booking.status !== "CANCELLED" && booking.status !== "EXPIRED") {
          cancelledBookingsCount++;
          const wasPaid = booking.paymentStatus === "PAID";
          const refundAmount = wasPaid ? booking.totalAmount : 0;
          totalRefundAmount += refundAmount;

          // Update booking status
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              status: "CANCELLED",
              paymentStatus: wasPaid ? "REFUNDED" : "UNPAID",
            },
          });

          // Create refund payment record if paid
          if (wasPaid && refundAmount > 0) {
            await tx.payment.create({
              data: {
                bookingId: booking.id,
                method: booking.payments[0]?.method || "ADMIN_REFUND",
                amount: refundAmount,
                status: "REFUNDED",
                transactionRef: `TRIP-CXL-REF-${booking.pnr}-${Date.now().toString().slice(-6)}`,
              },
            });
          }
        }
      }

      // 3. Delete all booking seats & active locks for this trip to free up capacity
      await tx.bookingSeat.deleteMany({
        where: { tripId },
      });

      await tx.seatLock.deleteMany({
        where: { tripId },
      });

      return {
        trip: updatedTrip,
        cancelledBookingsCount,
        totalRefundAmount,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Trip cancelled successfully. ${result.cancelledBookingsCount} booking(s) cancelled with 100% full refund (Rs. ${result.totalRefundAmount.toLocaleString()}).`,
      tripId: result.trip.id,
      cancelledBookingsCount: result.cancelledBookingsCount,
      totalRefundAmount: result.totalRefundAmount,
    });
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : "Trip cancellation failed";
    console.error("Trip cancellation error:", rawMessage);

    if (rawMessage.startsWith("NOT_FOUND:")) {
      return NextResponse.json({ error: rawMessage.replace("NOT_FOUND: ", "") }, { status: 404 });
    }

    if (rawMessage.startsWith("ALREADY_CANCELLED:")) {
      return NextResponse.json({ error: rawMessage.replace("ALREADY_CANCELLED: ", "") }, { status: 400 });
    }

    return NextResponse.json({ error: rawMessage || "Internal server error" }, { status: 500 });
  }
}
