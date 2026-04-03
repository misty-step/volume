import next from "eslint-config-next";

const MAX_ARCHITECTURE_COMPLEXITY = 40;

function isProcessEnv(node) {
  return (
    node?.type === "MemberExpression" &&
    node.object?.type === "Identifier" &&
    node.object.name === "process" &&
    node.property?.type === "Identifier" &&
    node.property.name === "env"
  );
}

const nextEnvDirectAccessGuard = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require direct process.env.NAME access so Next.js can statically expose env variables",
    },
    schema: [],
  },
  create(context) {
    function reportComputedAccess(node) {
      context.report({
        node,
        message:
          "Read environment variables as process.env.NAME so Next.js can statically expose them.",
      });
    }

    function reportProcessEnvAlias(node) {
      context.report({
        node,
        message:
          "Do not alias process.env in app code. Read environment variables as process.env.NAME.",
      });
    }

    return {
      MemberExpression(node) {
        if (!isProcessEnv(node.object) || !node.computed) return;
        reportComputedAccess(node.property);
      },
      VariableDeclarator(node) {
        if (!isProcessEnv(node.init)) return;
        reportProcessEnvAlias(node.id);
      },
      AssignmentExpression(node) {
        if (node.left.type === "Identifier" && isProcessEnv(node.right)) {
          reportProcessEnvAlias(node.left);
        }
      },
    };
  },
};

const clientEnvGuard = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow server-only environment variables inside .client modules",
    },
    schema: [],
  },
  create(context) {
    function isAllowedEnvName(name) {
      return name === "NODE_ENV" || name.startsWith("NEXT_PUBLIC_");
    }

    function reportIfDisallowed(name, node) {
      if (isAllowedEnvName(name)) return;

      context.report({
        node,
        message:
          "Client modules may only read NEXT_PUBLIC_* or NODE_ENV from process.env.",
      });
    }

    function reportProcessEnvAlias(node) {
      context.report({
        node,
        message:
          "Client modules may not alias process.env. Read NEXT_PUBLIC_* or NODE_ENV directly.",
      });
    }

    function reportComputedClientAccess(node) {
      context.report({
        node,
        message:
          "Client modules may not use computed process.env access. Read NEXT_PUBLIC_* or NODE_ENV directly.",
      });
    }

    return {
      MemberExpression(node) {
        if (!isProcessEnv(node.object)) return;

        if (!node.computed && node.property.type === "Identifier") {
          reportIfDisallowed(node.property.name, node.property);
          return;
        }

        if (
          node.computed &&
          node.property.type === "Literal" &&
          typeof node.property.value === "string"
        ) {
          reportIfDisallowed(node.property.value, node.property);
          return;
        }

        if (node.computed) {
          reportComputedClientAccess(node.property);
        }
      },
      VariableDeclarator(node) {
        if (node.id.type === "Identifier" && isProcessEnv(node.init)) {
          reportProcessEnvAlias(node.id);
          return;
        }

        if (
          node.id.type !== "ObjectPattern" ||
          !isProcessEnv(node.init)
        ) {
          return;
        }

        for (const property of node.id.properties) {
          if (property.type !== "Property") continue;

          const key =
            property.key.type === "Identifier"
              ? property.key.name
              : typeof property.key.value === "string"
                ? property.key.value
                : null;

          if (key) {
            reportIfDisallowed(key, property.key);
          }
        }
      },
      AssignmentExpression(node) {
        if (node.left.type === "Identifier" && isProcessEnv(node.right)) {
          reportProcessEnvAlias(node.left);
        }
      },
    };
  },
};

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
    files: ["src/**/*.{js,jsx,ts,tsx}", "convex/**/*.ts"],
    ignores: [
      "src/**/*.test.{js,jsx,ts,tsx}",
      "src/**/*.spec.{js,jsx,ts,tsx}",
      "src/**/*.test-d.ts",
      "convex/**/*.test.ts",
      "convex/_generated/**",
    ],
    rules: {
      complexity: ["error", MAX_ARCHITECTURE_COMPLEXITY],
    },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    ignores: ["src/**/*.test.{js,jsx,ts,tsx}", "src/**/*.spec.{js,jsx,ts,tsx}"],
    plugins: {
      local: {
        rules: {
          "next-env-direct-access": nextEnvDirectAccessGuard,
          "client-env-guard": clientEnvGuard,
        },
      },
    },
    rules: {
      "local/next-env-direct-access": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
      // TODO: @typescript-eslint/no-floating-promises requires typed linting (parserOptions.project).
      // Add tsconfig.eslint.json + wire parserOptions when ready to take the lint-speed hit.
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
    files: ["src/**/*.client.{js,jsx,ts,tsx}"],
    rules: {
      "local/client-env-guard": "error",
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
