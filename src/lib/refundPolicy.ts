export interface RefundTier {
  hoursRemaining: number;
  refundPercentage: number;
  refundAmount: number;
  tierDescription: string;
  isAllowed: boolean;
  message?: string;
}

/**
 * Calculates the cancellation refund tier according to Safar Express policy:
 * - > 24 hours: 100% refund
 * - 6 to 24 hours: 75% refund
 * - < 6 hours: 50% refund
 * - Past departure: 0% / Not allowed
 */
export function calculateRefundPolicy(
  departureTime: Date,
  totalAmount: number,
  paymentStatus: string,
  now = new Date()
): RefundTier {
  const diffMs = departureTime.getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  if (hoursRemaining <= 0) {
    return {
      hoursRemaining,
      refundPercentage: 0,
      refundAmount: 0,
      tierDescription: "Past Departure Time",
      isAllowed: false,
      message: "Cancellation is not allowed after bus departure.",
    };
  }

  let refundPercentage = 0;
  let tierDescription = "";

  if (hoursRemaining > 24) {
    refundPercentage = 100;
    tierDescription = "More than 24 hours before departure (100% full refund)";
  } else if (hoursRemaining >= 6) {
    refundPercentage = 75;
    tierDescription = "Between 6 to 24 hours before departure (75% refund)";
  } else {
    refundPercentage = 50;
    tierDescription = "Less than 6 hours before departure (50% refund)";
  }

  const isPaid = paymentStatus === "PAID";
  const refundAmount = isPaid ? Math.round((totalAmount * refundPercentage) / 100) : 0;

  return {
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    refundPercentage,
    refundAmount,
    tierDescription,
    isAllowed: true,
  };
}
