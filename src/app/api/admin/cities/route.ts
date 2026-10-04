import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { CitySchema } from "@/lib/adminValidations";

export const dynamic = "force-dynamic";

export async function GET() {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const cities = await prisma.city.findMany({
      include: {
        _count: {
          select: { stops: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      cities: cities.map((c) => ({
        id: c.id,
        name: c.name,
        routesCount: c._count.stops,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching admin cities:", error);
    return NextResponse.json({ error: "Failed to fetch cities" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { errorResponse } = await requireAdmin();
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const validation = CitySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || "Invalid city name" },
        { status: 400 }
      );
    }

    const { name } = validation.data;

    // Check if city already exists (case-insensitive)
    const existing = await prisma.city.findFirst({
      where: { name: { equals: name } },
    });

    if (existing) {
      return NextResponse.json(
        { error: `City "${name}" already exists in the system.` },
        { status: 409 }
      );
    }

    const newCity = await prisma.city.create({
      data: { name },
    });

    return NextResponse.json({
      success: true,
      message: `City "${newCity.name}" added successfully.`,
      city: newCity,
    });
  } catch (error) {
    console.error("Error creating city:", error);
    return NextResponse.json({ error: "Failed to create city" }, { status: 500 });
  }
}
