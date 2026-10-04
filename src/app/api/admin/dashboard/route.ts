import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const now = new Date();
    
    // Start of today (00:00:00.000) and End of today (23:59:59.999)
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // 7 Days ago start
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    // 1. Fetch Today's Metric Stats
    const [
      todayBookingsCount,
      todayPaidBookings,
      todaySeatsCount,
      todayTrips,
      allUpcomingTrips,
      recentBookingsCount,
    ] = await Promise.all([
      // Today's total bookings
      prisma.booking.count({
        where: {
          createdAt: { gte: startOfToday, lte: endOfToday },
        },
      }),

      // Today's paid bookings for revenue calculation
      prisma.booking.findMany({
        where: {
          createdAt: { gte: startOfToday, lte: endOfToday },
          paymentStatus: "PAID",
          status: { not: "CANCELLED" },
        },
        select: { totalAmount: true },
      }),

      // Seats sold today
      prisma.bookingSeat.count({
        where: {
          booking: {
            createdAt: { gte: startOfToday, lte: endOfToday },
            status: { not: "CANCELLED" },
          },
        },
      }),

      // Active trips scheduled for today
      prisma.trip.findMany({
        where: {
          departureTime: { gte: startOfToday, lte: endOfToday },
          status: { not: "CANCELLED" },
        },
        include: {
          bus: true,
          _count: {
            select: { bookingSeats: true },
          },
        },
      }),

      // Next 10 upcoming scheduled trips
      prisma.trip.findMany({
        where: {
          departureTime: { gte: startOfToday },
          status: { in: ["SCHEDULED", "COMPLETED"] },
        },
        orderBy: { departureTime: "asc" },
        take: 10,
        include: {
          route: {
            include: {
              stops: {
                include: { city: true },
                orderBy: { stopOrder: "asc" },
              },
            },
          },
          bus: true,
          _count: {
            select: {
              bookings: true,
              bookingSeats: true,
            },
          },
        },
      }),

      // Total count of all bookings in system for quick reference
      prisma.booking.count(),
    ]);

    // Calculate Today's Revenue
    const todayRevenue = todayPaidBookings.reduce((sum, b) => sum + b.totalAmount, 0);

    // Calculate Active Trips Count today
    const activeTripsCount = todayTrips.length;

    // Calculate Average Occupancy % for Today's Active Trips (or upcoming trips if no trips today)
    let avgOccupancyToday = 0;
    const targetTripsForOccupancy = todayTrips.length > 0 ? todayTrips : allUpcomingTrips;
    if (targetTripsForOccupancy.length > 0) {
      let totalCapacity = 0;
      let totalBooked = 0;
      for (const t of targetTripsForOccupancy) {
        totalCapacity += t.bus.totalSeats;
        totalBooked += t._count.bookingSeats;
      }
      if (totalCapacity > 0) {
        avgOccupancyToday = Math.round((totalBooked / totalCapacity) * 100 * 10) / 10;
      }
    }

    // Helper to format date in local YYYY-MM-DD
    const toLocalDateKey = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    // 2. Fetch Last 7 Days Sales Data for Chart
    const last7DaysBookings = await prisma.booking.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        seats: true,
      },
    });

    // Group bookings by local date
    const salesByDayMap = new Map<string, { revenue: number; bookingsCount: number; ticketsCount: number }>();

    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateKey = toLocalDateKey(d);
      salesByDayMap.set(dateKey, { revenue: 0, bookingsCount: 0, ticketsCount: 0 });
    }

    for (const b of last7DaysBookings) {
      const dateKey = toLocalDateKey(new Date(b.createdAt));
      const entry = salesByDayMap.get(dateKey);
      if (entry) {
        entry.bookingsCount += 1;
        if (b.status !== "CANCELLED") {
          entry.ticketsCount += b.seats.length;
          if (b.paymentStatus === "PAID") {
            entry.revenue += b.totalAmount;
          }
        }
      }
    }

    const last7DaysSales = Array.from(salesByDayMap.entries()).map(([dateStr, data]) => {
      const dateObj = new Date(dateStr + "T00:00:00");
      const shortDay = dateObj.toLocaleDateString("en-US", { weekday: "short" });
      const dayMonth = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        date: dateStr,
        dayLabel: shortDay,
        formattedDate: dayMonth,
        revenue: data.revenue,
        bookingsCount: data.bookingsCount,
        ticketsCount: data.ticketsCount,
      };
    });

    // 3. Format Next 10 Upcoming Trips
    const nextUpcomingTrips = allUpcomingTrips.map((t) => {
      const booked = t._count.bookingSeats;
      const total = t.bus.totalSeats;
      const occupancyRate = total > 0 ? Math.round((booked / total) * 100) : 0;
      const originCity = t.route.stops[0]?.city.name || "Origin";
      const destCity = t.route.stops[t.route.stops.length - 1]?.city.name || "Destination";

      return {
        id: t.id,
        routeId: t.routeId,
        routeName: t.route.name,
        originCity,
        destCity,
        direction: t.direction,
        busId: t.busId,
        busNumber: t.bus.number,
        busType: t.bus.type,
        busLayout: t.bus.layout,
        totalSeats: total,
        bookedSeatsCount: booked,
        occupancyRate,
        departureTime: t.departureTime,
        status: t.status,
        bookingsCount: t._count.bookings,
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        todayBookings: todayBookingsCount,
        todayRevenue,
        seatsSold: todaySeatsCount,
        activeTrips: activeTripsCount,
        avgOccupancy: avgOccupancyToday,
        totalAllTimeBookings: recentBookingsCount,
      },
      last7DaysSales,
      nextUpcomingTrips,
    });
  } catch (error) {
    console.error("Admin dashboard fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching admin dashboard data." },
      { status: 500 }
    );
  }
}
