import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { BulkTripGeneratorSchema } from "@/lib/adminValidations";

export async function POST(req: Request) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const validation = BulkTripGeneratorSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid bulk generator inputs" },
        { status: 400 }
      );
    }

    const { routeId, busId, direction, startDate, endDate, timeSlots } = validation.data;

    const [route, bus] = await Promise.all([
      prisma.route.findUnique({ where: { id: routeId } }),
      prisma.bus.findUnique({ where: { id: busId } }),
    ]);

    if (!route || !bus) {
      return NextResponse.json({ error: "Selected Route or Bus not found" }, { status: 404 });
    }

    const directionsToGenerate: Array<"FORWARD" | "REVERSE"> =
      direction === "BOTH" ? ["FORWARD", "REVERSE"] : [direction];

    const start = new Date(startDate);
    const end = new Date(endDate);

    const tripDataList: Array<{
      routeId: string;
      busId: string;
      direction: "FORWARD" | "REVERSE";
      departureTime: Date;
      status: string;
    }> = [];

    // Loop through each calendar day
    const current = new Date(start);
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      const dateString = `${year}-${month}-${day}`;

      for (const slot of timeSlots) {
        const [hours, minutes] = slot.split(":").map(Number);
        const departureDateTime = new Date(year, current.getMonth(), current.getDate(), hours, minutes, 0, 0);

        for (const dir of directionsToGenerate) {
          tripDataList.push({
            routeId,
            busId,
            direction: dir,
            departureTime: departureDateTime,
            status: "SCHEDULED",
          });
        }
      }

      // Increment day
      current.setDate(current.getDate() + 1);
    }

    if (tripDataList.length === 0) {
      return NextResponse.json({ error: "No trips to generate for given parameters" }, { status: 400 });
    }

    // Insert trips in bulk
    const result = await prisma.trip.createMany({
      data: tripDataList,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${result.count} trips for route "${route.name}".`,
      count: result.count,
    });
  } catch (error) {
    console.error("Bulk trip generation error:", error);
    return NextResponse.json({ error: "Failed to generate bulk trips" }, { status: 500 });
  }
}
