import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { CitySchema } from "@/lib/adminValidations";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { id } = params;
    const body = await req.json();

    const validation = CitySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid city name" },
        { status: 400 }
      );
    }

    const { name } = validation.data;

    // Check if city exists
    const city = await prisma.city.findUnique({ where: { id } });
    if (!city) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    // Check duplicate name on another city
    const duplicate = await prisma.city.findFirst({
      where: {
        name: { equals: name },
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `Another city named "${name}" already exists.` },
        { status: 409 }
      );
    }

    const updated = await prisma.city.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json({
      success: true,
      message: `City renamed to "${updated.name}" successfully.`,
      city: updated,
    });
  } catch (error) {
    console.error("Error updating city:", error);
    return NextResponse.json({ error: "Failed to update city" }, { status: 500 });
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

    const city = await prisma.city.findUnique({
      where: { id },
      include: {
        _count: {
          select: { stops: true },
        },
      },
    });

    if (!city) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    // BLOCK DELETION if city is used in a route
    if (city._count.stops > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete "${city.name}": It is currently assigned to ${city._count.stops} active route stop(s). Remove the city from routes first.`,
        },
        { status: 400 }
      );
    }

    await prisma.city.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `City "${city.name}" deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting city:", error);
    return NextResponse.json({ error: "Failed to delete city" }, { status: 500 });
  }
}
