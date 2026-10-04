import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { RouteSchema } from "@/lib/adminValidations";

export const dynamic = "force-dynamic";

export async function GET() {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const routes = await prisma.route.findMany({
      include: {
        stops: {
          include: { city: true },
          orderBy: { stopOrder: "asc" },
        },
        _count: {
          select: { trips: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      routes: routes.map((r) => ({
        id: r.id,
        name: r.name,
        stopsCount: r.stops.length,
        tripsCount: r._count.trips,
        stops: r.stops.map((s) => ({
          id: s.id,
          cityId: s.cityId,
          cityName: s.city.name,
          stopOrder: s.stopOrder,
          fareFromOrigin: s.fareFromOrigin,
        })),
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching admin routes:", error);
    return NextResponse.json({ error: "Failed to fetch routes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const validation = RouteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid route configuration" },
        { status: 400 }
      );
    }

    const { name, stops } = validation.data;

    // Ensure stopOrder is 1, 2, 3...
    const sortedStops = [...stops].sort((a, b) => a.stopOrder - b.stopOrder);

    const createdRoute = await prisma.$transaction(async (tx) => {
      const route = await tx.route.create({
        data: {
          name,
          stops: {
            create: sortedStops.map((s, idx) => ({
              cityId: s.cityId,
              stopOrder: idx + 1,
              fareFromOrigin: s.fareFromOrigin,
            })),
          },
        },
        include: {
          stops: {
            include: { city: true },
            orderBy: { stopOrder: "asc" },
          },
        },
      });
      return route;
    });

    return NextResponse.json({
      success: true,
      message: `Route "${createdRoute.name}" created with ${createdRoute.stops.length} stops.`,
      route: createdRoute,
    });
  } catch (error) {
    console.error("Error creating route:", error);
    return NextResponse.json({ error: "Failed to create route" }, { status: 500 });
  }
}
