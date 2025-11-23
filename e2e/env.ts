import { z } from "zod";

const EnvSchema = z.object({
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_JWT_ISSUER_DOMAIN: z.string().min(1),
  CLERK_TEST_USER_EMAIL: z.string().min(1),
  CLERK_TEST_USER_PASSWORD: z.string().min(1),
  TEST_RESET_SECRET: z.string().min(1),
});

export type E2EEnv = z.infer<typeof EnvSchema>;

export function loadE2EEnv(): E2EEnv {
  // Normalize environment variables for Clerk keys
  const env = { ...process.env };

  if (!env.CLERK_PUBLISHABLE_KEY && env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    env.CLERK_PUBLISHABLE_KEY = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  }
  if (!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && env.CLERK_PUBLISHABLE_KEY) {
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = env.CLERK_PUBLISHABLE_KEY;
  }

  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const missing = parsed.error.issues
      .map((issue) => issue.path.join("."))
      .filter((key) => key);
    throw new Error(
      `Missing required E2E env vars: ${missing.join(", ")}. Set them in CI secrets/vars.`
    );
  }
  return parsed.data;
}
