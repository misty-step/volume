import type { ReactNode } from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PostHogProvider } from "./posthog-provider";

const mockInit = vi.fn();
const mockOptOutCapturing = vi.fn();
const originalDoNotTrack = navigator.doNotTrack;
const originalGlobalPrivacyControl = (
  navigator as Navigator & { globalPrivacyControl?: boolean }
).globalPrivacyControl;

vi.mock("posthog-js", () => ({
  default: {
    init: (...args: unknown[]) => mockInit(...args),
    opt_out_capturing: (...args: unknown[]) => mockOptOutCapturing(...args),
  },
}));

vi.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="posthog-provider">{children}</div>
  ),
}));

function resetPosthogEnv() {
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
  delete process.env.NEXT_PUBLIC_POSTHOG_UI_HOST;
  delete process.env.NEXT_PUBLIC_POSTHOG_INGEST_HOST;
  delete process.env.NEXT_PUBLIC_DISABLE_ANALYTICS;
}

function setDoNotTrack(value?: string) {
  Object.defineProperty(navigator, "doNotTrack", {
    configurable: true,
    value,
  });
}

function setGlobalPrivacyControl(value?: boolean) {
  Object.defineProperty(navigator, "globalPrivacyControl", {
    configurable: true,
    value,
  });
}

describe("PostHogProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPosthogEnv();
    setDoNotTrack(undefined);
    setGlobalPrivacyControl(undefined);
  });

  afterEach(() => {
    resetPosthogEnv();
    setDoNotTrack(originalDoNotTrack ?? undefined);
    setGlobalPrivacyControl(originalGlobalPrivacyControl);
  });

  it("initializes with /ingest fallback and derives ui host from ingest host", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "test-key";
    process.env.NEXT_PUBLIC_POSTHOG_INGEST_HOST = "https://eu.i.posthog.com";
    setDoNotTrack("1");

    render(
      <PostHogProvider>
        <span>child</span>
      </PostHogProvider>
    );

    await waitFor(() =>
      expect(mockInit).toHaveBeenCalledWith("test-key", {
        api_host: "/ingest",
        ui_host: "https://eu.posthog.com",
        capture_pageview: "history_change",
      })
    );
    expect(mockOptOutCapturing).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("posthog-provider")).toBeInTheDocument();
  });

  it("prefers explicit hosts when configured", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "test-key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://analytics.example.com";
    process.env.NEXT_PUBLIC_POSTHOG_UI_HOST = "https://app.example.com";
    setDoNotTrack("0");

    render(
      <PostHogProvider>
        <span>child</span>
      </PostHogProvider>
    );

    await waitFor(() =>
      expect(mockInit).toHaveBeenCalledWith("test-key", {
        api_host: "https://analytics.example.com",
        ui_host: "https://app.example.com",
        capture_pageview: "history_change",
      })
    );
    expect(mockOptOutCapturing).not.toHaveBeenCalled();
  });

  it("renders children without initializing when key is missing", () => {
    render(
      <PostHogProvider>
        <span>child</span>
      </PostHogProvider>
    );

    expect(mockInit).not.toHaveBeenCalled();
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(screen.queryByTestId("posthog-provider")).not.toBeInTheDocument();
  });

  it("opts out when Global Privacy Control is enabled", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "test-key";
    setGlobalPrivacyControl(true);

    render(
      <PostHogProvider>
        <span>child</span>
      </PostHogProvider>
    );

    await waitFor(() => expect(mockInit).toHaveBeenCalledTimes(1));
    expect(mockOptOutCapturing).toHaveBeenCalledTimes(1);
  });

  it("does not initialize when analytics are explicitly disabled", () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "test-key";
    process.env.NEXT_PUBLIC_DISABLE_ANALYTICS = "true";

    render(
      <PostHogProvider>
        <span>child</span>
      </PostHogProvider>
    );

    expect(mockInit).not.toHaveBeenCalled();
    expect(screen.queryByTestId("posthog-provider")).not.toBeInTheDocument();
  });
});
