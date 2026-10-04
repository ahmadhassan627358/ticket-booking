import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const UnlockSeatSchema = z.object({
  tripId: z.string().min(1),
  sessionId: z.string().min(1),
  seatNos: z.array(z.number().int()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = UnlockSeatSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { tripId, sessionId, seatNos } = validation.data;

    await prisma.seatLock.deleteMany({
      where: {
        tripId,
        sessionId,
        ...(seatNos && seatNos.length > 0 ? { seatNo: { in: seatNos } } : {}),
      },
    });

    return NextResponse.json({ success: true, message: "Seats released" });
  } catch (error: unknown) {
    console.error("Unlock error:", error);
    return NextResponse.json({ error: "Failed to unlock seats" }, { status: 500 });
  }
}
