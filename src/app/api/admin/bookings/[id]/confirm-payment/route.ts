import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

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

    const updatedResult = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          OR: [{ id: bookingId }, { pnr: bookingId.toUpperCase().trim() }],
        },
        include: {
          payments: { orderBy: { createdAt: "desc" } },
        },
      });

      if (!booking) {
        throw new Error("NOT_FOUND: Booking not found.");
      }

      if (booking.status === "CANCELLED") {
        throw new Error("INVALID_STATE: Cannot confirm payment for a cancelled booking.");
      }

      if (booking.paymentStatus === "PAID" && booking.status === "CONFIRMED") {
        return { booking, alreadyPaid: true };
      }

      // Check if there is an existing payment record
      const existingPayment = booking.payments[0];

      if (existingPayment && existingPayment.status !== "SUCCESS") {
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: "SUCCESS",
            amount: booking.totalAmount,
          },
        });
      } else if (!existingPayment) {
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            method: "CASH",
            amount: booking.totalAmount,
            status: "SUCCESS",
            transactionRef: `CASH-ADM-${booking.pnr}-${Date.now().toString().slice(-6)}`,
          },
        });
      }

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          paymentStatus: "PAID",
        },
        include: {
          payments: true,
          seats: true,
          trip: {
            include: {
              bus: true,
              route: true,
            },
          },
        },
      });

      return { booking: updatedBooking, alreadyPaid: false };
    });

    return NextResponse.json({
      success: true,
      message: updatedResult.alreadyPaid
        ? `Booking ${updatedResult.booking.pnr} is already marked as PAID & CONFIRMED.`
        : `Cash payment confirmed successfully for PNR ${updatedResult.booking.pnr}. Ticket status is now CONFIRMED.`,
      booking: updatedResult.booking,
    });
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : "Payment confirmation failed";
    console.error("Admin confirm payment error:", rawMessage);

    if (rawMessage.startsWith("NOT_FOUND:")) {
      return NextResponse.json({ error: rawMessage.replace("NOT_FOUND: ", "") }, { status: 404 });
    }
    if (rawMessage.startsWith("INVALID_STATE:")) {
      return NextResponse.json({ error: rawMessage.replace("INVALID_STATE: ", "") }, { status: 400 });
    }

    return NextResponse.json(
      { error: rawMessage || "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
