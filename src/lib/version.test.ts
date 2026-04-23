import { describe, expect, it } from "vitest";

import { resolveVersion } from "./version";

describe("resolveVersion", () => {
  it("prefers VERCEL_GIT_COMMIT_SHA over other sources", () => {
    const env = {
      VERCEL_GIT_COMMIT_SHA: "deadbeef",
      NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: "cafebabe",
      NEXT_PUBLIC_PACKAGE_VERSION: "0.3.0",
      npm_package_version: "0.2.0",
    };

    expect(resolveVersion(env)).toBe("deadbee");
  });

  it("uses VERCEL_GIT_COMMIT_SHA when NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA is also present", () => {
    const env = {
      VERCEL_GIT_COMMIT_SHA: "1234567890abcdef",
      NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: "fedcba9876",
      npm_package_version: "0.2.0",
    };

    expect(resolveVersion(env)).toBe("1234567");
  });

  it("falls back to NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA when server SHA is missing", () => {
    const env = {
      VERCEL_GIT_COMMIT_SHA: undefined,
      NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: "abcdef123456",
      npm_package_version: "0.2.0",
    };

    expect(resolveVersion(env)).toBe("abcdef1");
  });

  it("uses npm_package_version when no git SHA or public package version exists", () => {
    const env = {
      VERCEL_GIT_COMMIT_SHA: undefined,
      NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: undefined,
      npm_package_version: "0.3.1",
    };

    expect(resolveVersion(env)).toBe("0.3.1");
  });

  it("falls back to dev when nothing is provided", () => {
    const env = {
      VERCEL_GIT_COMMIT_SHA: undefined,
      NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: undefined,
      npm_package_version: undefined,
    };

    expect(resolveVersion(env)).toBe("dev");
  });

  it("does not shorten non-hex identifiers", () => {
    const env = {
      VERCEL_GIT_COMMIT_SHA: "not-a-sha-value",
      NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: undefined,
      npm_package_version: undefined,
    };

    expect(resolveVersion(env)).toBe("not-a-sha-value");
  });

  it("treats empty strings as absent and falls back through priority chain", () => {
    const env = {
      VERCEL_GIT_COMMIT_SHA: "",
      NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: "",
      NEXT_PUBLIC_PACKAGE_VERSION: "0.3.1",
      npm_package_version: "0.2.0",
    };

    expect(resolveVersion(env)).toBe("0.3.1");
  });

  describe("Empty String Handling", () => {
    it("filters out empty string for VERCEL_GIT_COMMIT_SHA", () => {
      const env = {
        VERCEL_GIT_COMMIT_SHA: "",
        NEXT_PUBLIC_PACKAGE_VERSION: "0.2.0",
      };
      expect(resolveVersion(env)).toBe("0.2.0");
    });

    it("filters out whitespace-only git SHAs", () => {
      const env = {
        VERCEL_GIT_COMMIT_SHA: "   ",
        NEXT_PUBLIC_PACKAGE_VERSION: "0.2.0",
      };
      expect(resolveVersion(env)).toBe("0.2.0");
    });

    it("filters out whitespace in NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA", () => {
      const env = {
        NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: "  \t\n  ",
        NEXT_PUBLIC_PACKAGE_VERSION: "0.2.0",
      };
      expect(resolveVersion(env)).toBe("0.2.0");
    });

    it("falls back through all empty strings to dev", () => {
      const env = {
        VERCEL_GIT_COMMIT_SHA: "",
        NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: "",
        NEXT_PUBLIC_PACKAGE_VERSION: "",
        npm_package_version: "",
      };
      expect(resolveVersion(env)).toBe("dev");
    });
  });

  describe("NEXT_PUBLIC_PACKAGE_VERSION Priority", () => {
    it("uses NEXT_PUBLIC_PACKAGE_VERSION ahead of npm_package_version", () => {
      const env = {
        NEXT_PUBLIC_PACKAGE_VERSION: "0.3.0",
        npm_package_version: "0.2.0",
      };
      expect(resolveVersion(env)).toBe("0.3.0");
    });

    it("prefers git SHA over NEXT_PUBLIC_PACKAGE_VERSION", () => {
      const env = {
        VERCEL_GIT_COMMIT_SHA: "abcdef1234567890",
        NEXT_PUBLIC_PACKAGE_VERSION: "0.3.0",
      };
      expect(resolveVersion(env)).toBe("abcdef1");
    });

    it("prefers NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA over NEXT_PUBLIC_PACKAGE_VERSION", () => {
      const env = {
        NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: "1234567890abcdef",
        NEXT_PUBLIC_PACKAGE_VERSION: "0.3.0",
      };
      expect(resolveVersion(env)).toBe("1234567");
    });
  });

  describe("Production Environment Simulation", () => {
    it("matches Vercel production environment (empty git vars)", () => {
      const env = {
        VERCEL_GIT_COMMIT_SHA: "",
        NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: "",
        NEXT_PUBLIC_PACKAGE_VERSION: "0.1.0", // Injected at build
      };
      expect(resolveVersion(env)).toBe("0.1.0");
    });

    it("handles production with only NEXT_PUBLIC_PACKAGE_VERSION", () => {
      const env = {
        NEXT_PUBLIC_PACKAGE_VERSION: "1.2.3",
      };
      expect(resolveVersion(env)).toBe("1.2.3");
    });
  });
});
