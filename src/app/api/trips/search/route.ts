import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SearchQuerySchema = z.object({
  from: z.string().min(1, "Origin city is required"),
  to: z.string().min(1, "Destination city is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  busType: z.enum(["ALL", "BUSINESS", "EXECUTIVE"]).optional().default("ALL"),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawParams = {
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
      date: searchParams.get("date") || "",
      busType: searchParams.get("busType") || "ALL",
    };

    // 1. Validate inputs with Zod
    const validation = SearchQuerySchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid search parameters",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { from, to, date, busType } = validation.data;

    if (from.toLowerCase() === to.toLowerCase()) {
      return NextResponse.json(
        { error: "Origin and destination cities cannot be the same" },
        { status: 400 }
      );
    }

    // 2. Resolve origin and destination City records (by ID or Case-insensitive Name)
    const [originCity, destCity] = await Promise.all([
      prisma.city.findFirst({
        where: {
          OR: [{ id: from }, { name: { equals: from } }],
        },
      }),
      prisma.city.findFirst({
        where: {
          OR: [{ id: to }, { name: { equals: to } }],
        },
      }),
    ]);

    if (!originCity || !destCity) {
      return NextResponse.json(
        { error: `Could not find city: ${!originCity ? from : to}` },
        { status: 404 }
      );
    }

    // 3. Find all routes that contain BOTH cities
    const routes = await prisma.route.findMany({
      include: {
        stops: {
          include: { city: true },
          orderBy: { stopOrder: "asc" },
        },
      },
    });

    type RouteMatch = {
      route: (typeof routes)[0];
      fromStop: (typeof routes)[0]["stops"][0];
      toStop: (typeof routes)[0]["stops"][0];
      direction: "FORWARD" | "REVERSE";
      fare: number;
    };

    const matchingRoutes: RouteMatch[] = [];

    for (const route of routes) {
      const fromStop = route.stops.find((s) => s.cityId === originCity.id);
      const toStop = route.stops.find((s) => s.cityId === destCity.id);

      if (fromStop && toStop) {
        // Stop orders determine the required trip direction
        const direction = fromStop.stopOrder < toStop.stopOrder ? "FORWARD" : "REVERSE";
        const fare = Math.abs(fromStop.fareFromOrigin - toStop.fareFromOrigin);

        matchingRoutes.push({
          route,
          fromStop,
          toStop,
          direction,
          fare,
        });
      }
    }

    if (matchingRoutes.length === 0) {
      return NextResponse.json({
        originCity,
        destCity,
        date,
        totalFound: 0,
        trips: [],
      });
    }

    // 4. Set date range boundaries for the query day [00:00:00 - 23:59:59 local/UTC]
    const [year, month, day] = date.split("-").map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    // Also include a buffer of +- 12 hours for timezones / intermediate stop offsets
    const searchStart = new Date(startOfDay.getTime() - 12 * 60 * 60 * 1000);
    const searchEnd = new Date(endOfDay.getTime() + 12 * 60 * 60 * 1000);

    // 5. Query matching Trips from Database
    const matchedRouteIds = matchingRoutes.map((m) => m.route.id);

    const trips = await prisma.trip.findMany({
      where: {
        routeId: { in: matchedRouteIds },
        departureTime: {
          gte: searchStart,
          lte: searchEnd,
        },
        status: "SCHEDULED",
        ...(busType !== "ALL" ? { bus: { type: busType } } : {}),
      },
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
            lockedUntil: { gt: new Date() },
          },
        },
      },
      orderBy: {
        departureTime: "asc",
      },
    });

    const now = new Date();
    const results = [];

    for (const trip of trips) {
      // Match the specific route configuration for this origin/destination
      const match = matchingRoutes.find(
        (m) => m.route.id === trip.routeId && m.direction === trip.direction
      );

      if (!match) continue;

      const { fromStop, toStop, fare, direction } = match;
      const totalStops = trip.route.stops.length;
      const maxRouteFare = Math.max(...trip.route.stops.map((s) => s.fareFromOrigin), 1);

      // Estimate travel duration: base ~1 hour per 500 Rs fare (minimum 1h 30m)
      const segmentDurationMinutes = Math.max(
        90,
        Math.round((fare / 500) * 60)
      );

      // Estimate offset from route departure to reach fromStop
      let offsetMinutes = 0;
      if (direction === "FORWARD") {
        offsetMinutes = Math.round((fromStop.fareFromOrigin / 500) * 60);
      } else {
        // REVERSE: origin is the last stop
        const lastStop = trip.route.stops[totalStops - 1];
        const reverseDistanceFare = Math.abs(lastStop.fareFromOrigin - fromStop.fareFromOrigin);
        offsetMinutes = Math.round((reverseDistanceFare / 500) * 60);
      }

      const estimatedBoardingTime = new Date(trip.departureTime.getTime() + offsetMinutes * 60 * 1000);
      const estimatedArrivalTime = new Date(estimatedBoardingTime.getTime() + segmentDurationMinutes * 60 * 1000);

      // Filter to ensure boarding date matches requested date
      const boardingDateStr = estimatedBoardingTime.toISOString().split("T")[0];
      // Allow if boarding date matches user date OR trip departure matches
      const tripDateStr = trip.departureTime.toISOString().split("T")[0];
      if (boardingDateStr !== date && tripDateStr !== date) {
        continue;
      }

      // 6. Calculate Seat Availability on Overlapping Segments
      // Requested segment: fromStop.stopOrder -> toStop.stopOrder
      const userFromOrder = fromStop.stopOrder;
      const userToOrder = toStop.stopOrder;

      const occupiedSeatNumbers = new Set<number>();

      // Check booked seats
      for (const bs of trip.bookingSeats) {
        const bookedFromOrder = bs.fromStop.stopOrder;
        const bookedToOrder = bs.toStop.stopOrder;

        let overlaps = false;
        if (direction === "FORWARD") {
          // Both move forward: booked [B_from, B_to], user [U_from, U_to]
          // Overlaps if max(B_from, U_from) < min(B_to, U_to)
          overlaps = Math.max(bookedFromOrder, userFromOrder) < Math.min(bookedToOrder, userToOrder);
        } else {
          // REVERSE direction: stop order decreases (e.g. 4 -> 1)
          // Overlaps if min(B_from, U_from) > max(B_to, U_to)
          overlaps = Math.min(bookedFromOrder, userFromOrder) > Math.max(bookedToOrder, userToOrder);
        }

        if (overlaps) {
          occupiedSeatNumbers.add(bs.seatNo);
        }
      }

      // Check active seat locks
      for (const lock of trip.seatLocks) {
        occupiedSeatNumbers.add(lock.seatNo);
      }

      const totalSeats = trip.bus.totalSeats;
      const availableSeats = Math.max(0, totalSeats - occupiedSeatNumbers.size);

      // Duration formatting
      const hours = Math.floor(segmentDurationMinutes / 60);
      const mins = segmentDurationMinutes % 60;
      const durationFormatted = `${hours}h ${mins > 0 ? `${mins}m` : ""}`.trim();

      results.push({
        id: trip.id,
        routeId: trip.routeId,
        routeName: trip.route.name,
        direction: trip.direction,
        originCity: {
          id: originCity.id,
          name: originCity.name,
          stopId: fromStop.id,
          stopOrder: fromStop.stopOrder,
        },
        destinationCity: {
          id: destCity.id,
          name: destCity.name,
          stopId: toStop.id,
          stopOrder: toStop.stopOrder,
        },
        departureTime: estimatedBoardingTime.toISOString(),
        estimatedArrival: estimatedArrivalTime.toISOString(),
        durationFormatted,
        durationMinutes: segmentDurationMinutes,
        fare,
        bus: {
          id: trip.bus.id,
          number: trip.bus.number,
          type: trip.bus.type,
          layout: trip.bus.layout,
          totalSeats: trip.bus.totalSeats,
        },
        availableSeats,
        occupiedSeatCount: occupiedSeatNumbers.size,
        status: trip.status,
      });
    }

    return NextResponse.json({
      originCity: { id: originCity.id, name: originCity.name },
      destCity: { id: destCity.id, name: destCity.name },
      date,
      totalFound: results.length,
      trips: results,
    });
  } catch (error: unknown) {
    console.error("Trip search error:", error);
    return NextResponse.json(
      { error: "Internal server error searching trips" },
      { status: 500 }
    );
  }
}
