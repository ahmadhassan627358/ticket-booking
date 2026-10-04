import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { SingleTripSchema } from "@/lib/adminValidations";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.max(5, Math.min(100, parseInt(searchParams.get("pageSize") || "10")));
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";
    const routeId = searchParams.get("routeId") || "ALL";

    const where: any = {};

    if (status !== "ALL") {
      where.status = status;
    }

    if (routeId !== "ALL") {
      where.routeId = routeId;
    }

    if (search) {
      where.OR = [
        { route: { name: { contains: search } } },
        { bus: { number: { contains: search } } },
      ];
    }

    const [total, trips] = await Promise.all([
      prisma.trip.count({ where }),
      prisma.trip.findMany({
        where,
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
        orderBy: { departureTime: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      trips: trips.map((t) => ({
        id: t.id,
        routeId: t.routeId,
        routeName: t.route.name,
        direction: t.direction,
        busId: t.busId,
        busNumber: t.bus.number,
        busType: t.bus.type,
        busLayout: t.bus.layout,
        totalSeats: t.bus.totalSeats,
        departureTime: t.departureTime,
        status: t.status,
        bookingsCount: t._count.bookings,
        bookedSeatsCount: t._count.bookingSeats,
        stops: t.route.stops.map((s) => ({
          cityName: s.city.name,
          fare: s.fareFromOrigin,
        })),
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching admin trips:", error);
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const validation = SingleTripSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid trip details" },
        { status: 400 }
      );
    }

    const { routeId, busId, direction, departureTime } = validation.data;

    // Verify route and bus exist
    const [route, bus] = await Promise.all([
      prisma.route.findUnique({ where: { id: routeId } }),
      prisma.bus.findUnique({ where: { id: busId } }),
    ]);

    if (!route || !bus) {
      return NextResponse.json(
        { error: "Selected Route or Bus does not exist." },
        { status: 404 }
      );
    }

    const trip = await prisma.trip.create({
      data: {
        routeId,
        busId,
        direction,
        departureTime: new Date(departureTime),
        status: "SCHEDULED",
      },
      include: {
        route: true,
        bus: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Trip for "${route.name}" on ${new Date(departureTime).toLocaleString("en-PK")} scheduled successfully.`,
      trip,
    });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}
