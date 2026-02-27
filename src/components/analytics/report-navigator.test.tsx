import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReportNavigator } from "./report-navigator";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
}));

describe("ReportNavigator", () => {
  it("renders without crashing when data is loading", () => {
    render(<ReportNavigator />);
    // Tab buttons should be visible
    expect(screen.getByText("Daily")).toBeDefined();
    expect(screen.getByText("Weekly")).toBeDefined();
    expect(screen.getByText("Monthly")).toBeDefined();
  });
});
