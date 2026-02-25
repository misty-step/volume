import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isServerProductionDeployment } from "@/lib/environment";

const TEST_SECRET_HEADER = "X-TEST-SECRET";

export async function POST(request: NextRequest) {
  // Never expose test-reset behavior in production deployments.
  if (isServerProductionDeployment()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const configuredSecret = process.env.TEST_RESET_SECRET;
  const providedSecret = request.headers.get(TEST_SECRET_HEADER);

  // Fail closed when secret config is missing/empty or request secret mismatches.
  if (!configuredSecret || providedSecret !== configuredSecret) {
    return new NextResponse("Invalid secret", { status: 401 });
  }

  const user = await currentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await fetchMutation(api.test.resetUserData.resetUserData, {
      userId: user.id,
      secret: configuredSecret,
    });

    return new NextResponse("User data reset", { status: 200 });
  } catch (error) {
    console.error("Reset failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
