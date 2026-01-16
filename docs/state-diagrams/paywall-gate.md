# PaywallGate Access Control Flow

Component that wraps authenticated routes to enforce subscription access.

## States

| State | UI | Action |
|-------|----|----|
| `loading` | Spinner | Wait for query |
| `no_user` | Spinner | Auto-create user |
| `has_access` | Children rendered | None |
| `no_access` | Spinner | Redirect to pricing |

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> loading: Component mounts

    loading --> no_user: subscriptionStatus === null
    loading --> has_access: hasAccess === true
    loading --> no_access: hasAccess === false

    no_user --> loading: getOrCreateUser()
    note right of no_user
        Handles edge case where user
        navigates to protected route
        before user record created.
        Uses ref to prevent double-call.
    end note

    no_access --> [*]: router.replace("/pricing?reason=expired")

    has_access --> [*]: Render children
```

## Race Condition Prevention

```typescript
const userCreationAttempted = useRef(false);

// Only attempt once per mount
if (subscriptionStatus === null && !userCreationAttempted.current) {
  userCreationAttempted.current = true;
  getOrCreateUser({ timezone });
}
```

The `useRef` flag prevents multiple user creation attempts during React's strict mode double-mounting or rapid re-renders.

## Access Decision Flow

```mermaid
flowchart TD
    A[subscriptionStatus query] --> B{undefined?}
    B -->|Yes| C[Show loading spinner]
    B -->|No| D{null?}
    D -->|Yes| E[Create user with trial]
    E --> A
    D -->|No| F{hasAccess?}
    F -->|Yes| G[Render children]
    F -->|No| H[Redirect to /pricing]
```

## Files

- `/src/components/subscription/paywall-gate.tsx` - Gate component
- `/src/app/(app)/layout.tsx` - Where gate is applied
- `/convex/users.ts` - `getSubscriptionStatus`, `getOrCreateUser`
