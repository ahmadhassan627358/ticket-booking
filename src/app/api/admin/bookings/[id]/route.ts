import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        OR: [{ id: bookingId }, { pnr: bookingId.toUpperCase().trim() }],
      },
      include: {
        user: true,
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
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Error fetching single booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking details." },
      { status: 500 }
    );
  }
}
