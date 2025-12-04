import next from "eslint-config-next";

/** @type {import("eslint").Linter.FlatConfig[]} */
const config = [
  {
    ignores: [
      "**/node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "convex/_generated/**",
    ],
  },
  ...next,
  {
    files: ["e2e/**/*"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default config;
