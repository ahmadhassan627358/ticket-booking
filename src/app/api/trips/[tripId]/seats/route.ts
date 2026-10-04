import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdjacentSeatNo, generateBusSeatGrid } from "@/lib/busLayout";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { tripId: string } }
) {
  try {
    const { tripId } = params;
    const { searchParams } = new URL(req.url);
    const fromCity = searchParams.get("from") || "";
    const toCity = searchParams.get("to") || "";
    const sessionId = searchParams.get("sessionId") || "";

    const now = new Date();

    // 1. Cleanup expired locks automatically
    await prisma.seatLock.deleteMany({
      where: {
        lockedUntil: { lte: now },
      },
    });

    // 2. Fetch Trip with Route, Stops, Bus, Bookings, and SeatLocks
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bus: true,
        route: {
          include: {
            stops: {
              include: { city: true },
              orderBy: { stopOrder: "asc" },
            },
          },
        },
        bookingSeats: {
          where: {
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
            lockedUntil: { gt: now },
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // 3. Resolve From and To RouteStops
    let fromStop = trip.route.stops.find(
      (s) => s.city.name.toLowerCase() === fromCity.toLowerCase() || s.cityId === fromCity
    );
    let toStop = trip.route.stops.find(
      (s) => s.city.name.toLowerCase() === toCity.toLowerCase() || s.cityId === toCity
    );

    // Default to route terminal stops if not specified
    if (!fromStop || !toStop) {
      if (trip.direction === "FORWARD") {
        fromStop = trip.route.stops[0];
        toStop = trip.route.stops[trip.route.stops.length - 1];
      } else {
        fromStop = trip.route.stops[trip.route.stops.length - 1];
        toStop = trip.route.stops[0];
      }
    }

    const fare = Math.abs(fromStop.fareFromOrigin - toStop.fareFromOrigin);
    const userFromOrder = fromStop.stopOrder;
    const userToOrder = toStop.stopOrder;
    const direction = trip.direction;

    // 4. Determine Status & Booked Gender for Each Seat on Overlapping Segments
    interface SeatState {
      seatNo: number;
      status: "AVAILABLE" | "BOOKED_MALE" | "BOOKED_FEMALE" | "LOCKED_BY_OTHER" | "LOCKED_BY_ME";
      passengerGender?: "MALE" | "FEMALE";
      lockedUntil?: string;
      adjacentSeatNo: number | null;
      genderRestriction?: "FEMALE_ONLY" | null;
    }

    const seatMap: Record<number, SeatState> = {};
    const totalSeats = trip.bus.totalSeats;
    const layout = trip.bus.layout;

    // Initialize all seats as AVAILABLE
    for (let s = 1; s <= totalSeats; s++) {
      seatMap[s] = {
        seatNo: s,
        status: "AVAILABLE",
        adjacentSeatNo: getAdjacentSeatNo(s, layout),
        genderRestriction: null,
      };
    }

    // Mark booked seats that overlap with the requested segment
    for (const bs of trip.bookingSeats) {
      const bookedFromOrder = bs.fromStop.stopOrder;
      const bookedToOrder = bs.toStop.stopOrder;

      let overlaps = false;
      if (direction === "FORWARD") {
        overlaps = Math.max(bookedFromOrder, userFromOrder) < Math.min(bookedToOrder, userToOrder);
      } else {
        overlaps = Math.min(bookedFromOrder, userFromOrder) > Math.max(bookedToOrder, userToOrder);
      }

      if (overlaps && seatMap[bs.seatNo]) {
        const isFemale = bs.gender === "FEMALE";
        seatMap[bs.seatNo].status = isFemale ? "BOOKED_FEMALE" : "BOOKED_MALE";
        seatMap[bs.seatNo].passengerGender = isFemale ? "FEMALE" : "MALE";
      }
    }

    // Mark locked seats
    for (const lock of trip.seatLocks) {
      if (seatMap[lock.seatNo] && seatMap[lock.seatNo].status === "AVAILABLE") {
        if (sessionId && lock.sessionId === sessionId) {
          seatMap[lock.seatNo].status = "LOCKED_BY_ME";
          seatMap[lock.seatNo].lockedUntil = lock.lockedUntil.toISOString();
        } else {
          seatMap[lock.seatNo].status = "LOCKED_BY_OTHER";
          seatMap[lock.seatNo].lockedUntil = lock.lockedUntil.toISOString();
        }
      }
    }

    // 5. Compute Gender Rule Restrictions
    // If an adjacent seat on the same row/side is booked by a FEMALE on an overlapping segment,
    // the available seat is restricted to FEMALE_ONLY!
    for (let s = 1; s <= totalSeats; s++) {
      const current = seatMap[s];
      if (current.status === "AVAILABLE" && current.adjacentSeatNo) {
        const adjacent = seatMap[current.adjacentSeatNo];
        if (adjacent && adjacent.status === "BOOKED_FEMALE") {
          current.genderRestriction = "FEMALE_ONLY";
        }
      }
    }

    const { rows } = generateBusSeatGrid(totalSeats, layout);

    return NextResponse.json({
      trip: {
        id: trip.id,
        routeId: trip.routeId,
        routeName: trip.route.name,
        direction: trip.direction,
        departureTime: trip.departureTime,
        fare,
        fromStop: {
          id: fromStop.id,
          cityId: fromStop.cityId,
          cityName: fromStop.city.name,
          stopOrder: fromStop.stopOrder,
        },
        toStop: {
          id: toStop.id,
          cityId: toStop.cityId,
          cityName: toStop.city.name,
          stopOrder: toStop.stopOrder,
        },
        bus: {
          id: trip.bus.id,
          number: trip.bus.number,
          type: trip.bus.type,
          layout: trip.bus.layout,
          totalSeats: trip.bus.totalSeats,
        },
      },
      seatMap: Object.values(seatMap),
      grid: { rows },
    });
  } catch (error: unknown) {
    console.error("Trip seats API error:", error);
    return NextResponse.json({ error: "Internal server error fetching trip seats" }, { status: 500 });
  }
}
