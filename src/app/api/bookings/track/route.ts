import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizePakPhone } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pnr = body.pnr?.toUpperCase().trim();
    const phone = body.phone?.trim();

    if (!pnr || !phone) {
      return NextResponse.json(
        { error: "Both PNR Reference and Contact Mobile Number are required." },
        { status: 400 }
      );
    }

    const normPhone = normalizePakPhone(phone);
    const searchPhones = [
      phone,
      normPhone ? normPhone.standard : "",
      normPhone ? normPhone.local : "",
      normPhone ? normPhone.formatted : "",
    ].filter(Boolean);

    const booking = await prisma.booking.findFirst({
      where: {
        pnr,
        contactPhone: { in: searchPhones },
      },
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
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          error: `No booking found matching PNR "${pnr}" and phone number "${phone}". Please verify your details.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error: unknown) {
    console.error("Booking lookup track error:", error);
    return NextResponse.json(
      { error: "Internal server error while tracking ticket" },
      { status: 500 }
    );
  }
}
