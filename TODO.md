# TODO: Security Dependency Updates

## Context

- Update glob to fix CVE-2025-64756 (command injection, high severity)
- Reference: TASK.md line 2-8

## Action

- [x] Update and verify
  ```bash
  pnpm update
  pnpm audit        # Verify CVE resolved
  pnpm test --run   # Verify no regressions
  pnpm typecheck    # Verify types
  pnpm build        # Verify production
  ```

**Done when**: `pnpm audit` shows 0 high/critical vulnerabilities, all checks green.
