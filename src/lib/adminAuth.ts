import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function requireAdmin() {
  // 1. Check direct admin header (for secure script/automation API access)
  const headersList = headers();
  const adminKey = headersList.get("x-admin-key");
  const validSecret = process.env.ADMIN_SECRET || "safar-admin-secret-2026";

  if (adminKey && adminKey === validSecret) {
    return {
      errorResponse: null,
      session: {
        user: {
          id: "admin-system",
          name: "System Administrator",
          email: "admin@safar.pk",
          role: "ADMIN",
        },
      },
    };
  }

  // 2. Check NextAuth browser cookie session
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "ADMIN") {
    return {
      errorResponse: NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      ),
      session: null,
    };
  }

  return { errorResponse: null, session };
}
