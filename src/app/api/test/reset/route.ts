import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isServerProductionDeployment } from "@/lib/environment";
import { applyE2ETestSessionCookie } from "@/lib/e2e/test-session";

const TEST_SECRET_HEADER = "X-TEST-SECRET";

function isIgnorableResetError(error: unknown) {
  return error instanceof Error && /not found/i.test(error.message);
}

async function runResetMutation(
  convex: ConvexHttpClient,
  mutation: Parameters<ConvexHttpClient["mutation"]>[0],
  args: Parameters<ConvexHttpClient["mutation"]>[1]
) {
  try {
    await convex.mutation(mutation, args);
  } catch (error) {
    // Parallel E2E workers can race while clearing the same authenticated user.
    // Missing records mean another reset already removed the resource.
    if (isIgnorableResetError(error)) {
      return;
    }
    throw error;
  }
}

async function clearAuthenticatedE2EState(convex: ConvexHttpClient) {
  // CI talks to a hosted Convex deployment, so the reset path must only depend
  // on already-deployed public APIs instead of a branch-local test mutation.
  const sets = await convex.query(api.sets.listSets, {});
  for (const set of sets) {
    await runResetMutation(convex, api.sets.deleteSet, { id: set._id });
  }

  const exercises = await convex.query(api.exercises.listExercises, {
    includeDeleted: true,
  });
  for (const exercise of exercises) {
    await runResetMutation(convex, api.exercises.deleteExercise, {
      id: exercise._id,
    });
  }
}

export async function POST(request: NextRequest) {
  if (isServerProductionDeployment()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const configuredSecret = process.env.TEST_RESET_SECRET;
  const providedSecret = request.headers.get(TEST_SECRET_HEADER);

  if (!configuredSecret || providedSecret !== configuredSecret) {
    return new NextResponse("Invalid secret", { status: 401 });
  }

  const { userId, getToken } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      return new NextResponse("Missing NEXT_PUBLIC_CONVEX_URL", {
        status: 500,
      });
    }

    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(token);

    await clearAuthenticatedE2EState(convex);

    return applyE2ETestSessionCookie(
      new NextResponse("User data reset", { status: 200 })
    );
  } catch (error) {
    console.error("Reset failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
