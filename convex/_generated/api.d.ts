/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_data from "../ai/data.js";
import type * as ai_dataV2 from "../ai/dataV2.js";
import type * as ai_dateUtils from "../ai/dateUtils.js";
import type * as ai_generate from "../ai/generate.js";
import type * as ai_generateV2 from "../ai/generateV2.js";
import type * as ai_openai from "../ai/openai.js";
import type * as ai_openaiV2 from "../ai/openaiV2.js";
import type * as ai_prompts from "../ai/prompts.js";
import type * as ai_promptsV2 from "../ai/promptsV2.js";
import type * as ai_reportV2Schema from "../ai/reportV2Schema.js";
import type * as ai_reports from "../ai/reports.js";
import type * as analytics from "../analytics.js";
import type * as analyticsFocus from "../analyticsFocus.js";
import type * as analyticsProgressiveOverload from "../analyticsProgressiveOverload.js";
import type * as analyticsRecovery from "../analyticsRecovery.js";
import type * as crons from "../crons.js";
import type * as exercises from "../exercises.js";
import type * as http from "../http.js";
import type * as lib_muscleGroups from "../lib/muscleGroups.js";
import type * as lib_openrouter from "../lib/openrouter.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_stripeConfig from "../lib/stripeConfig.js";
import type * as lib_validate from "../lib/validate.js";
import type * as migrations_backfillMuscleGroups from "../migrations/backfillMuscleGroups.js";
import type * as platformStats from "../platformStats.js";
import type * as sets from "../sets.js";
import type * as stripe from "../stripe.js";
import type * as subscriptions from "../subscriptions.js";
import type * as test_resetUserData from "../test/resetUserData.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/data": typeof ai_data;
  "ai/dataV2": typeof ai_dataV2;
  "ai/dateUtils": typeof ai_dateUtils;
  "ai/generate": typeof ai_generate;
  "ai/generateV2": typeof ai_generateV2;
  "ai/openai": typeof ai_openai;
  "ai/openaiV2": typeof ai_openaiV2;
  "ai/prompts": typeof ai_prompts;
  "ai/promptsV2": typeof ai_promptsV2;
  "ai/reportV2Schema": typeof ai_reportV2Schema;
  "ai/reports": typeof ai_reports;
  analytics: typeof analytics;
  analyticsFocus: typeof analyticsFocus;
  analyticsProgressiveOverload: typeof analyticsProgressiveOverload;
  analyticsRecovery: typeof analyticsRecovery;
  crons: typeof crons;
  exercises: typeof exercises;
  http: typeof http;
  "lib/muscleGroups": typeof lib_muscleGroups;
  "lib/openrouter": typeof lib_openrouter;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/stripeConfig": typeof lib_stripeConfig;
  "lib/validate": typeof lib_validate;
  "migrations/backfillMuscleGroups": typeof migrations_backfillMuscleGroups;
  platformStats: typeof platformStats;
  sets: typeof sets;
  stripe: typeof stripe;
  subscriptions: typeof subscriptions;
  "test/resetUserData": typeof test_resetUserData;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
