import { PaymentProvider, ProcessPaymentInput, PaymentResult } from "./types";

/**
 * Stripe Credit/Debit & International Card Payment Provider
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly id = "STRIPE";
  readonly name = "Stripe";
  readonly description = "Pay with Visa, Mastercard, American Express, Apple Pay, or Google Pay via Stripe";

  async processPayment(input: ProcessPaymentInput): Promise<PaymentResult> {
    const cardNumber = input.metadata?.cardNumber?.replace(/\s/g, "");
    
    if (input.metadata?.forceFail) {
      return {
        success: false,
        status: "FAILED",
        transactionRef: `pi_fail_${Date.now()}`,
        message: "Your card was declined. Please check details or use a different card.",
        error: "CARD_DECLINED",
      };
    }

    if (cardNumber && cardNumber.endsWith("0002")) {
      return {
        success: false,
        status: "FAILED",
        transactionRef: `pi_fail_${Date.now()}`,
        message: "Stripe error: Card has insufficient funds.",
        error: "INSUFFICIENT_FUNDS",
      };
    }

    const txId = Math.random().toString(36).substring(2, 16);
    const transactionRef = `pi_3M${txId}`;

    return {
      success: true,
      status: "SUCCESS",
      transactionRef,
      message: `Stripe PaymentIntent confirmed successfully for PKR ${input.amount.toLocaleString()}.`,
    };
  }
}
