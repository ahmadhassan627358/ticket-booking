export const Role = {
  CUSTOMER: "CUSTOMER",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const BusType = {
  BUSINESS: "BUSINESS",
  EXECUTIVE: "EXECUTIVE",
} as const;
export type BusType = (typeof BusType)[keyof typeof BusType];

export const TripDirection = {
  FORWARD: "FORWARD",
  REVERSE: "REVERSE",
} as const;
export type TripDirection = (typeof TripDirection)[keyof typeof TripDirection];

export const TripStatus = {
  SCHEDULED: "SCHEDULED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
} as const;
export type TripStatus = (typeof TripStatus)[keyof typeof TripStatus];

export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const PaymentStatus = {
  UNPAID: "UNPAID",
  PAID: "PAID",
  REFUNDED: "REFUNDED",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const Gender = {
  MALE: "MALE",
  FEMALE: "FEMALE",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const PaymentMethod = {
  CASH: "CASH",
  MOCK_ONLINE: "MOCK_ONLINE",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
