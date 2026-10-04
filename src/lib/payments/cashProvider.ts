import { PaymentProvider, ProcessPaymentInput, PaymentResult } from "./types";

export class CashPaymentProvider implements PaymentProvider {
  readonly id = "CASH";
  readonly name = "Cash at Terminal Counter";
  readonly description = "Pay at the bus terminal counter before departure. Reservation expires 2 hours before trip if unpaid.";

  async processPayment(input: ProcessPaymentInput): Promise<PaymentResult> {
    const timestamp = Date.now().toString().slice(-6);
    const transactionRef = `CASH-${input.pnr}-${timestamp}`;

    return {
      success: true,
      status: "PENDING",
      transactionRef,
      message: "Cash reservation created. Please pay at the counter at least 2 hours before departure.",
    };
  }
}
