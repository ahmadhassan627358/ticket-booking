import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { RouteSchema } from "@/lib/adminValidations";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const route = await prisma.route.findUnique({
      where: { id: params.id },
      include: {
        stops: {
          include: { city: true },
          orderBy: { stopOrder: "asc" },
        },
      },
    });

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, route });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch route details" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { id } = params;
    const body = await req.json();

    const validation = RouteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid route data" },
        { status: 400 }
      );
    }

    const { name, stops } = validation.data;

    const existing = await prisma.route.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    const sortedStops = [...stops].sort((a, b) => a.stopOrder - b.stopOrder);

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Delete previous stops for this route
      await tx.routeStop.deleteMany({ where: { routeId: id } });

      // 2. Insert new stops in updated order
      const route = await tx.route.update({
        where: { id },
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
      message: `Route "${updated.name}" updated successfully.`,
      route: updated,
    });
  } catch (error) {
    console.error("Error updating route:", error);
    return NextResponse.json({ error: "Failed to update route" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { id } = params;

    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        _count: {
          select: { trips: true },
        },
      },
    });

    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    if (route._count.trips > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete route "${route.name}": It has ${route._count.trips} scheduled trip(s). Delete or cancel those trips first.`,
        },
        { status: 400 }
      );
    }

    await prisma.route.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Route "${route.name}" deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting route:", error);
    return NextResponse.json({ error: "Failed to delete route" }, { status: 500 });
  }
}
