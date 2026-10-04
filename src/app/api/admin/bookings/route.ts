import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.max(5, Math.min(100, parseInt(searchParams.get("pageSize") || "15")));
    const search = searchParams.get("search")?.trim() || "";
    const date = searchParams.get("date")?.trim() || "";
    const routeId = searchParams.get("routeId") || "ALL";
    const status = searchParams.get("status") || "ALL";
    const paymentStatus = searchParams.get("paymentStatus") || "ALL";

    const where: any = {};

    if (status !== "ALL") {
      where.status = status;
    }

    if (paymentStatus !== "ALL") {
      where.paymentStatus = paymentStatus;
    }

    if (routeId !== "ALL") {
      where.trip = {
        ...(where.trip || {}),
        routeId: routeId,
      };
    }

    // Filter by departure date or booking date if provided (YYYY-MM-DD)
    if (date) {
      const targetStart = new Date(date + "T00:00:00");
      const targetEnd = new Date(date + "T23:59:59.999");

      where.OR = [
        {
          createdAt: { gte: targetStart, lte: targetEnd },
        },
        {
          trip: {
            departureTime: { gte: targetStart, lte: targetEnd },
          },
        },
      ];
    }

    // Search by PNR, contact phone, user name, user email, or passenger names in seats
    if (search) {
      const searchConditions = [
        { pnr: { contains: search } },
        { contactPhone: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        {
          seats: {
            some: {
              OR: [
                { passengerName: { contains: search } },
                { cnic: { contains: search } },
              ],
            },
          },
        },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          trip: {
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
            },
          },
          seats: {
            include: {
              fromStop: { include: { city: true } },
              toStop: { include: { city: true } },
            },
            orderBy: { seatNo: "asc" },
          },
          payments: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const formattedBookings = bookings.map((b) => {
      const primaryPayment = b.payments[0];
      const originCity = b.trip?.route?.stops?.[0]?.city?.name || "Origin";
      const destCity = b.trip?.route?.stops?.[b.trip.route.stops.length - 1]?.city?.name || "Destination";
      
      const seatNumbers = b.seats.map((s) => s.seatNo);
      const passengerNames = b.seats.map((s) => s.passengerName);

      return {
        id: b.id,
        pnr: b.pnr,
        userId: b.userId,
        customerName: b.user?.name || passengerNames[0] || "Guest Customer",
        customerEmail: b.user?.email || "N/A",
        contactPhone: b.contactPhone,
        totalAmount: b.totalAmount,
        status: b.status,
        paymentStatus: b.paymentStatus,
        paymentMethod: primaryPayment?.method || "CASH",
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        trip: {
          id: b.trip.id,
          departureTime: b.trip.departureTime,
          direction: b.trip.direction,
          status: b.trip.status,
          busNumber: b.trip.bus.number,
          busType: b.trip.bus.type,
          routeName: b.trip.route.name,
          originCity,
          destCity,
        },
        seats: b.seats.map((s) => ({
          id: s.id,
          seatNo: s.seatNo,
          passengerName: s.passengerName,
          cnic: s.cnic,
          gender: s.gender,
          fromCity: s.fromStop.city.name,
          toCity: s.toStop.city.name,
          fare: s.fare,
        })),
        seatNumbers,
        seatsCount: b.seats.length,
        payments: b.payments.map((p) => ({
          id: p.id,
          method: p.method,
          amount: p.amount,
          status: p.status,
          transactionRef: p.transactionRef,
          createdAt: p.createdAt,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      bookings: formattedBookings,
    });
  } catch (error) {
    console.error("Admin fetch bookings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings list." },
      { status: 500 }
    );
  }
}
