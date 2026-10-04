import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { BusSchema } from "@/lib/adminValidations";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const { id } = params;
    const body = await req.json();

    const validation = BusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid bus details" },
        { status: 400 }
      );
    }

    const { number, type, layout, totalSeats } = validation.data;

    const existing = await prisma.bus.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bus not found" }, { status: 404 });
    }

    const duplicate = await prisma.bus.findFirst({
      where: {
        number,
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: `Another bus with registration "${number}" already exists.` },
        { status: 409 }
      );
    }

    const updated = await prisma.bus.update({
      where: { id },
      data: {
        number,
        type,
        layout,
        totalSeats,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Bus "${updated.number}" updated successfully.`,
      bus: updated,
    });
  } catch (error) {
    console.error("Error updating bus:", error);
    return NextResponse.json({ error: "Failed to update bus" }, { status: 500 });
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

    const bus = await prisma.bus.findUnique({
      where: { id },
      include: {
        _count: {
          select: { trips: true },
        },
      },
    });

    if (!bus) {
      return NextResponse.json({ error: "Bus not found" }, { status: 404 });
    }

    if (bus._count.trips > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete bus "${bus.number}": It is assigned to ${bus._count.trips} trip(s). Reassign or cancel those trips first.`,
        },
        { status: 400 }
      );
    }

    await prisma.bus.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Bus "${bus.number}" deleted from fleet successfully.`,
    });
  } catch (error) {
    console.error("Error deleting bus:", error);
    return NextResponse.json({ error: "Failed to delete bus" }, { status: 500 });
  }
}
