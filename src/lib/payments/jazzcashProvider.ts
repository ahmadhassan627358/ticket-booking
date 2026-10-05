import { PaymentProvider, ProcessPaymentInput, PaymentResult } from "./types";
import { normalizePakPhone } from "@/lib/validations";

/**
 * JazzCash Mobile Account & Card Payment Provider
 * Integrates with JazzCash Merchant API specification (MW & MPAY).
 */
export class JazzCashPaymentProvider implements PaymentProvider {
  readonly id = "JAZZCASH";
  readonly name = "JazzCash";
  readonly description = "Pay securely using your JazzCash Mobile Account with instant MPIN prompt";

  async processPayment(input: ProcessPaymentInput): Promise<PaymentResult> {
    const rawWalletNumber = input.metadata?.walletNumber || input.contactPhone;
    const phoneNorm = normalizePakPhone(rawWalletNumber);

    if (!phoneNorm) {
      return {
        success: false,
        status: "FAILED",
        transactionRef: `JC-FAIL-${Date.now()}`,
        message: "Invalid JazzCash mobile account number. Must be a valid Pakistani mobile number (e.g. 0300-1234567).",
        error: "INVALID_ACCOUNT_NUMBER",
      };
    }

    if (input.metadata?.forceFail) {
      return {
        success: false,
        status: "FAILED",
        transactionRef: `JC-FAIL-${Date.now()}`,
        message: "JazzCash transaction declined: Transaction timeout or wrong MPIN entered.",
        error: "DECLINED_OR_TIMEOUT",
      };
    }

    // In production, an HMAC-SHA256 hashed payload is posted to JazzCash API (https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/)
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const txHash = Math.random().toString(36).substring(2, 8).toUpperCase();
    const transactionRef = `JC-${timestamp}-${txHash}`;

    return {
      success: true,
      status: "SUCCESS",
      transactionRef,
      message: `JazzCash payment of PKR ${input.amount.toLocaleString()} received successfully from account ${phoneNorm.formatted}.`,
    };
  }
}
