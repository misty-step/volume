export const STRIPE_API_VERSION = "2026-02-25.clover";

type RequiredStripeEnvKey = "STRIPE_SECRET_KEY";

function readRequiredStripeEnv(key: RequiredStripeEnvKey): string | undefined {
  if (key === "STRIPE_SECRET_KEY") {
    return process.env.STRIPE_SECRET_KEY?.trim() || undefined;
  }

  return undefined;
}

export function getRequiredEnv(key: RequiredStripeEnvKey): string {
  const value = readRequiredStripeEnv(key);
  if (!value) {
    throw new Error(`Missing required Stripe environment variable: ${key}`);
  }
  return value;
}

export type StripePriceIds = {
  monthly: string;
  annual: string;
};

export function getPriceIds(): StripePriceIds {
  const monthlyPriceId =
    process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID?.trim();
  const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID?.trim();

  if (!monthlyPriceId || !annualPriceId) {
    const missing = [
      !monthlyPriceId && "NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID",
      !annualPriceId && "NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID",
    ].filter(Boolean);
    throw new Error(`Missing Stripe price IDs: ${missing.join(", ")}`);
  }

  return {
    monthly: monthlyPriceId,
    annual: annualPriceId,
  };
}
