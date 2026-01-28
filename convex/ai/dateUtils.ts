/**
 * ⚠️ IMPORTANT: Convex Import Pattern
 *
 * This file uses relative imports from packages/core instead of @volume/core.
 * This is required because Convex's esbuild bundler does not resolve pnpm
 * workspace symlinks correctly.
 *
 * DO NOT change these to @volume/core imports - the build will fail.
 * See ARCHITECTURE.md for details.
 */
/**
 * Date and streak utilities for AI reports
 * Re-exported from @volume/core
 */
import {
  calculateCurrentStreak,
  calculateLongestStreak,
} from "../../packages/core/src/streak";

import {
  getWeekStartDate,
  getDefaultPeriodStart,
  calculateDateRange,
} from "../../packages/core/src/date-calc";

export {
  calculateCurrentStreak,
  calculateLongestStreak,
  getWeekStartDate,
  getDefaultPeriodStart,
  calculateDateRange,
};
