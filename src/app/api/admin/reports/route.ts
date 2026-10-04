import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const routeFilter = searchParams.get("routeId") || "ALL";
    const groupBy = (searchParams.get("groupBy") || "day").toLowerCase(); // "day" or "week"
    const format = (searchParams.get("format") || "json").toLowerCase(); // "json" or "csv"

    // Date range calculation (default: past 30 days)
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 29);
    defaultStart.setHours(0, 0, 0, 0);

    const startDateStr = searchParams.get("startDate") || defaultStart.toISOString().split("T")[0];
    const endDateStr = searchParams.get("endDate") || now.toISOString().split("T")[0];

    const rangeStart = new Date(startDateStr + "T00:00:00.000");
    const rangeEnd = new Date(endDateStr + "T23:59:59.999");

    // Fetch all routes for master lookup
    const allRoutes = await prisma.route.findMany({
      include: {
        stops: {
          include: { city: true },
          orderBy: { stopOrder: "asc" },
        },
      },
    });

    // Build booking where query
    const bookingWhere: any = {
      createdAt: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    };

    if (routeFilter !== "ALL") {
      bookingWhere.trip = {
        routeId: routeFilter,
      };
    }

    // Build trips query in range
    const tripWhere: any = {
      departureTime: {
        gte: rangeStart,
        lte: rangeEnd,
      },
      status: { not: "CANCELLED" },
    };

    if (routeFilter !== "ALL") {
      tripWhere.routeId = routeFilter;
    }

    const [bookings, trips, refundPayments] = await Promise.all([
      prisma.booking.findMany({
        where: bookingWhere,
        include: {
          seats: true,
          trip: {
            include: {
              route: true,
              bus: true,
            },
          },
          payments: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.trip.findMany({
        where: tripWhere,
        include: {
          bus: true,
          route: true,
          _count: {
            select: { bookingSeats: true },
          },
        },
      }),
      prisma.payment.findMany({
        where: {
          status: "REFUNDED",
          createdAt: {
            gte: rangeStart,
            lte: rangeEnd,
          },
        },
      }),
    ]);

    // Aggregate Summary KPIs
    let totalRevenue = 0;
    let grossRevenue = 0;
    let totalTicketsSold = 0;
    let totalBookings = bookings.length;
    let confirmedBookings = 0;
    let cancellationsCount = 0;
    let totalRefunds = 0;

    for (const b of bookings) {
      if (b.status === "CONFIRMED") {
        confirmedBookings++;
      }
      if (b.status === "CANCELLED") {
        cancellationsCount++;
      }

      if (b.paymentStatus === "PAID" && b.status !== "CANCELLED") {
        totalRevenue += b.totalAmount;
        grossRevenue += b.totalAmount;
        totalTicketsSold += b.seats.length;
      } else if (b.paymentStatus === "REFUNDED" || b.status === "CANCELLED") {
        grossRevenue += b.totalAmount;
      }
    }

    for (const ref of refundPayments) {
      totalRefunds += ref.amount;
    }

    const netRevenue = Math.max(0, totalRevenue);
    const averageTicketFare = totalTicketsSold > 0 ? Math.round(netRevenue / totalTicketsSold) : 0;

    // Aggregate Route Performance Breakdown
    const routeStatsMap = new Map<
      string,
      {
        routeId: string;
        routeName: string;
        tripsCount: number;
        totalCapacity: number;
        ticketsSold: number;
        grossRevenue: number;
        cancellationsCount: number;
        refundedAmount: number;
        netRevenue: number;
      }
    >();

    // Initialize routes
    const routesToProcess = routeFilter === "ALL" 
      ? allRoutes 
      : allRoutes.filter((r) => r.id === routeFilter);

    for (const r of routesToProcess) {
      routeStatsMap.set(r.id, {
        routeId: r.id,
        routeName: r.name,
        tripsCount: 0,
        totalCapacity: 0,
        ticketsSold: 0,
        grossRevenue: 0,
        cancellationsCount: 0,
        refundedAmount: 0,
        netRevenue: 0,
      });
    }

    // Accumulate trip capacities
    for (const t of trips) {
      const stats = routeStatsMap.get(t.routeId);
      if (stats) {
        stats.tripsCount += 1;
        stats.totalCapacity += t.bus.totalSeats;
      }
    }

    // Accumulate booking revenue per route
    for (const b of bookings) {
      const stats = routeStatsMap.get(b.trip.routeId);
      if (stats) {
        if (b.status === "CANCELLED") {
          stats.cancellationsCount += 1;
          const refPayment = b.payments.find((p) => p.status === "REFUNDED");
          if (refPayment) {
            stats.refundedAmount += refPayment.amount;
          }
        } else if (b.paymentStatus === "PAID") {
          stats.ticketsSold += b.seats.length;
          stats.grossRevenue += b.totalAmount;
          stats.netRevenue += b.totalAmount;
        }
      }
    }

    const routeBreakdown = Array.from(routeStatsMap.values()).map((r) => {
      const occupancyRate = r.totalCapacity > 0 ? Math.round((r.ticketsSold / r.totalCapacity) * 100 * 10) / 10 : 0;
      const averageFare = r.ticketsSold > 0 ? Math.round(r.netRevenue / r.ticketsSold) : 0;

      return {
        ...r,
        occupancyRate,
        averageFare,
      };
    });

    // Aggregate Time Series (Daily or Weekly)
    const timeSeriesMap = new Map<
      string,
      {
        period: string;
        periodLabel: string;
        revenue: number;
        ticketsSold: number;
        cancellations: number;
        bookingsCount: number;
        routesSales: Record<string, number>;
      }
    >();

    // Helper to get week key (YYYY-Www)
    function getWeekKey(date: Date): { key: string; label: string } {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      
      const monDate = new Date(date);
      monDate.setDate(monDate.getDate() - ((monDate.getDay() + 6) % 7));
      const sunDate = new Date(monDate);
      sunDate.setDate(sunDate.getDate() + 6);

      const label = `W${weekNo} (${monDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${sunDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
      return { key: `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`, label };
    }

    // Populate intervals
    if (groupBy === "day") {
      const cur = new Date(rangeStart);
      while (cur <= rangeEnd) {
        const key = cur.toISOString().split("T")[0];
        const label = cur.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
        timeSeriesMap.set(key, {
          period: key,
          periodLabel: label,
          revenue: 0,
          ticketsSold: 0,
          cancellations: 0,
          bookingsCount: 0,
          routesSales: {},
        });
        cur.setDate(cur.getDate() + 1);
      }
    }

    for (const b of bookings) {
      const bDate = new Date(b.createdAt);
      let key = "";
      let label = "";

      if (groupBy === "week") {
        const weekInfo = getWeekKey(bDate);
        key = weekInfo.key;
        label = weekInfo.label;
      } else {
        key = bDate.toISOString().split("T")[0];
        label = bDate.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" });
      }

      let entry = timeSeriesMap.get(key);
      if (!entry) {
        entry = {
          period: key,
          periodLabel: label,
          revenue: 0,
          ticketsSold: 0,
          cancellations: 0,
          bookingsCount: 0,
          routesSales: {},
        };
        timeSeriesMap.set(key, entry);
      }

      entry.bookingsCount += 1;
      if (b.status === "CANCELLED") {
        entry.cancellations += 1;
      } else if (b.paymentStatus === "PAID") {
        entry.revenue += b.totalAmount;
        entry.ticketsSold += b.seats.length;
        entry.routesSales[b.trip.route.name] = (entry.routesSales[b.trip.route.name] || 0) + b.totalAmount;
      }
    }

    const timeSeries = Array.from(timeSeriesMap.values());

    // Check if Export to CSV is requested
    if (format === "csv") {
      const csvLines: string[] = [];

      // CSV Header metadata
      csvLines.push(`"Safar Express - Business Sales & Performance Report"`);
      csvLines.push(`"Date Range:","${startDateStr} to ${endDateStr}"`);
      csvLines.push(`"Grouped By:","${groupBy.toUpperCase()}"`);
      csvLines.push(`"Route Filter:","${routeFilter === "ALL" ? "All Corridors" : routeFilter}"`);
      csvLines.push(`"Generated At:","${now.toISOString()}"`);
      csvLines.push("");

      // Executive KPI Summary Section
      csvLines.push(`"--- EXECUTIVE SUMMARY ---"`);
      csvLines.push(`"Metric","Value"`);
      csvLines.push(`"Total Net Revenue (PKR)","${netRevenue}"`);
      csvLines.push(`"Total Tickets Sold","${totalTicketsSold}"`);
      csvLines.push(`"Total Bookings Count","${totalBookings}"`);
      csvLines.push(`"Confirmed Bookings","${confirmedBookings}"`);
      csvLines.push(`"Cancelled Bookings","${cancellationsCount}"`);
      csvLines.push(`"Total Refunded Amount (PKR)","${totalRefunds}"`);
      csvLines.push(`"Average Fare Per Ticket (PKR)","${averageTicketFare}"`);
      csvLines.push("");

      // Route-by-Route Breakdown Section
      csvLines.push(`"--- ROUTE SALES PERFORMANCE BREAKDOWN ---"`);
      csvLines.push(`"Route Name","Trips Operated","Tickets Sold","Gross Revenue (PKR)","Cancellations","Refunds (PKR)","Net Revenue (PKR)","Occupancy Rate (%)","Avg Fare (PKR)"`);
      for (const r of routeBreakdown) {
        csvLines.push(
          `"${r.routeName.replace(/"/g, '""')}","${r.tripsCount}","${r.ticketsSold}","${r.grossRevenue}","${r.cancellationsCount}","${r.refundedAmount}","${r.netRevenue}","${r.occupancyRate}%","${r.averageFare}"`
        );
      }
      csvLines.push("");

      // Time Series Breakdown Section
      csvLines.push(`"--- TIME SERIES SALES (${groupBy.toUpperCase()}) ---"`);
      csvLines.push(`"Period","Label","Net Revenue (PKR)","Tickets Sold","Total Bookings","Cancellations"`);
      for (const ts of timeSeries) {
        csvLines.push(
          `"${ts.period}","${ts.periodLabel.replace(/"/g, '""')}","${ts.revenue}","${ts.ticketsSold}","${ts.bookingsCount}","${ts.cancellations}"`
        );
      }

      const csvContent = "\uFEFF" + csvLines.join("\r\n");
      const filename = `safar-express-sales-report-${startDateStr}-to-${endDateStr}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      filters: {
        startDate: startDateStr,
        endDate: endDateStr,
        groupBy,
        routeId: routeFilter,
      },
      summary: {
        totalRevenue: netRevenue,
        grossRevenue,
        totalTicketsSold,
        totalBookings,
        confirmedBookings,
        cancellationsCount,
        totalRefunds,
        averageTicketFare,
      },
      routeBreakdown,
      timeSeries,
    });
  } catch (error) {
    console.error("Admin reports fetch error:", error);
    return NextResponse.json(
      { error: "Failed to generate business reports." },
      { status: 500 }
    );
  }
}
