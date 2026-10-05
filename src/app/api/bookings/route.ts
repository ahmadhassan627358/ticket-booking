import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CreateBookingRequestSchema, normalizePakPhone, normalizePakCNIC } from "@/lib/validations";
import { getPaymentProvider } from "@/lib/payments";
import { generateUniquePNR } from "@/lib/pnr";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    // 0. Rate limiting (60 requests per minute per IP)
    const rateLimit = checkRateLimit(req, { limit: 60, windowMs: 60000, keyPrefix: "booking_create" });
    if (!rateLimit.success && rateLimit.errorResponse) {
      return rateLimit.errorResponse;
    }

    const session = await getServerSession(authOptions);
    const body = await req.json();

    // 1. Zod Validation
    const validation = CreateBookingRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid booking details",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      tripId,
      fromStopId,
      toStopId,
      sessionId,
      contactPhone,
      contactEmail,
      paymentMethod,
      paymentMetadata,
      passengers,
    } = validation.data;

    // Normalize phone and passenger CNICs
    const normPhone = normalizePakPhone(contactPhone);
    const formattedContactPhone = normPhone ? normPhone.standard : contactPhone.trim();

    const normalizedPassengers = passengers.map((p) => {
      const formattedCnic = normalizePakCNIC(p.cnic) || p.cnic.trim();
      return {
        ...p,
        cnic: formattedCnic,
        passengerName: p.passengerName.trim(),
      };
    });

    const seatNumbers = passengers.map((p) => p.seatNo);
    const now = new Date();

    // 2. Interactive Prisma Transaction for Atomic Verification & Creation
    const bookingResult = await prisma.$transaction(async (tx) => {
      // Step A: Clean expired locks
      await tx.seatLock.deleteMany({
        where: {
          lockedUntil: { lte: now },
        },
      });

      // Step B: Verify Trip and Stops
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: {
          bus: true,
          route: {
            include: {
              stops: { orderBy: { stopOrder: "asc" } },
            },
          },
          bookingSeats: {
            where: {
              seatNo: { in: seatNumbers },
              booking: {
                status: { in: ["CONFIRMED", "PENDING"] },
              },
            },
            include: {
              fromStop: true,
              toStop: true,
            },
          },
        },
      });

      if (!trip) {
        throw new Error("TRIP_NOT_FOUND: Trip not found or no longer scheduled.");
      }

      const fromStop = trip.route.stops.find((s) => s.id === fromStopId);
      const toStop = trip.route.stops.find((s) => s.id === toStopId);

      if (!fromStop || !toStop) {
        throw new Error("INVALID_STOPS: Selected origin or destination stop is invalid.");
      }

      const userFromOrder = fromStop.stopOrder;
      const userToOrder = toStop.stopOrder;
      const direction = trip.direction;

      // Step C: Verify Seat Locks belong to THIS session
      const validLocks = await tx.seatLock.findMany({
        where: {
          tripId,
          sessionId,
          seatNo: { in: seatNumbers },
          lockedUntil: { gt: now },
        },
      });

      if (validLocks.length !== seatNumbers.length) {
        const lockedSeatNos = new Set(validLocks.map((l) => l.seatNo));
        const missingSeats = seatNumbers.filter((s) => !lockedSeatNos.has(s));
        throw new Error(
          `LOCKS_EXPIRED: Your seat reservation hold for seat(s) ${missingSeats.join(
            ", "
          )} has expired or was not secured. Please select your seats again.`
        );
      }

      // Step D: Verify No Segment Overlap Double Booking
      for (const bs of trip.bookingSeats) {
        const bookedFromOrder = bs.fromStop.stopOrder;
        const bookedToOrder = bs.toStop.stopOrder;

        let overlaps = false;
        if (direction === "FORWARD") {
          overlaps = Math.max(bookedFromOrder, userFromOrder) < Math.min(bookedToOrder, userToOrder);
        } else {
          overlaps = Math.min(bookedFromOrder, userFromOrder) > Math.max(bookedToOrder, userToOrder);
        }

        if (overlaps) {
          throw new Error(
            `SEAT_ALREADY_BOOKED: Seat ${bs.seatNo} was booked by another passenger for an overlapping leg.`
          );
        }
      }

      // Step E: Calculate Fares
      const segmentFare = Math.abs(fromStop.fareFromOrigin - toStop.fareFromOrigin);
      const totalAmount = segmentFare * passengers.length;

      // Step F: Generate Unique 8-Character PNR
      const pnr = await generateUniquePNR(tx);

      // Step G: Process Payment via Abstraction Layer
      const provider = getPaymentProvider(paymentMethod);
      const paymentResult = await provider.processPayment({
        pnr,
        amount: totalAmount,
        method: paymentMethod,
        contactPhone: formattedContactPhone,
        contactEmail,
        metadata: paymentMetadata,
      });

      if (!paymentResult.success) {
        throw new Error(`PAYMENT_FAILED: ${paymentResult.error || paymentResult.message}`);
      }

      // Step H: Create Booking Record
      const booking = await tx.booking.create({
        data: {
          pnr,
          userId: session?.user?.id || null,
          tripId: trip.id,
          totalAmount,
          status: paymentResult.status === "SUCCESS" ? "CONFIRMED" : "PENDING",
          paymentStatus: paymentResult.status === "SUCCESS" ? "PAID" : "UNPAID",
          contactPhone: formattedContactPhone,
          seats: {
            create: normalizedPassengers.map((p) => ({
              tripId: trip.id,
              seatNo: p.seatNo,
              passengerName: p.passengerName,
              cnic: p.cnic,
              gender: p.gender,
              fromStopId: fromStop.id,
              toStopId: toStop.id,
              fare: segmentFare,
            })),
          },
          payments: {
            create: {
              method: paymentMethod,
              amount: totalAmount,
              status: paymentResult.status,
              transactionRef: paymentResult.transactionRef,
            },
          },
        },
        include: {
          seats: true,
          payments: true,
        },
      });

      // Step I: Delete Seat Locks for this session now that booking is complete
      await tx.seatLock.deleteMany({
        where: {
          tripId,
          sessionId,
        },
      });

      return {
        booking,
        paymentResult,
      };
    }, {
      maxWait: 10000,
      timeout: 25000,
    });

    return NextResponse.json({
      success: true,
      message: "Ticket booking confirmed successfully!",
      pnr: bookingResult.booking.pnr,
      bookingId: bookingResult.booking.id,
      status: bookingResult.booking.status,
      paymentStatus: bookingResult.booking.paymentStatus,
      totalAmount: bookingResult.booking.totalAmount,
      transactionRef: bookingResult.paymentResult.transactionRef,
    });
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : "Booking creation failed";
    console.error("Booking creation error:", rawMessage);

    if (rawMessage.startsWith("PAYMENT_FAILED:")) {
      return NextResponse.json(
        { error: rawMessage.replace("PAYMENT_FAILED: ", ""), code: "PAYMENT_FAILED" },
        { status: 402 }
      );
    }

    if (rawMessage.startsWith("LOCKS_EXPIRED:")) {
      return NextResponse.json(
        { error: rawMessage.replace("LOCKS_EXPIRED: ", ""), code: "LOCKS_EXPIRED" },
        { status: 410 }
      );
    }

    if (rawMessage.startsWith("SEAT_ALREADY_BOOKED:")) {
      return NextResponse.json(
        { error: rawMessage.replace("SEAT_ALREADY_BOOKED: ", ""), code: "SEAT_ALREADY_BOOKED" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: rawMessage || "Internal server error while processing booking" },
      { status: 500 }
    );
  }
}
