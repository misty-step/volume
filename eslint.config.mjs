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
      "no-console": ["error", { allow: ["warn", "error"] }],
      // @typescript-eslint/no-floating-promises requires typed linting (parserOptions.project)
      // Defer until tsconfig.eslint.json is wired into parserOptions — see tsconfig.eslint.json
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/--workspace-/]",
          message:
            "--workspace-* CSS variables are deprecated. Use main design tokens.",
        },
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/#[0-9a-fA-F]{3,8}/]",
          message:
            "Use design token CSS variables, not hardcoded hex colors in className",
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
