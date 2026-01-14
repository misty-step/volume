# State Diagrams

Documentation for stateful components and complex flows in Volume.

> "Complexity is anything that makes software hard to understand or modify." - John Ousterhout

## When to Diagram

- More than 3 states
- Non-linear transitions (can go backward, can skip)
- Error states that need handling
- Async operations with race conditions

## Diagrams

| Flow | States | Bug Potential |
|------|--------|---------------|
| [Subscription Lifecycle](./subscription-lifecycle.md) | 5 | High - Stripe webhooks |
| [Checkout Flow](./checkout-flow.md) | 5 | High - Payment |
| [PaywallGate](./paywall-gate.md) | 4 | Medium - Race conditions |
| [Auth Flow](./auth-flow.md) | 4 | Medium - Clerk/Convex sync |
| [Quick Log Form](./quick-log-form.md) | 3 | Medium - Mode switching |
| [AI Report Generation](./ai-report-generation.md) | 4 | Low - Idempotent |

## Not Diagrammed (Simple)

These flows are linear or have fewer than 3 states:

- **Exercise CRUD** - Standard create/update/delete
- **Set logging** - Single mutation call
- **Theme toggle** - Boolean state
- **Weight unit preference** - Enum toggle

## Adding New Diagrams

1. Create `.md` file in this directory
2. Use Mermaid `stateDiagram-v2` syntax
3. Include: states table, diagram, error handling, file references
4. Add to this README index
