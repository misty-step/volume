import "@testing-library/jest-dom";
import { vi } from "vitest";
import React from "react";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useAction: vi.fn(),
  useConvex: vi.fn(),
  Authenticated: ({ children }: { children: React.ReactNode }) => children,
  Unauthenticated: ({ children }: { children: React.ReactNode }) => null,
  AuthLoading: ({ children }: { children: React.ReactNode }) => null,
}));

// Mock ResizeObserver for cmdk (Command menu)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock;

// Mock scrollIntoView for Radix/cmdk
Element.prototype.scrollIntoView = vi.fn();

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
