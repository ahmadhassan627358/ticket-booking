import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAdjacentSeatNo } from "@/lib/busLayout";
import { checkRateLimit } from "@/lib/rateLimit";

const LockSeatRequestSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
  fromStopId: z.string().min(1, "Origin stop ID is required"),
  toStopId: z.string().min(1, "Destination stop ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  seats: z
    .array(
      z.object({
        seatNo: z.number().int().positive(),
        gender: z.enum(["MALE", "FEMALE"]),
      })
    )
    .min(1, "At least one seat must be selected")
    .max(4, "You can select up to 4 seats per booking"),
});

export async function POST(req: Request) {
  try {
    // Rate limit seat locking (100 per minute per IP)
    const rateLimit = checkRateLimit(req, { limit: 100, windowMs: 60000, keyPrefix: "seats_lock" });
    if (!rateLimit.success && rateLimit.errorResponse) {
      return rateLimit.errorResponse;
    }

    const body = await req.json();

    // 1. Zod Validation
    const validation = LockSeatRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid seat lock request", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { tripId, fromStopId, toStopId, sessionId, seats } = validation.data;
    const seatNumbers = seats.map((s) => s.seatNo);
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

    // 2. Execute within an interactive database transaction to ensure atomicity & eliminate race conditions
    const lockResult = await prisma.$transaction(async (tx) => {
      // Step A: Clean up all expired locks first
      await tx.seatLock.deleteMany({
        where: {
          lockedUntil: { lte: now },
        },
      });

      // Step B: Fetch Trip details and existing reservations
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
          seatLocks: {
            where: {
              seatNo: { in: seatNumbers },
              lockedUntil: { gt: now },
            },
          },
        },
      });

      if (!trip) {
        throw new Error("TRIP_NOT_FOUND");
      }

      const fromStop = trip.route.stops.find((s) => s.id === fromStopId);
      const toStop = trip.route.stops.find((s) => s.id === toStopId);

      if (!fromStop || !toStop) {
        throw new Error("INVALID_STOPS");
      }

      const userFromOrder = fromStop.stopOrder;
      const userToOrder = toStop.stopOrder;
      const direction = trip.direction;

      // Step C: Check if any requested seat is already booked on an overlapping segment
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
          throw new Error(`SEAT_ALREADY_BOOKED: Seat ${bs.seatNo} is already booked on this segment.`);
        }
      }

      // Step D: Check if any requested seat is locked by ANOTHER session
      for (const lock of trip.seatLocks) {
        if (lock.sessionId !== sessionId) {
          throw new Error(`SEAT_LOCKED_BY_ANOTHER: Seat ${lock.seatNo} is currently held by another customer.`);
        }
      }

      // Step E: Server-side Gender Rule Enforcement
      // Check adjacent seats for each requested seat
      const layout = trip.bus.layout;
      const requestedGenderMap = new Map<number, "MALE" | "FEMALE">();
      for (const s of seats) {
        requestedGenderMap.set(s.seatNo, s.gender);
      }

      for (const candidate of seats) {
        const adjacentNo = getAdjacentSeatNo(candidate.seatNo, layout);
        if (!adjacentNo) continue;

        // If candidate is MALE:
        if (candidate.gender === "MALE") {
          // Check 1: Is adjacent seat in the SAME booking selected as FEMALE?
          if (requestedGenderMap.has(adjacentNo)) {
            // Same booking: Allowed (e.g. husband and wife / family travelling together)
          } else {
            // Check 2: Is adjacent seat booked by a FEMALE in existing bookings on overlapping segment?
            const adjacentBookings = await tx.bookingSeat.findMany({
              where: {
                tripId,
                seatNo: adjacentNo,
                booking: { status: { in: ["CONFIRMED", "PENDING"] } },
              },
              include: { fromStop: true, toStop: true },
            });

            for (const ab of adjacentBookings) {
              let adjOverlaps = false;
              if (direction === "FORWARD") {
                adjOverlaps = Math.max(ab.fromStop.stopOrder, userFromOrder) < Math.min(ab.toStop.stopOrder, userToOrder);
              } else {
                adjOverlaps = Math.min(ab.fromStop.stopOrder, userFromOrder) > Math.max(ab.toStop.stopOrder, userToOrder);
              }

              if (adjOverlaps && ab.gender === "FEMALE") {
                throw new Error(`GENDER_RULE_VIOLATION: Seat ${candidate.seatNo} is adjacent to a female passenger on Seat ${adjacentNo} and cannot be selected by a male.`);
              }
            }
          }
        }
      }

      // Step F: Release previous locks for this sessionId on this trip
      await tx.seatLock.deleteMany({
        where: {
          tripId,
          sessionId,
        },
      });

      // Step G: Create new SeatLock entries
      const createdLocks = [];
      for (const s of seats) {
        const lock = await tx.seatLock.create({
          data: {
            tripId,
            seatNo: s.seatNo,
            sessionId,
            lockedUntil,
          },
        });
        createdLocks.push(lock);
      }

      return {
        lockedSeats: seats,
        lockedUntil: lockedUntil.toISOString(),
        secondsRemaining: 600,
      };
    }, {
      maxWait: 10000,
      timeout: 25000,
    });

    return NextResponse.json({
      success: true,
      message: "Seats successfully reserved for 10 minutes",
      ...lockResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to lock seats";
    console.error("Seat lock error:", message);

    if (message.startsWith("SEAT_ALREADY_BOOKED") || message.startsWith("SEAT_LOCKED_BY_ANOTHER")) {
      return NextResponse.json({ error: message.split(": ")[1] || message }, { status: 409 });
    }

    if (message.startsWith("GENDER_RULE_VIOLATION")) {
      return NextResponse.json({ error: message.split(": ")[1] || message }, { status: 400 });
    }

    if (message === "TRIP_NOT_FOUND" || message === "INVALID_STOPS") {
      return NextResponse.json({ error: "Trip or stops not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Internal server error reserving seats" }, { status: 500 });
  }
}
