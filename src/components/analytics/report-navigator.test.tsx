import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReportNavigator } from "./report-navigator";
import { api } from "../../../convex/_generated/api";

const mockUseAuth = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

const baseUser = {
  _id: "convex_user_123",
  timezone: "America/Los_Angeles",
  createdAt: Date.UTC(2024, 0, 1),
};

const baseReports = [
  {
    _id: "report_weekly_1",
    reportType: "weekly",
    generatedAt: Date.now(),
    content: "Test report content",
    model: "gpt-4",
    tokenUsage: {
      input: 100,
      output: 200,
      costUSD: 0.01,
    },
  },
];

describe("ReportNavigator security logging", () => {
  afterEach(() => {
    mockUseAuth.mockReset();
    mockUseQuery.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("does not log user info in production builds", async () => {
    vi.stubEnv("NODE_ENV", "production");

    mockUseAuth.mockReturnValue({ userId: "user_123" });
    mockUseQuery.mockImplementation((queryKey, ...args) => {
      // Check if this is getCurrentUser (no args) vs getReportHistory (has args)
      const isGetCurrentUser = args.length === 0;
      return isGetCurrentUser ? baseUser : baseReports;
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    render(<ReportNavigator />);

    await waitFor(() => {
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  it("logs user info when not in production", async () => {
    vi.stubEnv("NODE_ENV", "development");

    mockUseAuth.mockReturnValue({ userId: "user_123" });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    mockUseQuery.mockImplementation((queryKey, ...args) => {
      // Check if this is getCurrentUser (no args) vs getReportHistory (has args)
      const isGetCurrentUser = args.length === 0;
      return isGetCurrentUser ? baseUser : baseReports;
    });

    render(<ReportNavigator />);

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalledWith(
        "[Report Navigator Debug] User Info:",
        expect.objectContaining({
          clerkUserId: "user_123",
          convexUserId: baseUser._id,
          timezone: baseUser.timezone,
        })
      );
    });
  });
});
