# TASK: Lefthook Quality Gates Implementation

**Status**: In Progress  
**Branch**: feature/lefthook-quality-gates  
**Effort**: 2h estimated  
**Priority**: HIGH - Blocks Friday deploys

---

## Problem Statement

Current setup blocks Friday deploys because:

- No pre-push test execution
- No build verification locally
- No coverage thresholds enforced
- Tests fail in CI after push (wasted time)
- Broken builds reach remote repository
- Developers push code that fails basic quality checks

**Impact**: 90% of CI failures could be prevented with local quality gates

---

## Requirements

### Core Quality Gates (Pre-push)

1. **TypeScript Compilation** - `pnpm typecheck`
2. **Unit Tests** - `pnpm test`
3. **Build Verification** - `pnpm build`
4. **Security Audit** - `pnpm audit`
5. **Linting** - `pnpm lint`
6. **Coverage Thresholds** - Enforce minimum coverage

### Performance Requirements

- **<30s feedback** - Total pre-push execution time
- **Parallel execution** - Run independent checks simultaneously
- **Fast feedback loop** - Fail fast on first error
- **Minimal false positives** - Only block truly problematic pushes

### Project-Specific Considerations

From AGENTS.md analysis:

- Uses Vitest for testing (not Jest)
- Has coverage thresholds defined in vitest.config.ts
- Uses pnpm package manager
- Next.js project with Convex backend
- Already has Husky hooks (need migration)
- Uses commitlint for commit message validation

---

## Implementation Plan

### Phase 1: Setup Lefthook (30m)

1. Install Lefthook: `pnpm add -D lefthook`
2. Create `.lefthook.yml` configuration
3. Enable Lefthook: `pnpm lefthook install`
4. Test basic hook execution

### Phase 2: Pre-push Quality Gates (1h)

**Parallel Execution Strategy**:

```yaml
pre-push:
  commands:
    - name: typecheck
      run: pnpm typecheck
    - name: test
      run: pnpm test
    - name: lint
      run: pnpm lint
      parallel: true
    - name: build
      run: pnpm build
      parallel: true
    - name: audit
      run: pnpm audit --audit-level moderate
      parallel: true
```

### Phase 3: Coverage Enforcement (30m)

1. Update vitest.config.ts coverage thresholds
2. Add coverage check to pre-push
3. Configure coverage reporting format

---

## Best Practices Research

### Industry Standards

**Pre-commit vs Pre-push**:

- Pre-commit: Fast checks (linting, formatting) - run on every file change
- Pre-push: Comprehensive checks (tests, build) - run before sharing

**Quality Gate Hierarchy**:

1. **Fast Fail** - Syntax errors, type errors (immediate feedback)
2. **Quality** - Linting, formatting (code standards)
3. **Correctness** - Unit tests (logic verification)
4. **Integration** - Build, audit (system health)

**Performance Optimization**:

- Parallel execution for independent checks
- Incremental testing (only test changed files)
- Cache build artifacts
- Skip checks on documentation-only commits

### Project-Specific Best Practices

**For Next.js + Convex**:

- Build verification ensures both frontend and Convex types compile
- Type checking must include Convex generated types
- Tests should run against both frontend and Convex code

**For This Team**:

- Already uses Prettier + ESLint (lint-staged via Husky)
- Has commit message standards (commitlint)
- Uses conventional commits
- Values fast feedback loops

**Coverage Strategy**:

- Current thresholds too low (lines 30%, functions 20%)
- Realistic targets: lines 80%, functions 70%, branches 60%
- Exclude presentation components from coverage requirements
- Focus coverage on business logic (hooks, utilities, Convex functions)

---

## Detailed Configuration

### .lefthook.yml Structure

```yaml
# Fast checks on every commit
pre-commit:
  commands:
    - name: format
      glob: "{*.{ts,tsx,js,jsx},*.{json,md,yml,yml}}"
      run: pnpm format:check
    - name: lint-staged
      run: pnpm lint-staged

# Comprehensive checks before sharing
pre-push:
  commands:
    - name: typecheck
      run: pnpm typecheck
      fail_text: "TypeScript compilation failed. Fix errors before pushing."

    - name: test
      run: pnpm test
      fail_text: "Tests failed. Run 'pnpm test' to see details."

    - name: build
      run: pnpm build
      fail_text: "Build failed. Fix build errors before pushing."
      parallel: true

    - name: audit
      run: pnpm audit --audit-level moderate
      fail_text: "Security audit found vulnerabilities. Run 'pnpm audit' for details."
      parallel: true

    - name: coverage
      run: pnpm test:coverage
      fail_text: "Coverage below threshold. Add tests to improve coverage."
      parallel: true
```

### Coverage Threshold Updates

**Current vitest.config.ts**:

```typescript
coverage: {
  thresholds: {
    global: {
      lines: 30,
      functions: 20,
      branches: 10,
      statements: 30
    }
  }
}
```

**Updated targets**:

```typescript
coverage: {
  thresholds: {
    global: {
      lines: 80,
      functions: 70,
      branches: 60,
      statements: 80
    }
  },
  exclude: [
    "src/app/**/layout.tsx",
    "src/app/**/page.tsx",
    "src/components/ui/**",
    "src/test/**"
  ]
}
```

---

## Migration Strategy

### From Husky to Lefthook

1. **Keep existing Husky hooks** during transition
2. **Add Lefthook alongside** for testing
3. **Gradually migrate** hook by hook
4. **Remove Husky** once Lefthook verified

### Hook Migration Order

1. **pre-commit** (formatting, linting) - Low risk
2. **commit-msg** (commitlint) - Medium risk
3. **pre-push** (new comprehensive checks) - High value

---

## Testing Plan

### Verification Steps

1. **Install Lefthook** and verify hooks are registered
2. **Test failing scenarios**:
   - Type error in TypeScript
   - Failing test
   - Build failure
   - Linting error
   - Coverage below threshold
3. **Test passing scenarios**:
   - Clean commit should pass all checks
4. **Performance testing**:
   - Time pre-push execution
   - Verify <30s total runtime
5. **Parallel execution testing**:
   - Verify independent checks run simultaneously

### Acceptance Criteria

- [ ] Lefthook installed and hooks registered
- [ ] Pre-push fails on TypeScript errors
- [ ] Pre-push fails on test failures
- [ ] Pre-push fails on build failures
- [ ] Pre-push fails on linting errors
- [ ] Pre-push fails on coverage threshold violations
- [ ] Total execution time <30s
- [ ] Parallel execution working for independent checks
- [ ] Clear error messages guide developers to fixes
- [ ] Documentation updated in AGENTS.md

---

## Risk Mitigation

### Potential Issues

1. **Performance impact** - Developers complain about slow pushes
   - **Mitigation**: Parallel execution, incremental testing, clear progress indicators

2. **False positives** - Good code blocked by overly strict checks
   - **Mitigation**: Reasonable coverage thresholds, exclude presentation components

3. **Migration friction** - Team resists new tooling
   - **Mitigation**: Gradual migration, clear documentation, highlight benefits

4. **Coverage gaming** - Developers write useless tests to hit thresholds
   - **Mitigation**: Focus on business logic coverage, exclude UI components

### Rollback Plan

- Keep Husky configuration during transition
- If Lefthook causes issues, disable with `lefthook uninstall`
- Revert to Husky hooks immediately
- Document rollback procedure

---

## Success Metrics

### Quantitative

- **CI failure reduction**: 90% fewer failures in pipeline
- **Developer productivity**: Less time wasted on failed CI runs
- **Code quality**: Higher coverage, fewer linting issues
- **Deployment confidence**: Friday deploys unblocked

### Qualitative

- **Developer experience**: Fast, clear feedback on code quality
- **Code review quality**: Fewer style/format issues in PRs
- **Team confidence**: Higher trust in pushed code

---

## Next Steps

1. **Install Lefthook** and create basic configuration
2. **Implement pre-push quality gates** with parallel execution
3. **Update coverage thresholds** to realistic targets
4. **Test thoroughly** with both passing and failing scenarios
5. **Update documentation** in AGENTS.md with new commands
6. **Team communication** about new quality gate process
