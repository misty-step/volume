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
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/--workspace-/]",
          message:
            "--workspace-* CSS variables are deprecated. Use main design tokens.",
        },
      ],
    },
  },
  {
    files: ["e2e/**/*"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default config;
