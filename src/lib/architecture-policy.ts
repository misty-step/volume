export type ModuleDomain =
  | "convex"
  | "packages/core"
  | "src/app"
  | "src/components"
  | "src/contexts"
  | "src/hooks"
  | "src/lib"
  | "other";

export interface BoundaryRule {
  fromDomain: ModuleDomain;
  forbiddenDomains: ModuleDomain[];
  message: string;
}

export interface BoundaryException {
  from: RegExp;
  toDomain: ModuleDomain;
  to?: RegExp;
}

export const BOUNDARY_RULES: BoundaryRule[] = [
  {
    fromDomain: "convex",
    forbiddenDomains: [
      "src/app",
      "src/components",
      "src/contexts",
      "src/hooks",
    ],
    message:
      "Convex backend modules may not depend on frontend route or UI layers.",
  },
  {
    fromDomain: "src/components",
    forbiddenDomains: ["src/app"],
    message: "Components may not depend on route modules.",
  },
  {
    fromDomain: "src/hooks",
    forbiddenDomains: ["src/app"],
    message: "Hooks may not depend on route modules.",
  },
  {
    fromDomain: "src/lib",
    forbiddenDomains: [
      "src/app",
      "src/components",
      "src/contexts",
      "src/hooks",
    ],
    message:
      "Library modules must stay independent of route, UI, and hook layers.",
  },
  {
    fromDomain: "packages/core",
    forbiddenDomains: [
      "convex",
      "src/app",
      "src/components",
      "src/contexts",
      "src/hooks",
      "src/lib",
    ],
    message:
      "Shared core modules may not depend on backend or app-specific layers.",
  },
];

export const BOUNDARY_EXCEPTIONS: BoundaryException[] = [
  {
    from: /^src\/lib\/coach\/presentation\/registry\.tsx$/,
    toDomain: "src/components",
    to: /^src\/components\/coach\/CoachSceneBlocks\.tsx$/,
  },
  {
    from: /^src\/lib\/coach\/presentation\/registry\.tsx$/,
    toDomain: "src/components",
    to: /^src\/components\/ui\/coach-block\.tsx$/,
  },
];
