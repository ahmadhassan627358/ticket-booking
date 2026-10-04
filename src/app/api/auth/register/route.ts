import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { RegisterSchema, normalizePakPhone } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    // Rate limit registration requests (20 per minute per IP)
    const rateLimit = checkRateLimit(req, { limit: 20, windowMs: 60000, keyPrefix: "auth_register" });
    if (!rateLimit.success && rateLimit.errorResponse) {
      return rateLimit.errorResponse;
    }

    const body = await req.json();

    // 1. Validate payload with Zod
    const result = RegisterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, phone, password } = result.data;
    const cleanEmail = email.toLowerCase().trim();

    // 2. Normalize Pakistani phone
    const normPhone = normalizePakPhone(phone);
    if (!normPhone) {
      return NextResponse.json(
        { error: "Invalid Pakistani phone number format (e.g. 0300-1234567)" },
        { status: 400 }
      );
    }

    // 3. Check for existing email
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    // 4. Check for existing phone across known formats
    const existingUserByPhone = await prisma.user.findFirst({
      where: {
        phone: {
          in: [normPhone.standard, normPhone.local, normPhone.formatted, phone.trim()],
        },
      },
    });

    if (existingUserByPhone) {
      return NextResponse.json(
        { error: "An account with this phone number already exists" },
        { status: 409 }
      );
    }

    // 5. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 6. Save customer user (standardizing on +92 format)
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        phone: normPhone.standard,
        passwordHash,
        role: "CUSTOMER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Account registered successfully!",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error while creating account" },
      { status: 500 }
    );
  }
}
