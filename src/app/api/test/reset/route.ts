import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isServerProductionDeployment } from "@/lib/environment";
import { api } from "@/../convex/_generated/api";

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

  const { userId, getToken } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return new NextResponse("Missing NEXT_PUBLIC_CONVEX_URL", { status: 500 });
  }

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(token);

  try {
    // E2E CI runs the branch's Next app against a long-lived Convex deployment.
    // Reset through stable public APIs so cleanup stays compatible even when
    // branch-only test helpers have not been deployed to that backend yet.
    const [sets, exercises] = await Promise.all([
      convex.query(api.sets.listSets, {}),
      convex.query(api.exercises.listExercises, { includeDeleted: true }),
    ]);

    await Promise.all(
      sets.map((set) =>
        convex.mutation(api.sets.deleteSet, {
          id: set._id,
        })
      )
    );

    await Promise.all(
      exercises.map((exercise) =>
        convex.mutation(api.exercises.deleteExercise, {
          id: exercise._id,
        })
      )
    );

    return new NextResponse("User data reset", { status: 200 });
  } catch (error) {
    console.error("Reset failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
