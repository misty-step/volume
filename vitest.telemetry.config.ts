import { mergeConfig, defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: [
        "src/lib/analytics/**/__tests__/**/*.test.{ts,tsx}",
        "src/lib/analytics/**/*.{test,spec}.{ts,tsx}",
        "src/lib/analytics.test-d.ts",
      ],
      coverage: {
        include: ["src/lib/analytics/**", "src/app/api/test-error/**"],
        thresholds: {
          lines: 85,
          statements: 85,
          functions: 80,
          branches: 70,
        },
      },
    },
  })
);
