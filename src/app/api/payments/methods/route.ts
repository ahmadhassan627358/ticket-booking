import { NextResponse } from "next/server";
import { getAllPaymentProviders } from "@/lib/payments";

export async function GET() {
  const providers = getAllPaymentProviders();

  const methods = [
    {
      id: "EASYPAISA",
      name: "Easypaisa Mobile Wallet",
      description: "Pay using your Easypaisa registered 03XX mobile account with instant MPIN approval.",
      category: "MOBILE_WALLET",
      currency: "PKR",
      badge: "Popular in Pakistan",
      icon: "Smartphone",
      color: "#00c389",
      testCredentials: {
        testWallet: "0345-1234567",
        note: "In sandbox mode, any valid 03XX number works.",
      },
    },
    {
      id: "JAZZCASH",
      name: "JazzCash Mobile Account",
      description: "Pay instantly via JazzCash Mobile Account with USSD prompt on your phone.",
      category: "MOBILE_WALLET",
      currency: "PKR",
      badge: "Fastest Checkout",
      icon: "Smartphone",
      color: "#f68b1f",
      testCredentials: {
        testWallet: "0300-1234567",
        note: "In sandbox mode, any valid 03XX number works.",
      },
    },
    {
      id: "STRIPE",
      name: "Stripe (International & Local Cards)",
      description: "Pay securely with Visa, Mastercard, American Express, Apple Pay, or Google Pay.",
      category: "CREDIT_DEBIT_CARD",
      currency: "PKR",
      badge: "Global & 3D Secure",
      icon: "CreditCard",
      color: "#635bff",
      testCredentials: {
        testCard: "4242 4242 4242 4242",
        expiry: "12/28",
        cvc: "123",
      },
    },
    {
      id: "MOCK_ONLINE",
      name: "Instant Card / Digital Simulator",
      description: "Pay with Visa, Mastercard, or PayPak card simulation for instant confirmation.",
      category: "CARD_SIMULATOR",
      currency: "PKR",
      badge: "Test Simulator",
      icon: "CreditCard",
      color: "#2563eb",
      testCredentials: {
        testCard: "4242 4242 4242 4242",
      },
    },
    {
      id: "CASH",
      name: "Cash at Terminal Counter",
      description: "Reserve your seat now and pay cash at the bus terminal counter before departure.",
      category: "CASH_COUNTER",
      currency: "PKR",
      badge: "Pay Later",
      icon: "Banknote",
      color: "#eab308",
      notes: "Seat is held and automatically released 2 hours before trip departure if unpaid.",
    },
  ];

  return NextResponse.json({
    success: true,
    totalMethods: methods.length,
    methods,
  });
}
