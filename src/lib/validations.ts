import { z } from "zod";

/**
 * Normalizes a Pakistani phone number into standard formats.
 */
export function normalizePakPhone(rawPhone: string): { standard: string; local: string; formatted: string } | null {
  const cleaned = rawPhone.replace(/[\s\-()]/g, "");
  let digits = "";

  if (cleaned.startsWith("+92")) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith("0092")) {
    digits = cleaned.slice(4);
  } else if (cleaned.startsWith("92")) {
    digits = cleaned.slice(2);
  } else if (cleaned.startsWith("0")) {
    digits = cleaned.slice(1);
  } else {
    digits = cleaned;
  }

  // Must be 10 digits starting with 3 (e.g. 3001234567)
  if (!/^3\d{9}$/.test(digits)) {
    return null;
  }

  return {
    standard: `+92${digits}`,
    local: `0${digits}`,
    formatted: `0${digits.slice(0, 3)}-${digits.slice(3)}`,
  };
}

/**
 * Validates and formats a Pakistani 13-digit CNIC (e.g. 35201-1234567-1).
 */
export function normalizePakCNIC(rawCNIC: string): string | null {
  const cleaned = rawCNIC.replace(/[\s\-]/g, "");
  if (!/^\d{13}$/.test(cleaned)) {
    return null;
  }
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12)}`;
}

// Regex for Pakistani phone numbers (supports +92, 0092, 92, 0 prefixes with optional spaces/dashes)
export const pakPhoneRegex = /^((\+92|0092|92|0)[-\s]*)?3[0-9]{2}[-\s]?[0-9]{7}$/;

// Regex for Pakistani CNIC (12345-1234567-1 or 13 digits)
export const pakCnicRegex = /^(\d{5}-\d{7}-\d{1}|\d{13})$/;

export const RegisterSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters"),
  phone: z
    .string()
    .min(10, "Phone number is too short")
    .refine((val) => normalizePakPhone(val) !== null, {
      message: "Please enter a valid Pakistani mobile number (e.g. 0300-1234567 or +92 300 1234567)",
    }),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().optional(),
}).refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  identifier: z.string().min(1, "Please enter your Email or Pakistani Mobile Number"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const PassengerDetailSchema = z.object({
  seatNo: z.number().int().positive("Seat number is required"),
  passengerName: z.string().min(2, "Passenger name must be at least 2 characters").max(60),
  cnic: z.string().refine((val) => pakCnicRegex.test(val), {
    message: "CNIC must be in 12345-1234567-1 or 13-digit format",
  }),
  gender: z.enum(["MALE", "FEMALE"]),
});

export const CreateBookingRequestSchema = z.object({
  tripId: z.string().min(1, "Trip ID is required"),
  fromStopId: z.string().min(1, "Origin stop is required"),
  toStopId: z.string().min(1, "Destination stop is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  contactPhone: z.string().refine((val) => normalizePakPhone(val) !== null, {
    message: "Please provide a valid Pakistani contact phone number (03XX-XXXXXXX)",
  }),
  contactEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  paymentMethod: z.enum(["CASH", "MOCK_ONLINE", "EASYPAISA", "JAZZCASH", "STRIPE"]),
  paymentMetadata: z
    .object({
      walletNumber: z.string().optional(),
      cardNumber: z.string().optional(),
      cardExpiry: z.string().optional(),
      cardCvc: z.string().optional(),
      cardHolder: z.string().optional(),
      stripeToken: z.string().optional(),
      forceFail: z.boolean().optional(),
    })
    .optional(),
  passengers: z
    .array(PassengerDetailSchema)
    .min(1, "At least one passenger is required")
    .max(4, "Maximum 4 passengers allowed per booking"),
});

export type CreateBookingRequest = z.infer<typeof CreateBookingRequestSchema>;
