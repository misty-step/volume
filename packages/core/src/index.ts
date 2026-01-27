/**
 * @volume/core - Shared business logic for Volume workout tracker
 *
 * Platform-agnostic calculations and utilities used by:
 * - Next.js web app (src/)
 * - Convex backend (convex/)
 * - React Native mobile app (future)
 */

// Types
export * from "./types";

// Modules will be exported as they are implemented:
export * from "./pr-detection";
export * from "./streak";
export * from "./date-calc";
export * from "./validation";
// export * from "./muscle-groups";
// export * from "./weight-conversion";
