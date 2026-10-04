import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateTicketPdf } from "@/lib/ticketPdf";

export async function GET(
  req: Request,
  { params }: { params: { pnr: string } }
) {
  try {
    const pnr = params.pnr?.toUpperCase().trim();
    if (!pnr) {
      return NextResponse.json({ error: "PNR reference is required" }, { status: 400 });
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
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: `No booking found for PNR "${pnr}".` },
        { status: 404 }
      );
    }

    // Only allow for CONFIRMED bookings
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json(
        {
          error: `E-Ticket PDF download is only available for CONFIRMED bookings. Current booking status is ${booking.status}.`,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
        },
        { status: 400 }
      );
    }

    const firstSeat = booking.seats[0];
    const fromCity = firstSeat?.fromStop?.city?.name || "Origin";
    const toCity = firstSeat?.toStop?.city?.name || "Destination";

    const pdfBytes = await generateTicketPdf({
      pnr: booking.pnr,
      routeName: booking.trip.route.name,
      fromCity,
      toCity,
      departureTime: new Date(booking.trip.departureTime),
      busNumber: booking.trip.bus.number,
      busType: booking.trip.bus.type,
      busLayout: booking.trip.bus.layout,
      totalAmount: booking.totalAmount,
      contactPhone: booking.contactPhone,
      createdAt: new Date(booking.createdAt),
      seats: booking.seats.map((s) => ({
        seatNo: s.seatNo,
        passengerName: s.passengerName,
        cnic: s.cnic,
        gender: s.gender,
        fare: s.fare,
      })),
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="safar-ticket-${booking.pnr}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    console.error("Error generating ticket PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate ticket PDF" },
      { status: 500 }
    );
  }
}
