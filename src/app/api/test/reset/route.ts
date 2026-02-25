import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getDeploymentEnvironment } from "@/lib/environment";

export async function POST(request: NextRequest) {
  // Block test endpoints in production deployments.
  // Vercel preview uses NODE_ENV=production, so rely on deployment env detection.
  if (
    getDeploymentEnvironment({ preferClientFallback: false }) === "production"
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // 2. Secret Check
  const secret = request.headers.get("X-TEST-SECRET");
  if (secret !== process.env.TEST_RESET_SECRET) {
    return new NextResponse("Invalid secret", { status: 401 });
  }

  // 3. Auth Check
  // We need the userId to reset.
  // Option A: The caller provides it (e.g. global setup using admin API).
  // Option B: The caller is authenticated as the user (via Cookie).

  // Since Playwright uses the authenticated browser context, cookies are sent.
  // We can use Clerk to get the current user.
  const user = await currentUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // 4. Call Convex Mutation
    // We use fetchMutation to call the public mutation with the secret
    await fetchMutation(api.test.resetUserData.resetUserData, {
      userId: user.id,
      secret: process.env.TEST_RESET_SECRET || "", // Pass the secret from Next.js env to Convex
    });

    return new NextResponse("User data reset", { status: 200 });
  } catch (error) {
    console.error("Reset failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
