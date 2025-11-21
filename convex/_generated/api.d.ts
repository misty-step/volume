/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai_openai from "../ai/openai.js";
import type * as ai_prompts from "../ai/prompts.js";
import type * as ai_reports from "../ai/reports.js";
import type * as analytics from "../analytics.js";
import type * as analyticsFocus from "../analyticsFocus.js";
import type * as analyticsProgressiveOverload from "../analyticsProgressiveOverload.js";
import type * as analyticsRecovery from "../analyticsRecovery.js";
import type * as crons from "../crons.js";
import type * as exercises from "../exercises.js";
import type * as lib_pr_detection from "../lib/pr_detection.js";
import type * as lib_streak_calculator from "../lib/streak_calculator.js";
import type * as lib_validate from "../lib/validate.js";
import type * as migrations_backfillMuscleGroups from "../migrations/backfillMuscleGroups.js";
import type * as sets from "../sets.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "ai/openai": typeof ai_openai;
  "ai/prompts": typeof ai_prompts;
  "ai/reports": typeof ai_reports;
  analytics: typeof analytics;
  analyticsFocus: typeof analyticsFocus;
  analyticsProgressiveOverload: typeof analyticsProgressiveOverload;
  analyticsRecovery: typeof analyticsRecovery;
  crons: typeof crons;
  exercises: typeof exercises;
  "lib/pr_detection": typeof lib_pr_detection;
  "lib/streak_calculator": typeof lib_streak_calculator;
  "lib/validate": typeof lib_validate;
  "migrations/backfillMuscleGroups": typeof migrations_backfillMuscleGroups;
  sets: typeof sets;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
