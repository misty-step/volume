import { ConvexHttpClient } from "convex/browser";
import { api } from "@/../convex/_generated/api";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { reportError } from "@/lib/analytics";
import { isServerProductionDeployment } from "@/lib/environment";
import { applyE2ETestSessionCookie } from "@/lib/e2e/test-session";
import { createChildLogger } from "@/lib/logger";

const TEST_SECRET_HEADER = "X-TEST-SECRET";
const TRANSIENT_RESET_RETRY_DELAYS_MS = [250, 500];
const routeLog = createChildLogger({ route: "test/reset" });

function isIgnorableResetError(error: unknown) {
  return error instanceof Error && /not found/i.test(error.message);
}

function isTransientResetError(error: unknown) {
  return (
    error instanceof Error &&
    /\b502\b|\b503\b|\b504\b|bad gateway|gateway timeout|service unavailable|fetch failed|network error/i.test(
      error.message
    )
  );
}

async function sleep(ms: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function retryTransientResetOperation<T>(operation: () => Promise<T>) {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      const delayMs = TRANSIENT_RESET_RETRY_DELAYS_MS[attempt];
      if (!isTransientResetError(error) || delayMs === undefined) {
        throw error;
      }

      routeLog.warn("Transient Convex reset failure, retrying", {
        attempt: attempt + 1,
        delayMs,
        error,
      });
      attempt += 1;
      await sleep(delayMs);
    }
  }
}

async function runResetMutation(
  convex: ConvexHttpClient,
  mutation: Parameters<ConvexHttpClient["mutation"]>[0],
  args: Parameters<ConvexHttpClient["mutation"]>[1]
) {
  try {
    await retryTransientResetOperation(() => convex.mutation(mutation, args));
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
  const sets = await retryTransientResetOperation(() =>
    convex.query(api.sets.listSets, {})
  );
  for (const set of sets) {
    await runResetMutation(convex, api.sets.deleteSet, { id: set._id });
  }

  const exercises = await retryTransientResetOperation(() =>
    convex.query(api.exercises.listExercises, {
      includeDeleted: true,
    })
  );
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
    const resetError =
      error instanceof Error ? error : new Error("Unknown reset error");
    routeLog.error("Authenticated E2E reset failed", { error: resetError });
    reportError(resetError, { context: "test/reset" });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
