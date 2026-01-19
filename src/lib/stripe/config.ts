export const STRIPE_API_VERSION = "2025-12-15.clover";

export function getRequiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required Stripe environment variable: ${key}`);
  }
  return value;
}

// Price IDs - set these in Stripe Dashboard (use NEXT_PUBLIC_ for client access)
export const PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
  annual: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID,
} as const;
