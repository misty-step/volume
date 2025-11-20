import { mergeConfig, defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: [
        "src/lib/analytics/**/__tests__/**/*.test.{ts,tsx}",
        "src/lib/analytics/**/*.{test,spec}.{ts,tsx}",
      ],
      exclude: ["**/*.test-d.ts"],
      coverage: {
        include: ["src/lib/analytics/**", "src/app/api/test-error/**"],
        // Exclude thin wrappers and dev-only routes from thresholds
        exclude: [
          "src/lib/analytics/instrumentation/**",
          "src/app/api/test-error/**",
        ],
        thresholds: {
          lines: 70,
          statements: 70,
          functions: 75,
          branches: 70,
        },
      },
    },
  })
);
