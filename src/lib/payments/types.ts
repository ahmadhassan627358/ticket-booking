/**
 * Payment Abstraction Layer Types
 * Allows seamless addition of new payment providers (JazzCash, Easypaisa, Stripe, etc.)
 */

export interface ProcessPaymentInput {
  pnr: string;
  amount: number;
  method: string;
  contactPhone: string;
  contactEmail?: string;
  metadata?: {
    cardNumber?: string;
    cardExpiry?: string;
    cardCvc?: string;
    cardHolder?: string;
    forceFail?: boolean;
    [key: string]: any;
  };
}

export interface PaymentResult {
  success: boolean;
  status: "SUCCESS" | "PENDING" | "FAILED";
  transactionRef: string;
  message: string;
  error?: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  processPayment(input: ProcessPaymentInput): Promise<PaymentResult>;
}
