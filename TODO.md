# Observability Stack Implementation

> **Philosophy**: Deep modules with simple interfaces. Hide complexity, expose clarity. Ship working code, not abstractions for abstractions' sake. Measure twice, cut once.

## Context

Volume handles sensitive fitness data (workout logs, body metrics, user behavior). We need comprehensive error tracking and analytics while **guaranteeing** user privacy. The architecture follows battle-tested patterns from scry: centralized abstraction, type-safe events, automatic PII scrubbing, unified client/server API.

**Why this matters**: Production debugging without observability is flying blind. Analytics without privacy protection is negligent. Both must be first-class citizens, not afterthoughts.

---

## Phase 1: Foundation - Sentry Installation

### Wizard Bootstrap

- [x] Run `npx @sentry/wizard@latest -i nextjs` in project root
  - **Context**: Wizard creates three config files (client/server/edge), updates next.config.ts, adds .sentryclirc
  - **Acceptance**: Generates `sentry.{client,server,edge}.config.ts` files without errors
  - **Verification**: `git status` shows new files, wizard completes successfully
  - **Note**: Wizard may prompt for DSN - use dummy value, we'll replace with env var

  ```
  Work Log:
  - Wizard failed due to TTY init (non-interactive environment)
  - Manually installed @sentry/nextjs + @sentry/cli instead
  - Created three config files with basic init (will refactor to factory pattern)
  ```

- [x] Install Sentry dependencies: `pnpm add @sentry/nextjs@latest`
  - **Context**: Next.js 15 requires @sentry/nextjs >=10.13.0 for Turbopack support
  - **Acceptance**: package.json shows @sentry/nextjs in dependencies
  - **Verification**: `pnpm why @sentry/nextjs` confirms installation

- [x] Install Sentry CLI as dev dependency: `pnpm add -D @sentry/cli@latest`
  - **Context**: Required for source map uploads during build (debugging production errors)
  - **Acceptance**: package.json shows @sentry/cli in devDependencies
  - **Verification**: `pnpm exec sentry-cli --version` returns version number

### Configuration Factory (Deep Module Pattern)

- [x] Create `src/lib/environment.ts` - deployment environment detection
  - **Context**: Single source of truth for prod/preview/dev detection across all observability tools
  - **Acceptance**: Exports `getDeploymentEnvironment()` returning 'production' | 'preview' | 'development'
  - **Implementation**: Check `VERCEL_ENV`, `NODE_ENV` with explicit fallbacks
  - **Why**: Vercel preview deployments are NOT development, need separate handling

  ```typescript
  export function getDeploymentEnvironment():
    | "production"
    | "preview"
    | "development" {
    const vercelEnv =
      process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV;
    if (vercelEnv === "production") return "production";
    if (vercelEnv === "preview") return "preview";
    return process.env.NODE_ENV === "production" ? "production" : "development";
  }
  ```

- [x] Create `src/lib/sentry.ts` - centralized Sentry configuration factory
  - **Context**: Hide all complexity of PII scrubbing, environment detection, sampling rates behind clean interface
  - **Interface**: `createSentryOptions(target: 'client' | 'server' | 'edge'): SentryInitOptions`
  - **Must implement**:
    - Email redaction regex: `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g` → `[EMAIL_REDACTED]`
    - Sensitive header filtering: Remove Authorization, Cookie, Set-Cookie, X-API-Key
    - `beforeSend` hook: Scrub event.user.email, event.user.ip_address, event.request.headers, event.extra
    - `beforeBreadcrumb` hook: Scrub breadcrumb.data recursively
    - Environment resolution: Use `getDeploymentEnvironment()`
    - Release tagging: `VERCEL_GIT_COMMIT_SHA` or `npm_package_version`
    - Sample rate parsing: 0.0-1.0 with fallback to 0.1 for traces, 1.0 for error replays
  - **Acceptance**: Function returns valid Sentry options object, no PII in test events
  - **Test**: Pass mock event with email through beforeSend, verify redaction
  - **Why**: Every Sentry event is a potential PII leak - centralize protection logic once

- [x] Export `shouldEnableSentry(dsn?: string): boolean` helper in sentry.ts
  - **Context**: Respect explicit disable flags, auto-disable in test env
  - **Logic**: Return false if no DSN, NODE_ENV === 'test', or NEXT_PUBLIC_DISABLE_SENTRY === 'true'
  - **Acceptance**: Returns boolean, respects all disable conditions
  - **Why**: Opt-out mechanism for local dev, CI, privacy-conscious users

### Runtime Configuration Files

- [ ] Update `sentry.client.config.ts` to use factory pattern
  - **Context**: Client runtime runs in browser, needs Session Replay config
  - **Replace generated content with**:

  ```typescript
  import * as Sentry from "@sentry/nextjs";
  import { createSentryOptions } from "./src/lib/sentry";

  const options = createSentryOptions("client");
  Sentry.init(options);
  ```

  - **Acceptance**: File imports factory, calls init with returned options
  - **Verification**: No TypeScript errors, builds successfully

- [ ] Update `sentry.server.config.ts` to use factory pattern
  - **Context**: Server runtime for API routes, Server Components, Server Actions
  - **Implementation**: Same as client but target="server"
  - **Acceptance**: Imports factory, calls Sentry.init
  - **Note**: Server has access to server-only env vars (SENTRY_DSN)

- [ ] Update `sentry.edge.config.ts` to use factory pattern
  - **Context**: Edge runtime for middleware (authentication checks)
  - **Implementation**: Same pattern but target="edge"
  - **Acceptance**: Edge runtime compatible code only (no Node.js APIs)
  - **Why**: Middleware runs on edge, different constraints than server runtime

### Build Configuration

- [ ] Update `next.config.ts` - wrap with `withSentryConfig` for source map upload
  - **Context**: Source maps enable readable stack traces in production (crucial for debugging)
  - **Current state**: Plain config with headers() and bundleAnalyzer
  - **Implementation**:

  ```typescript
  import { withSentryConfig } from "@sentry/nextjs";

  // At bottom of file, replace:
  // export default bundleAnalyzer(nextConfig);
  // With:
  const sentryOptions = {
    silent: !process.env.CI,
    hideSourceMaps: true, // Security: don't ship source maps to client
    disableLogger: true, // Bundle size: tree-shake Sentry logger in prod
    widenClientFileUpload: true,
    automaticVercelMonitors: true,
    sourcemaps: {
      disable: !process.env.SENTRY_AUTH_TOKEN, // Only upload if token present
    },
  };

  export default withSentryConfig(bundleAnalyzer(nextConfig), sentryOptions);
  ```

  - **Acceptance**: Config exports withSentryConfig wrapper, preserves bundleAnalyzer
  - **Verification**: `pnpm build` succeeds, no Sentry upload errors (expected without token)

- [ ] Update CSP headers in `next.config.ts` - allow Sentry domains
  - **Context**: Current CSP will block Sentry error reporting
  - **Add to script-src**: `https://browser.sentry-cdn.com`
  - **Add to connect-src**: `https://*.ingest.sentry.io`
  - **Keep existing**: All Clerk, Convex domains unchanged
  - **Implementation**: Find Content-Security-Policy header in headers(), append to arrays
  - **Acceptance**: CSP includes Sentry domains without breaking Clerk/Convex
  - **Test**: Build succeeds, no CSP violation warnings in browser console

---

## Phase 2: Vercel Analytics Integration

### Package Installation

- [ ] Install Vercel Analytics: `pnpm add @vercel/analytics@latest`
  - **Context**: Tracks page views, custom events, user demographics
  - **Bundle impact**: ~2KB gzipped, loads async after page interactive
  - **Acceptance**: Package in dependencies, version >=1.0.0

- [ ] Install Vercel Speed Insights: `pnpm add @vercel/speed-insights@latest`
  - **Context**: Tracks Core Web Vitals, Real Experience Score
  - **Bundle impact**: ~1.5KB gzipped, non-blocking
  - **Acceptance**: Package in dependencies, version >=1.0.0

### Analytics Wrapper Component

- [ ] Create `src/components/analytics-wrapper.tsx` - client component with URL filtering
  - **Context**: Filter sensitive URLs from analytics (webhooks, auth tokens in query params)
  - **Must be 'use client'**: Vercel Analytics uses browser APIs
  - **Implementation**:

  ```typescript
  'use client';
  import { Analytics } from '@vercel/analytics/react';

  export function AnalyticsWrapper() {
    const beforeSend = (event) => {
      const url = event.url || '';
      // Block webhooks, tokens, test routes
      if (url.includes('/api/webhooks') ||
          url.includes('token=') ||
          url.includes('key=') ||
          url.includes('secret=')) {
        return null; // Don't track
      }
      return event;
    };

    return <Analytics beforeSend={beforeSend} />;
  }
  ```

  - **Acceptance**: Component exports, beforeSend filters URLs correctly
  - **Test**: Mock event with webhook URL, verify returns null

- [ ] Update `src/app/layout.tsx` - add analytics components before closing </body>
  - **Context**: Analytics must be inside body, after main content for performance
  - **Add imports**:

  ```typescript
  import { SpeedInsights } from "@vercel/speed-insights/next";
  import { AnalyticsWrapper } from "@/components/analytics-wrapper";
  ```

  - **Add before `</body>`** (after Toaster):

  ```tsx
  <AnalyticsWrapper />
  <SpeedInsights />
  ```

  - **Acceptance**: Components render in layout, no TypeScript errors
  - **Verification**: Dev server shows no console errors, page loads normally

---

## Phase 3: Centralized Analytics Library (The Deep Module)

### Type-Safe Event System

- [ ] Create `src/lib/analytics.ts` - define event type system
  - **Context**: Type safety prevents tracking bugs, serves as event catalog
  - **Start with core events**:

  ```typescript
  export interface AnalyticsEventDefinitions {
    "Exercise Created": {
      exerciseId: string;
      userId?: string;
      source?: "manual" | "ai" | "import";
    };
    "Set Logged": {
      setId: string;
      exerciseId: string;
      userId?: string;
      reps: number;
      weight?: number;
    };
    "Workout Session Started": {
      sessionId: string;
      userId?: string;
    };
    "Workout Session Completed": {
      sessionId: string;
      userId?: string;
      durationMs: number;
      setCount: number;
    };
  }

  export type AnalyticsEventName = keyof AnalyticsEventDefinitions;
  export type AnalyticsEventProperties<Name extends AnalyticsEventName> =
    Partial<AnalyticsEventDefinitions[Name]> &
      Record<string, string | number | boolean>;
  ```

  - **Acceptance**: Types compile, event names are string literals
  - **Why**: Typo in event name = silent failure. TypeScript prevents this.

### PII Sanitization

- [ ] Add email redaction helper to analytics.ts
  - **Pattern**: `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g`
  - **Replacement**: `[EMAIL_REDACTED]`
  - **Function**: `sanitizeString(value: string): string`
  - **Acceptance**: Replaces all emails in string with redacted placeholder
  - **Test**: "user@example.com sent message" → "user@[EMAIL_REDACTED] sent message"
  - **Note**: Some emails might be double-redacted, that's fine (defensive)

- [ ] Add recursive property sanitizer to analytics.ts
  - **Function**: `sanitizeEventProperties(properties: Record<string, unknown>): Record<string, string | number | boolean>`
  - **Logic**:
    - String → sanitizeString(value)
    - Number/boolean → pass through
    - Object/array → sanitize recursively (max depth 3)
    - null/undefined → skip
    - Circular references → detect with WeakSet, replace with "[Circular]"
  - **Acceptance**: Nested objects sanitized, no infinite loops
  - **Test**: Pass object with email in nested property, verify redacted

### Environment Detection

- [ ] Add environment helpers to analytics.ts
  - **Function**: `isAnalyticsEnabled(): boolean`
  - **Logic**:
    - Check NEXT_PUBLIC_DISABLE_ANALYTICS === 'true' → false
    - Check NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' → true
    - Check NODE_ENV === 'development' || 'test' → false
    - Check getDeploymentEnvironment() !== 'production' → false
    - Default → true
  - **Acceptance**: Respects all flags, auto-disables in dev
  - **Why**: Don't pollute analytics with dev traffic

- [ ] Add Sentry-specific check: `isSentryEnabled(): boolean`
  - **Logic**: Call `shouldEnableSentry(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN)`
  - **Acceptance**: Uses existing helper from lib/sentry.ts
  - **Why**: Sentry has more complex enable logic (DSN required, test env blocked)

### Server-Side Track Function Loader

- [ ] Add dynamic server track loader to analytics.ts
  - **Context**: @vercel/analytics/server only works on server, can't import on client
  - **Implementation**:

  ```typescript
  let serverTrackPromise: Promise<
    typeof import("@vercel/analytics/server").track | null
  > | null = null;

  function loadServerTrack() {
    if (typeof window !== "undefined") return Promise.resolve(null);
    if (!serverTrackPromise) {
      serverTrackPromise = import("@vercel/analytics/server")
        .then((m) => m.track)
        .catch(() => null);
    }
    return serverTrackPromise;
  }
  ```

  - **Acceptance**: Returns promise resolving to track function on server, null on client
  - **Why**: Prevents "Cannot read property of undefined" errors when calling from client

### User Context Management

- [ ] Add user context state to analytics.ts
  - **State**: `let currentUserContext: { userId: string; metadata: Record<string, string> } | null = null;`
  - **Function**: `setUserContext(userId: string, metadata?: Record<string, string>): void`
  - **Logic**:
    - Sanitize userId and metadata strings
    - Store in module-level variable
    - Call `Sentry.setUser({ id: userId, ...metadata })`
  - **Acceptance**: State persists across calls, syncs with Sentry
  - **Why**: Enrich all events with user context automatically

- [ ] Add user context clearer: `clearUserContext(): void`
  - **Logic**:
    - Set `currentUserContext = null`
    - Call `Sentry.setUser(null)`
  - **Acceptance**: State cleared, Sentry user cleared
  - **When to call**: User logs out, session expires

- [ ] Add context merger helper: `withUserContext(properties: Record<string, any>): Record<string, any>`
  - **Logic**:
    - If no currentUserContext, return properties unchanged
    - If userId in context but not in properties, add it
    - For each metadata key, add as `user.{key}` if not already in properties
  - **Acceptance**: Properties merged without overwriting explicit values
  - **Why**: Automatic enrichment, don't require passing userId to every trackEvent call

### Core Tracking Function

- [ ] Implement `trackEvent<Name extends AnalyticsEventName>(name: Name, properties?: AnalyticsEventProperties<Name>): void`
  - **Context**: The main API - everything flows through here
  - **Logic**:
    1. Check `isAnalyticsEnabled()`, return early if disabled
    2. Sanitize properties with `sanitizeEventProperties(properties)`
    3. Merge with user context: `withUserContext(sanitized)`
    4. **If client**: Call `trackClient(name, merged)` from '@vercel/analytics'
    5. **If server**:
       - Call `loadServerTrack()`
       - If track function loaded, call `track(name, merged)`
       - Catch errors silently (don't break request)
  - **Acceptance**:
    - Type-safe: `trackEvent('Set Logged', { setId: 'x', reps: 5 })` compiles
    - Type error: `trackEvent('Set Logged', { invalid: 'prop' })` fails compilation
    - Runtime-safe: Handles missing userId gracefully
  - **Error handling**: All errors caught and logged to console.warn in dev only
  - **Why**: Single API for client/server, impossible to pass wrong properties

### Error Reporting Function

- [ ] Implement `reportError(error: Error, context?: Record<string, unknown>): void`
  - **Context**: Wrapper around Sentry.captureException with sanitization
  - **Logic**:
    1. Check `isSentryEnabled()`, return early if disabled
    2. Sanitize context recursively (same as event properties)
    3. Call `Sentry.captureException(error, { extra: sanitizedContext })`
    4. Catch any Sentry errors silently
  - **Acceptance**: Error sent to Sentry with context, no PII
  - **Test**: Pass error with email in context, verify redacted in Sentry UI
  - **Why**: Centralize error reporting, guarantee sanitization

### Export Public API

- [ ] Add barrel exports at bottom of analytics.ts
  - **Exports**:

  ```typescript
  export {
    trackEvent,
    reportError,
    setUserContext,
    clearUserContext,
    type AnalyticsEventName,
    type AnalyticsEventProperties,
    type AnalyticsEventDefinitions,
  };
  ```

  - **Do NOT export**: Internal helpers (sanitization, loaders)
  - **Acceptance**: Clean public API, implementation details hidden
  - **Why**: Deep module principle - simple interface, complex implementation

---

## Phase 4: Error Boundaries (Fail Gracefully)

### Route Segment Error Boundary

- [ ] Create `src/app/error.tsx` - catch errors in app routes
  - **Must be 'use client'**: Error boundaries use React lifecycle
  - **Implementation**:

  ```typescript
  'use client';
  import { useEffect } from 'react';
  import { reportError } from '@/lib/analytics';
  import { Button } from '@/components/ui/button';

  export default function Error({
    error,
    reset,
  }: {
    error: Error & { digest?: string };
    reset: () => void;
  }) {
    useEffect(() => {
      reportError(error, { boundary: 'app/error.tsx' });
    }, [error]);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
        <p className="text-muted-foreground mb-8">{error.message}</p>
        <Button onClick={reset}>Try again</Button>
      </div>
    );
  }
  ```

  - **Acceptance**: Catches rendering errors, reports to Sentry, shows UI
  - **Test**: Add `throw new Error('test')` to a page, verify boundary catches
  - **Why**: Errors in app routes shouldn't crash entire app

### Global Error Boundary

- [ ] Create `src/app/global-error.tsx` - catch errors in root layout
  - **Context**: Last resort boundary - renders in place of entire layout
  - **Must include html/body tags**: Replaces root layout
  - **Implementation**:

  ```typescript
  'use client';
  import { useEffect } from 'react';
  import { reportError } from '@/lib/analytics';

  export default function GlobalError({
    error,
    reset,
  }: {
    error: Error & { digest?: string };
    reset: () => void;
  }) {
    useEffect(() => {
      reportError(error, { boundary: 'global-error.tsx' });
    }, [error]);

    return (
      <html>
        <body>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Application Error</h2>
            <p>{error.message}</p>
            <button onClick={reset}>Try again</button>
          </div>
        </body>
      </html>
    );
  }
  ```

  - **Acceptance**: Catches root layout errors, reports to Sentry
  - **Note**: Inline styles required (Tailwind CSS may not load)
  - **Why**: Even layout errors need graceful handling

### Convex Query Error Handling Example

- [ ] Add error boundary example to src/app/exercises/page.tsx (or similar)
  - **Context**: Show pattern for handling Convex query errors
  - **Find existing useQuery call**: e.g., `const exercises = useQuery(api.exercises.listExercises);`
  - **Wrap page content in try-catch pattern**:

  ```typescript
  if (exercises === undefined) return <LoadingSpinner />; // Loading state
  if (!exercises) throw new Error('Failed to load exercises'); // Trigger boundary
  ```

  - **Acceptance**: Query errors bubble to error boundary, auto-report to Sentry
  - **Why**: Demonstrate Convex error handling pattern for team

---

## Phase 5: Environment Configuration

### Environment Variable Documentation

- [ ] Create `.env.example` entries for Sentry
  - **Add after existing Clerk/Convex vars**:

  ```bash
  # ============================================================================
  # Sentry Error Tracking
  # ============================================================================
  # Setup: https://sentry.io/signup/
  #
  # 1. Create Sentry project (choose Next.js platform)
  # 2. Copy DSN from Project Settings > Client Keys
  # 3. Create auth token: User Settings > Auth Tokens > Create New Token
  #    Required scopes: project:read, project:releases, org:read
  # 4. In Vercel project settings:
  #    - Add NEXT_PUBLIC_SENTRY_DSN (visible to browser)
  #    - Add SENTRY_AUTH_TOKEN (secret, for source map uploads)
  #    - Add SENTRY_ORG and SENTRY_PROJECT (for CLI)
  #
  # DSNs (client-side and server-side, can be same or different):
  NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
  SENTRY_DSN=https://exampleServerKey@o0.ingest.sentry.io/0

  # Auth token for source map uploads (keep secret):
  SENTRY_AUTH_TOKEN=sntrys_your_auth_token_here

  # Organization and project slugs (from Sentry URL):
  SENTRY_ORG=your-org-slug
  SENTRY_PROJECT=your-project-slug

  # Optional: Sampling rates (0.0 to 1.0)
  # SENTRY_TRACES_SAMPLE_RATE=0.1              # Performance traces (10%)
  # SENTRY_REPLAYS_SESSION_SAMPLE_RATE=0.05    # Session replays (5%)
  # SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE=1.0    # Replays on error (100%)

  # Optional: Disable in specific environments
  # NEXT_PUBLIC_DISABLE_SENTRY=true

  # ============================================================================
  # Vercel Analytics
  # ============================================================================
  # Setup: Automatically enabled on Vercel deployments
  # Dashboard: https://vercel.com/[team]/[project]/analytics
  #
  # Optional: Disable analytics
  # NEXT_PUBLIC_DISABLE_ANALYTICS=true
  ```

  - **Acceptance**: Clear setup instructions, example values, comments explain each var
  - **Why**: Future developers (including you in 6 months) need crystal-clear setup

- [ ] Update `.env.local` - add your actual Sentry values (NOT committed to git)
  - **Get from**: https://sentry.io/settings/projects/
  - **Add**:

  ```bash
  NEXT_PUBLIC_SENTRY_DSN=your_actual_dsn_here
  SENTRY_AUTH_TOKEN=your_actual_token_here
  SENTRY_ORG=your_org_slug
  SENTRY_PROJECT=volume
  ```

  - **Acceptance**: Local dev can report errors to Sentry
  - **Verification**: Trigger test error, see it in Sentry dashboard
  - **Note**: Don't commit .env.local to git (already in .gitignore)

### Documentation Updates

- [ ] Update CLAUDE.md - add Observability Stack section
  - **Add after "Testing Strategy" section**:

  ````markdown
  ## Observability Stack

  Volume uses Vercel Analytics for product metrics and Sentry for error tracking.

  ### Architecture

  - **lib/analytics.ts**: Centralized API for all tracking (client + server)
  - **lib/sentry.ts**: Configuration factory with PII scrubbing
  - **components/analytics-wrapper.tsx**: Client-side analytics with URL filtering

  ### Key Features

  - Type-safe event tracking (TypeScript prevents typos)
  - Automatic PII redaction (emails, sensitive headers)
  - User context enrichment (automatic userId attachment)
  - Unified client/server API (same code works everywhere)
  - Environment-aware (auto-disables in dev/test)

  ### Usage Examples

  **Tracking Events:**

  ```typescript
  import { trackEvent } from "@/lib/analytics";

  // Type-safe - wrong properties won't compile
  trackEvent("Set Logged", {
    setId: set._id,
    exerciseId: exercise._id,
    reps: 10,
    weight: 135,
  });
  ```
  ````

  **Reporting Errors:**

  ```typescript
  import { reportError } from "@/lib/analytics";

  try {
    await dangerousOperation();
  } catch (error) {
    reportError(error, {
      operation: "dangerousOperation",
      userId: user.id,
    });
  }
  ```

  **User Context:**

  ```typescript
  import { setUserContext, clearUserContext } from "@/lib/analytics";

  // On login - all future events automatically include userId
  setUserContext(user.id, { plan: "pro" });

  // On logout
  clearUserContext();
  ```

  ### Privacy Guarantees
  - All emails automatically redacted: `user@example.com` → `[EMAIL_REDACTED]`
  - Sensitive headers removed: Authorization, Cookie, API keys
  - User IP addresses never sent to Sentry
  - Workout data only tracked in aggregate (counts, not values)

  ### Adding New Events
  1. Add to `AnalyticsEventDefinitions` in lib/analytics.ts
  2. Define required/optional properties
  3. Use TypeScript to enforce at call sites

  Example:

  ```typescript
  export interface AnalyticsEventDefinitions {
    "New Feature Used": {
      featureName: string;
      userId?: string;
    };
  }
  ```

  ```
  - **Acceptance**: Documentation clear, examples work, privacy guarantees explicit
  - **Why**: Team needs to understand system without reading implementation

  ```

- [ ] Update CLAUDE.md - add Convex Sentry Integration section
  - **Add under Observability Stack section**:

  ````markdown
  ### Convex Error Tracking

  Convex functions automatically report errors to Sentry via Convex Dashboard integration.

  **Setup (Pro plan required):**

  1. Go to [Convex Dashboard](https://dashboard.convex.dev)
  2. Select your deployment (dev or prod)
  3. Navigate to Settings → Integrations
  4. Click "Sentry" card
  5. Enter Sentry DSN: `SENTRY_DSN` value from .env.local
  6. Save configuration

  **What Gets Tracked:**

  - Exceptions thrown from queries, mutations, actions
  - Automatic tags: func, func_type, func_runtime, request_id
  - User context from Clerk auth (if set with setUserContext)

  **Client-Side Error Handling:**

  Errors from Convex queries/mutations propagate to client and trigger Error Boundaries:

  ```typescript
  const exercises = useQuery(api.exercises.listExercises);

  // If query throws, Error Boundary catches and reports to Sentry
  if (exercises === undefined) return <LoadingSpinner />;
  if (!exercises) throw new Error('Failed to load');
  ```
  ````

  **Manual Error Enrichment:**

  For critical paths, enrich with Convex-specific context:

  ```typescript
  const logSet = useMutation(api.sets.logSet);

  try {
    await logSet({ exerciseId, reps, weight });
  } catch (error) {
    reportError(error, {
      convexFunction: "sets.logSet",
      convexArgs: { exerciseId, reps, weight },
    });
  }
  ```

  ```
  - **Acceptance**: Clear setup steps, explains automatic vs manual tracking
  - **Why**: Convex integration is non-obvious, needs explicit documentation
  ```

---

## Phase 6: Testing & Verification

### Local Testing

- [ ] Test Sentry client-side error capture
  - **Create**: src/app/test-error/page.tsx with button that throws error

  ```typescript
  'use client';
  import { Button } from '@/components/ui/button';

  export default function TestError() {
    return (
      <Button onClick={() => { throw new Error('Test client error'); }}>
        Trigger Client Error
      </Button>
    );
  }
  ```

  - **Test**: Click button, verify error appears in Sentry dashboard
  - **Verify**: Email addresses in error context are redacted
  - **Clean up**: Delete test-error directory after verification

- [ ] Test Sentry server-side error capture
  - **Create**: src/app/api/test-error/route.ts that throws error

  ```typescript
  export async function GET() {
    throw new Error("Test server error");
  }
  ```

  - **Test**: Navigate to /api/test-error, verify error in Sentry
  - **Verify**: Request headers sanitized (no Authorization header)
  - **Clean up**: Delete after verification

- [ ] Test PII redaction in both client and server
  - **Add context with email**: `reportError(error, { email: 'user@example.com' })`
  - **Verify in Sentry**: extra.email shows `[EMAIL_REDACTED]`
  - **Test nested objects**: `{ user: { email: 'test@test.com' } }`
  - **Acceptance**: All emails redacted at all nesting levels

- [ ] Test analytics event tracking
  - **Add trackEvent call**: `trackEvent('Exercise Created', { exerciseId: 'test' })`
  - **Verify**: Event appears in Vercel Analytics dashboard (may take 5-10 min)
  - **Check**: userId automatically added if user logged in
  - **Acceptance**: Events tracked, user context merged correctly

- [ ] Test URL filtering in AnalyticsWrapper
  - **Navigate to**: /api/webhooks/clerk (or any webhook path)
  - **Verify**: Page view NOT tracked in Vercel Analytics
  - **Add query param**: ?token=secret
  - **Verify**: Not tracked
  - **Acceptance**: beforeSend filter blocks sensitive URLs

### Build Verification

- [ ] Run production build: `pnpm build`
  - **Verify**: Build succeeds without Sentry upload warnings
  - **Check**: No TypeScript errors in analytics.ts or sentry.ts
  - **Expected**: "Sentry source maps upload: skipped (no auth token)" - that's fine
  - **Acceptance**: Clean build, no errors or unexpected warnings

- [ ] Verify bundle size impact
  - **Before**: Note current bundle size from build output
  - **After**: Check new bundle size
  - **Expected increase**: ~15-20KB (Sentry client + Analytics)
  - **Acceptance**: Increase within expected range, no massive bloat
  - **Why**: Observability shouldn't tank performance

### Type System Verification

- [ ] Test type safety of trackEvent
  - **Valid call**: `trackEvent('Set Logged', { setId: 'x', reps: 5 })` → compiles
  - **Invalid event name**: `trackEvent('Fake Event', {})` → TypeScript error
  - **Invalid properties**: `trackEvent('Set Logged', { invalid: true })` → TypeScript error
  - **Acceptance**: TypeScript catches all invalid usage at compile time
  - **Why**: Runtime errors in analytics are invisible failures

---

## Phase 7: Deployment Checklist

### Vercel Environment Variables

- [ ] Add NEXT_PUBLIC_SENTRY_DSN to Vercel project settings
  - **Location**: Project Settings → Environment Variables
  - **Value**: Client-side DSN from Sentry project
  - **Environments**: Production, Preview, Development (same value for all)
  - **Why**: Public variable, exposed in browser bundle

- [ ] Add SENTRY_AUTH_TOKEN to Vercel project settings
  - **Value**: Auth token from Sentry (User Settings → Auth Tokens)
  - **Environments**: Production only (source maps for prod builds)
  - **Mark as**: Secret (sensitive, don't expose)
  - **Why**: Enables source map upload during Vercel builds

- [ ] Add SENTRY_ORG to Vercel project settings
  - **Value**: Organization slug from Sentry URL
  - **Environments**: Production
  - **Why**: Required for CLI source map upload

- [ ] Add SENTRY_PROJECT to Vercel project settings
  - **Value**: Project slug (probably "volume")
  - **Environments**: Production
  - **Why**: Required for CLI source map upload

### Convex Dashboard Configuration

- [ ] Configure Sentry integration in Convex Dashboard
  - **Go to**: https://dashboard.convex.dev → Select deployment
  - **Navigate**: Settings → Integrations → Sentry
  - **Enter DSN**: Same as NEXT_PUBLIC_SENTRY_DSN
  - **Environments**: Configure for both dev and prod deployments separately
  - **Acceptance**: Integration shows "Connected" status
  - **Why**: Backend errors from Convex functions need tracking too

### Vercel Analytics Activation

- [ ] Enable Vercel Analytics in Vercel project dashboard
  - **Go to**: Project → Analytics tab
  - **Click**: "Enable Analytics" if not already enabled
  - **Verify**: Shows "Active" status
  - **Acceptance**: Dashboard shows analytics are collecting
  - **Note**: May take 24 hours for data to appear

- [ ] Enable Speed Insights in Vercel project dashboard
  - **Go to**: Project → Speed Insights tab
  - **Click**: "Enable Speed Insights" if not already enabled
  - **Verify**: Shows "Active" status
  - **Acceptance**: Dashboard shows Web Vitals data
  - **Note**: Data appears faster than Analytics (usually within minutes)

### First Deploy & Smoke Test

- [ ] Deploy to Vercel: `git push origin feature/observability-stack`
  - **Trigger**: Create PR, Vercel auto-deploys preview
  - **Check build logs**: Sentry source maps uploaded successfully
  - **Expected**: "Sentry source maps uploaded: X files"
  - **Acceptance**: Deploy succeeds, no build errors

- [ ] Test Sentry error reporting on preview deployment
  - **Visit**: Preview URL + /test-error (if left in, or trigger real error)
  - **Verify**: Error appears in Sentry with correct environment tag (preview)
  - **Check**: Source maps work (stack trace shows original code, not minified)
  - **Acceptance**: Errors tracked, stack traces readable

- [ ] Test Vercel Analytics on preview deployment
  - **Visit**: Multiple pages on preview deployment
  - **Wait**: 5-10 minutes for data to process
  - **Check**: Vercel Analytics dashboard shows page views
  - **Acceptance**: Events appear with correct path data

---

## Post-Implementation: Monitoring & Alerts

### Sentry Alert Configuration

- [ ] Create alert rule for high error rate
  - **Sentry Dashboard**: Alerts → Create Alert Rule
  - **Condition**: Error rate exceeds 50 per hour
  - **Action**: Email notification to team
  - **Why**: Get notified before users start complaining

- [ ] Create alert rule for new error types
  - **Condition**: New issue appears (first-seen error)
  - **Action**: Slack notification (or email)
  - **Why**: New errors indicate new bugs from recent deploy

### Vercel Analytics Review

- [ ] Review Vercel Analytics dashboard weekly
  - **Check**: Most visited pages (usage patterns)
  - **Check**: Bounce rate by page (UX issues?)
  - **Check**: Top referrers (where users come from)
  - **Why**: Data-driven product decisions

### Documentation Maintenance

- [ ] Add observability section to PR template
  - **Add checklist item**: "Error tracking tested (trigger error, verify in Sentry)"
  - **Add checklist item**: "Analytics events added for new user actions"
  - **Why**: Make observability a habit, not an afterthought

---

## Success Criteria

- [ ] **Sentry**: Test error appears in dashboard with readable stack trace
- [ ] **Sentry**: Email addresses redacted in all captured events
- [ ] **Sentry**: Convex function errors appear with correct tags
- [ ] **Analytics**: Page views tracked in Vercel dashboard
- [ ] **Analytics**: Custom events tracked (Exercise Created, Set Logged, etc.)
- [ ] **Analytics**: Sensitive URLs filtered (webhooks, tokens)
- [ ] **Speed Insights**: Web Vitals data appears in dashboard
- [ ] **Build**: Production build succeeds with source map upload
- [ ] **TypeScript**: trackEvent calls type-checked at compile time
- [ ] **Privacy**: All PII sanitization tests pass

---

## Rollback Plan

If observability stack causes issues in production:

1. **Quick disable**: Set `NEXT_PUBLIC_DISABLE_SENTRY=true` and `NEXT_PUBLIC_DISABLE_ANALYTICS=true` in Vercel env vars
2. **Remove components**: Delete `<AnalyticsWrapper />` and `<SpeedInsights />` from layout.tsx
3. **Revert config**: Remove `withSentryConfig` wrapper from next.config.ts
4. **Redeploy**: Push revert commit, Vercel auto-deploys

**Note**: Keep Sentry configs in place even if disabled - makes re-enabling easier.

---

## Future Enhancements (Not in Scope)

- [ ] Session replay configuration (privacy review needed first)
- [ ] Performance tracing for slow database queries
- [ ] Custom Sentry contexts for Convex function metadata
- [ ] Analytics funnel tracking (workout completion flow)
- [ ] A/B test event tracking integration
- [ ] Error budget monitoring and alerts

**Why defer**: Ship working observability first, optimize second. Don't over-engineer on day one.
