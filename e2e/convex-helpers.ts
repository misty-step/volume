import { ConvexHttpClient } from "convex/browser";
import type { Page } from "@playwright/test";
import { api } from "../convex/_generated/api";
import { waitForClerkLoaded } from "./clerk-helpers";
import { loadE2EEnv } from "./env";

async function getConvexToken(page: Page): Promise<string> {
  await waitForClerkLoaded(page);

  const token = await page.evaluate(async () => {
    const clerkGlobal = (window as Window & { Clerk?: any }).Clerk;
    return clerkGlobal?.session?.getToken
      ? await clerkGlobal.session.getToken({ template: "convex" })
      : null;
  });

  if (!token) {
    throw new Error("Missing Clerk Convex token for authenticated E2E helper.");
  }

  return token;
}

function createConvexClient(token: string): ConvexHttpClient {
  const env = loadE2EEnv();
  const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
  client.setAuth(token);
  return client;
}

export async function createExerciseForCurrentUser(
  page: Page,
  name: string
): Promise<string> {
  const token = await getConvexToken(page);
  const client = createConvexClient(token);
  return client.action(api.exercises.createExercise, { name });
}
