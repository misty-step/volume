import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    pool: "forks",
    poolOptions: {
      forks: { maxForks: 4 },
    },
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "json"],
      reportOnFailure: true,
      include: ["src/**/*", "convex/**/*", "packages/core/src/**/*"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
        "**/*.test-d.ts",
        "**/convex/_generated/**",
        "**/node_modules/**",
        "**/.next/**",
        "**/dist/**",
        "**/src/types/**",
        "**/src/lib/design-tokens/**",
        "**/*.d.ts",
        "**/*.config.ts",
        "**/*.config.mjs",
        "**/convex/auth.config.ts",
        "**/convex/crons.ts",
        "**/e2e/**",
        "**/src/app/**/page.tsx",
        "**/src/app/**/route.ts",
        "**/src/app/**/*-icon.tsx",
        "**/src/app/**/*-image.tsx",
        "**/middleware.ts",
        "**/convex/admin/**",
        "**/scripts/**", // CLI wrappers, not library code
      ],
      thresholds: {
        lines: 52,
        functions: 73,
        branches: 83,
        statements: 52,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
