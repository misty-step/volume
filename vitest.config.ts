import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary", "json"],
      reportOnFailure: true,
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
      ],
      thresholds: {
        lines: 50,
        functions: 70,
        branches: 85,
        statements: 50,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
