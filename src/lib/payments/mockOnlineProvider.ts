import { PaymentProvider, ProcessPaymentInput, PaymentResult } from "./types";

export class MockOnlinePaymentProvider implements PaymentProvider {
  readonly id = "MOCK_ONLINE";
  readonly name = "Instant Online Card / Bank Pay";
  readonly description = "Instant online card or digital checkout simulator for testing.";

  async processPayment(input: ProcessPaymentInput): Promise<PaymentResult> {
    const { metadata } = input;
    const cardNumber = metadata?.cardNumber?.replace(/\s+/g, "") || "";
    const isExplicitFail = metadata?.forceFail === true || cardNumber.endsWith("0000");

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (isExplicitFail) {
      return {
        success: false,
        status: "FAILED",
        transactionRef: `FAIL-${Date.now().toString().slice(-8)}`,
        message: "Payment transaction declined by card issuer or test simulator.",
        error: "Card declined or test failure triggered. Please try again with valid card details.",
      };
    }

    const timestamp = Date.now().toString().slice(-8);
    const transactionRef = `TXN-ONL-${input.pnr}-${timestamp}`;

    return {
      success: true,
      status: "SUCCESS",
      transactionRef,
      message: `Payment of Rs. ${input.amount.toLocaleString()} processed successfully via Mock Online Gateway.`,
    };
  }
}
