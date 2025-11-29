---
"volume": patch
---

Add per-user rate limiting for AI-backed endpoints

- `exercise:create`: 10 requests/minute (env-configurable)
- `aiReport:onDemand`: 5 requests/day (env-configurable)

Fixed-window rate limiting stored in Convex `rateLimits` table with automatic expiration. Includes `pruneExpiredRateLimits` helper for maintenance.
