import { PaymentProvider } from "./types";
import { CashPaymentProvider } from "./cashProvider";
import { MockOnlinePaymentProvider } from "./mockOnlineProvider";
import { EasypaisaPaymentProvider } from "./easypaisaProvider";
import { JazzCashPaymentProvider } from "./jazzcashProvider";
import { StripePaymentProvider } from "./stripeProvider";

export * from "./types";
export * from "./cashProvider";
export * from "./mockOnlineProvider";
export * from "./easypaisaProvider";
export * from "./jazzcashProvider";
export * from "./stripeProvider";

const providers: Record<string, PaymentProvider> = {
  CASH: new CashPaymentProvider(),
  MOCK_ONLINE: new MockOnlinePaymentProvider(),
  EASYPAISA: new EasypaisaPaymentProvider(),
  JAZZCASH: new JazzCashPaymentProvider(),
  STRIPE: new StripePaymentProvider(),
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
