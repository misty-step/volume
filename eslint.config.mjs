import path from "node:path";
import next from "eslint-config-next";

function isProcessEnv(node) {
  return (
    node?.type === "MemberExpression" &&
    node.object?.type === "Identifier" &&
    node.object.name === "process" &&
    node.property?.type === "Identifier" &&
    node.property.name === "env"
  );
}

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

function getRepoRelativePath(filename, marker) {
  const normalized = normalizePath(filename);
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex === -1) return null;
  return normalized.slice(markerIndex + marker.length);
}

function resolveSrcImport(context, source) {
  if (typeof source !== "string") return null;
  if (source.startsWith("@/")) {
    return source.slice(2);
  }

  if (!source.startsWith(".")) return null;

  const filename = normalizePath(context.filename || context.getFilename());
  const repoRelativePath = getRepoRelativePath(filename, "/src/");
  if (!repoRelativePath) return null;

  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(repoRelativePath), source)
  );

  return resolved.startsWith("../") ? null : resolved;
}

function isTypeOnlyImport(node) {
  if (node.importKind === "type") return true;
  return (
    node.specifiers.length > 0 &&
    node.specifiers.every((specifier) => specifier.importKind === "type")
  );
}

function createSrcBoundaryGuard(message, shouldReport) {
  return {
    meta: {
      type: "problem",
      docs: {
        description: message,
      },
      schema: [],
    },
    create(context) {
      const filename = normalizePath(context.filename || context.getFilename());
      const repoRelativePath = getRepoRelativePath(filename, "/src/");
      if (!repoRelativePath) {
        return {};
      }

      function reportIfNeeded(node, source, isTypeOnly = false) {
        const resolvedImport = resolveSrcImport(context, source);
        if (!resolvedImport) return;

        if (
          shouldReport({
            filename,
            repoRelativePath,
            resolvedImport,
            isTypeOnly,
          })
        ) {
          context.report({ node, message });
        }
      }

      return {
        ImportDeclaration(node) {
          reportIfNeeded(node, node.source.value, isTypeOnlyImport(node));
        },
        ExportNamedDeclaration(node) {
          if (!node.source) return;
          reportIfNeeded(node, node.source.value, node.exportKind === "type");
        },
        ExportAllDeclaration(node) {
          reportIfNeeded(node, node.source.value, node.exportKind === "type");
        },
      };
    },
  };
}

function isSrcLayer(resolvedImport, layerName) {
  return (
    resolvedImport === layerName || resolvedImport.startsWith(`${layerName}/`)
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

const convexRelativeImportGuard = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow relative imports that escape the convex/ directory boundary",
    },
    schema: [],
  },
  create(context) {
    function checkSource(node, source) {
      if (typeof source !== "string" || !source.startsWith("..")) return;

      // Allow known cross-boundary imports
      const stripped = source.replace(/^(\.\.\/)+/, "");
      if (
        stripped.startsWith("_generated") ||
        stripped.startsWith("packages/core")
      ) {
        return;
      }

      // Count ../ depth and compare to file depth within convex/
      const parentSteps = source.split("/").filter((s) => s === "..").length;
      const filename = (context.filename || context.getFilename()).replace(
        /\\/g,
        "/"
      );
      const convexIdx = filename.lastIndexOf("/convex/");
      if (convexIdx === -1) return;
      const relPath = filename.substring(convexIdx + "/convex/".length);
      // +1: a file at convex/foo.ts has depth 1, convex/ai/foo.ts has depth 2.
      // One ../ from depth 1 escapes; one ../ from depth 2 stays in convex.
      const fileDepth = relPath.split("/").length;

      if (parentSteps >= fileDepth) {
        context.report({
          node,
          message:
            "Use @/lib/... alias instead of relative imports that escape the convex/ directory.",
        });
      }
    }

    return {
      ImportDeclaration(node) {
        checkSource(node, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source) checkSource(node, node.source.value);
      },
      ExportAllDeclaration(node) {
        checkSource(node, node.source.value);
      },
    };
  },
};

const hookComponentBoundaryGuard = createSrcBoundaryGuard(
  "Hooks may not import runtime values from components. Move the dependency into lib or pass it in from a component.",
  ({ repoRelativePath, resolvedImport, isTypeOnly }) =>
    repoRelativePath.startsWith("hooks/") &&
    isSrcLayer(resolvedImport, "components") &&
    !isTypeOnly
);

const libLayerBoundaryGuard = createSrcBoundaryGuard(
  "Lib modules may not import from app, components, hooks, or contexts.",
  ({ repoRelativePath, resolvedImport }) => {
    if (!repoRelativePath.startsWith("lib/")) return false;

    const disallowedLayers = ["app", "hooks", "contexts"];
    if (disallowedLayers.some((layer) => isSrcLayer(resolvedImport, layer))) {
      return true;
    }

    if (!isSrcLayer(resolvedImport, "components")) {
      return false;
    }

    return !repoRelativePath.startsWith("lib/coach/presentation/");
  }
);

const appRouteBoundaryGuard = createSrcBoundaryGuard(
  "Only files under src/app may import from app routes.",
  ({ repoRelativePath, resolvedImport }) =>
    !repoRelativePath.startsWith("app/") && isSrcLayer(resolvedImport, "app")
);

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
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    ignores: ["src/**/*.test.{js,jsx,ts,tsx}", "src/**/*.spec.{js,jsx,ts,tsx}"],
    plugins: {
      local: {
        rules: {
          "next-env-direct-access": nextEnvDirectAccessGuard,
          "client-env-guard": clientEnvGuard,
          "hook-component-boundary": hookComponentBoundaryGuard,
          "lib-layer-boundary": libLayerBoundaryGuard,
          "app-route-boundary": appRouteBoundaryGuard,
        },
      },
    },
    rules: {
      "local/next-env-direct-access": "error",
      "local/hook-component-boundary": "error",
      "local/lib-layer-boundary": "error",
      "local/app-route-boundary": "error",
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
    files: ["convex/**/*.ts"],
    ignores: ["convex/_generated/**"],
    plugins: {
      "convex-local": {
        rules: {
          "no-relative-escape": convexRelativeImportGuard,
        },
      },
    },
    rules: {
      "convex-local/no-relative-escape": "error",
    },
  },
  {
    files: [
      "src/**/*.{js,jsx,ts,tsx}",
      "convex/**/*.ts",
      "packages/core/src/**/*.ts",
    ],
    ignores: [
      "src/**/*.test.{js,jsx,ts,tsx}",
      "src/**/*.spec.{js,jsx,ts,tsx}",
      "src/**/*.test-d.ts",
      "convex/_generated/**",
      "convex/**/*.test.ts",
      "convex/**/*.spec.ts",
      "packages/core/src/**/*.test.ts",
      "packages/core/src/**/*.spec.ts",
    ],
    rules: {
      complexity: ["error", 30],
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
