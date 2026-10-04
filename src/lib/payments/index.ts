import { PaymentProvider } from "./types";
import { CashPaymentProvider } from "./cashProvider";
import { MockOnlinePaymentProvider } from "./mockOnlineProvider";

export * from "./types";
export * from "./cashProvider";
export * from "./mockOnlineProvider";

const providers: Record<string, PaymentProvider> = {
  CASH: new CashPaymentProvider(),
  MOCK_ONLINE: new MockOnlinePaymentProvider(),
  // Future extensions (JazzCash, Easypaisa, etc.) can simply be plugged in here:
  // JAZZCASH: new JazzCashPaymentProvider(),
  // EASYPAISA: new EasypaisaPaymentProvider(),
};

export function getPaymentProvider(method: string): PaymentProvider {
  const provider = providers[method.toUpperCase()];
  if (!provider) {
    throw new Error(`Unsupported payment method: ${method}. Available: ${Object.keys(providers).join(", ")}`);
  }
  return provider;
}

export function getAllPaymentProviders(): PaymentProvider[] {
  return Object.values(providers);
}
