export const STRIPE_API_VERSION = "2026-01-28.clover";

export function getRequiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required Stripe environment variable: ${key}`);
  }
  return value;
}

// Price IDs - validated at module load (Next.js requires static access)
const monthlyPriceId = process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID?.trim();
const annualPriceId = process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID?.trim();

if (!monthlyPriceId || !annualPriceId) {
  const missing = [
    !monthlyPriceId && "NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID",
    !annualPriceId && "NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID",
  ].filter(Boolean);
  throw new Error(`Missing Stripe price IDs: ${missing.join(", ")}`);
}

export const PRICE_IDS = {
  monthly: monthlyPriceId,
  annual: annualPriceId,
} as const;
