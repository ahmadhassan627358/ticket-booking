import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          { contactPhone: session.user.phone },
        ],
      },
      include: {
        trip: {
          include: {
            bus: true,
            route: true,
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
    });

    return NextResponse.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("Error fetching my bookings:", error);
    return NextResponse.json(
      { error: "Internal server error fetching your bookings" },
      { status: 500 }
    );
  }
}
