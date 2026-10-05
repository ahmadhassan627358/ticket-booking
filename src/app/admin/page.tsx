import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import {
  ShieldCheck,
  TrendingUp,
  Ticket,
  DollarSign,
  Bus,
  Percent,
  Calendar,
  ArrowUpRight,
  Sparkles,
  Layers,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  BarChart3,
} from "lucide-react";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin&error=AccessDenied");
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  // Fetch initial dashboard metrics and data server-side
  const [
    todayBookingsCount,
    todayPaidBookings,
    todaySeatsCount,
    todayTrips,
    allUpcomingTrips,
    last7DaysBookings,
    totalRoutesCount,
    totalBusesCount,
  ] = await Promise.all([
    prisma.booking.count({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    }),

    prisma.booking.findMany({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        paymentStatus: "PAID",
        status: { not: "CANCELLED" },
      },
      select: { totalAmount: true },
    }),

    prisma.bookingSeat.count({
      where: {
        booking: {
          createdAt: { gte: startOfToday, lte: endOfToday },
          status: { not: "CANCELLED" },
        },
      },
    }),

    prisma.trip.findMany({
      where: {
        departureTime: { gte: startOfToday, lte: endOfToday },
        status: { not: "CANCELLED" },
      },
      include: {
        bus: true,
        _count: { select: { bookingSeats: true } },
      },
    }),

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

    prisma.booking.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        seats: true,
      },
    }),

    prisma.route.count(),
    prisma.bus.count(),
  ]);

  const todayRevenue = todayPaidBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const activeTripsCount = todayTrips.length;

  // Calculate Average Occupancy %
  let avgOccupancyToday = 0;
  const targetTripsForOccupancy = todayTrips.length > 0 ? todayTrips : allUpcomingTrips;
  if (targetTripsForOccupancy.length > 0) {
    let totalCap = 0;
    let totalBooked = 0;
    for (const t of targetTripsForOccupancy) {
      totalCap += t.bus.totalSeats;
      totalBooked += t._count.bookingSeats;
    }
    if (totalCap > 0) {
      avgOccupancyToday = Math.round((totalBooked / totalCap) * 100 * 10) / 10;
    }
  }

  // 7 Days sales aggregation
  const salesMap = new Map<string, { revenue: number; bookingsCount: number; ticketsCount: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    salesMap.set(key, { revenue: 0, bookingsCount: 0, ticketsCount: 0 });
  }

  for (const b of last7DaysBookings) {
    const key = new Date(b.createdAt).toISOString().split("T")[0];
    const entry = salesMap.get(key);
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

  const last7DaysSales = Array.from(salesMap.entries()).map(([dateStr, data]) => {
    const dateObj = new Date(dateStr + "T00:00:00");
    return {
      date: dateStr,
      dayLabel: dateObj.toLocaleDateString("en-US", { weekday: "short" }),
      formattedDate: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: data.revenue,
      bookingsCount: data.bookingsCount,
      ticketsCount: data.ticketsCount,
    };
  });

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
      direction: t.direction as "FORWARD" | "REVERSE",
      busId: t.busId,
      busNumber: t.bus.number,
      busType: t.bus.type,
      busLayout: t.bus.layout,
      totalSeats: total,
      bookedSeatsCount: booked,
      occupancyRate,
      departureTime: t.departureTime.toISOString(),
      status: t.status,
      bookingsCount: t._count.bookings,
    };
  });

  const initialData = {
    stats: {
      todayBookings: todayBookingsCount,
      todayRevenue,
      seatsSold: todaySeatsCount,
      activeTrips: activeTripsCount,
      avgOccupancy: avgOccupancyToday,
      totalRoutes: totalRoutesCount,
      totalBuses: totalBusesCount,
    },
    last7DaysSales,
    nextUpcomingTrips,
    adminName: session.user.name || "Administrator",
    adminEmail: session.user.email || "",
  };

  return <AdminDashboardClient initialData={initialData} />;
}
