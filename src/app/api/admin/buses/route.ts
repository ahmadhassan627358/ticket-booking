import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { BusSchema } from "@/lib/adminValidations";

export const dynamic = "force-dynamic";

export async function GET() {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const buses = await prisma.bus.findMany({
      include: {
        _count: {
          select: { trips: true },
        },
      },
      orderBy: { number: "asc" },
    });

    return NextResponse.json({
      success: true,
      buses: buses.map((b) => ({
        id: b.id,
        number: b.number,
        type: b.type,
        layout: b.layout,
        totalSeats: b.totalSeats,
        tripsCount: b._count.trips,
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching admin buses:", error);
    return NextResponse.json({ error: "Failed to fetch fleet buses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const validation = BusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid bus details" },
        { status: 400 }
      );
    }

    const { number, type, layout, totalSeats } = validation.data;

    // Check duplicate number
    const existing = await prisma.bus.findUnique({
      where: { number },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A bus with registration "${number}" already exists in the fleet.` },
        { status: 409 }
      );
    }

    const bus = await prisma.bus.create({
      data: {
        number,
        type,
        layout,
        totalSeats,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Bus "${bus.number}" added to fleet successfully.`,
      bus,
    });
  } catch (error) {
    console.error("Error creating bus:", error);
    return NextResponse.json({ error: "Failed to create bus" }, { status: 500 });
  }
}
