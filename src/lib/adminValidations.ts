import { z } from "zod";

// City Validation Schemas
export const CitySchema = z.object({
  name: z
    .string()
    .min(2, "City name must be at least 2 characters")
    .max(50, "City name must not exceed 50 characters")
    .trim(),
});

export type CityInput = z.infer<typeof CitySchema>;

// Route Stop Schema
export const RouteStopInputSchema = z.object({
  cityId: z.string().min(1, "City is required"),
  stopOrder: z.number().int().min(1, "Stop order must be at least 1"),
  fareFromOrigin: z.number().min(0, "Fare from origin cannot be negative"),
});

// Route Validation Schema
export const RouteSchema = z.object({
  name: z
    .string()
    .min(3, "Route name must be at least 3 characters")
    .max(100, "Route name cannot exceed 100 characters")
    .trim(),
  stops: z
    .array(RouteStopInputSchema)
    .min(2, "A route must contain at least 2 stops (Origin and Destination)"),
}).refine(
  (data) => {
    const cityIds = data.stops.map((s) => s.cityId);
    return new Set(cityIds).size === cityIds.length;
  },
  {
    message: "A route cannot contain duplicate cities",
    path: ["stops"],
  }
);

export type RouteInput = z.infer<typeof RouteSchema>;

// Bus Validation Schema
export const BusSchema = z.object({
  number: z
    .string()
    .min(3, "Bus number / registration must be at least 3 characters")
    .max(30, "Bus number cannot exceed 30 characters")
    .trim(),
  type: z.enum(["BUSINESS", "EXECUTIVE"], {
    errorMap: () => ({ message: "Bus type must be BUSINESS or EXECUTIVE" }),
  }),
  totalSeats: z.coerce
    .number()
    .int()
    .min(10, "Total seats must be at least 10")
    .max(60, "Total seats cannot exceed 60"),
  layout: z.enum(["2x1", "2x2"], {
    errorMap: () => ({ message: "Layout must be 2x1 or 2x2" }),
  }),
});

export type BusInput = z.infer<typeof BusSchema>;

// Single Trip Schema
export const SingleTripSchema = z.object({
  routeId: z.string().min(1, "Route is required"),
  busId: z.string().min(1, "Bus is required"),
  direction: z.enum(["FORWARD", "REVERSE"]),
  departureTime: z.string().min(1, "Departure date & time is required"),
});

export type SingleTripInput = z.infer<typeof SingleTripSchema>;

// Bulk Trip Generator Schema
export const BulkTripGeneratorSchema = z.object({
  routeId: z.string().min(1, "Route is required"),
  busId: z.string().min(1, "Bus is required"),
  direction: z.enum(["FORWARD", "REVERSE", "BOTH"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
  timeSlots: z
    .array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time format must be HH:mm"))
    .min(1, "At least one departure time slot is required"),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: "Start date must be before or equal to End date",
    path: ["endDate"],
  }
);

export type BulkTripGeneratorInput = z.infer<typeof BulkTripGeneratorSchema>;
