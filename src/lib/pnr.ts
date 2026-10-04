import prisma from "@/lib/prisma";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRandomPNR(): string {
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

export async function generateUniquePNR(tx?: any): Promise<string> {
  const db = tx || prisma;
  let pnr = "";
  let exists = true;
  let attempts = 0;

  while (exists && attempts < 10) {
    pnr = generateRandomPNR();
    const existing = await db.booking.findUnique({
      where: { pnr },
      select: { id: true },
    });
    if (!existing) {
      exists = false;
    }
    attempts++;
  }

  return pnr;
}
