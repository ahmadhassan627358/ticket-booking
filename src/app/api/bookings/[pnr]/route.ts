import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { pnr: string } }
) {
  try {
    const pnr = params.pnr?.toUpperCase().trim();
    if (!pnr) {
      return NextResponse.json({ error: "PNR is required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { pnr },
      include: {
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: `No booking found for PNR reference "${pnr}".` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Error fetching booking by PNR:", error);
    return NextResponse.json(
      { error: "Internal server error while fetching booking details" },
      { status: 500 }
    );
  }
}
