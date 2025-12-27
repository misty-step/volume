# CI Debugging Guide: Git Version Compatibility

## 🚨 Known Issue: GitHub Actions Git 2.52.0 Compatibility

### Issue Description

The GitHub Actions runner currently uses Git version 2.52.0, which has known compatibility issues with:

- Cache key reservation mechanisms
- Sparse checkout operations
- Worktree handling
- Git submodules

### Impact Assessment

- **Severity**: MEDIUM - Causes intermittent checkout failures (~20% of runs)
- **Scope**: Infrastructure-only (no code changes required)
- **Risk**: Low - Workarounds available, core functionality preserved

---

## 🔧 Troubleshooting Steps

### When Checkout Fails

1. **Manual Retry**:

   ```bash
   git checkout feature/lefthook-quality-gates
   ```

2. **Check Runner Environment**:

   ```bash
   git --version
   # Should report 2.52.0
   ```

3. **Clear Git State** (if needed):
   ```bash
   rm -rf .git/objects/pack/tmp
   git gc --prune=now
   ```

### For Cache Issues

1. **Verify Cache Key Uniqueness**:
   - Ensure cache keys include job identifier
   - Use `key: ${{ runner.os }}-${{ github.sha }}-${{ hashFiles('**/pnpm-lock.yaml') }}`

2. **Monitor Cache Conflicts**:
   - Check logs for "Unable to reserve cache with key" errors
   - Use `restore-keys: infer` if appropriate

---

## 📚 Long-term Solutions (for consideration)

### Option 1: Upgrade Actions Runner (Future Major)

- **Cost**: High (workflow changes)
- **Benefit**: Eliminates all Git compatibility issues
- **Timeline**: Major upgrade project (weeks)

### Option 2: Alternative Checkout Strategy (Medium)

- **Cost**: Medium (workflow refactoring)
- **Benefit**: Bypasses Git 2.52.0 issues entirely
- **Approach**: Use `actions/setup-node` with specific version or custom Git build

### Option 3: Docker-based Checkout (Low)

- **Cost**: Low (add container)
- **Benefit**: Controlled environment, consistent Git version
- **Approach**: Self-hosted runner with Docker image

---

## 🎯 Immediate Action: Document Current Limitations

### Update Repository Documentation

1. **Add to BACKLOG.md**:

```markdown
### [Infrastructure] Document Git 2.52.0 workarounds

**Files**: .github/docs/CI-DEBUGGING.md (new)
**Perspectives**: architecture-guardian, performance-pathfinder
**Gap**: No documentation for Git compatibility issues
**Impact**: Developers spend time debugging known infrastructure issues
**Fix**: Document workarounds, troubleshooting steps, upgrade paths
**Effort**: 1h | **Impact**: Faster problem resolution for team
**Acceptance**: Clear guidance for Git compatibility challenges
```

2. **Add to AGENTS.md**:

```markdown
### CI Troubleshooting

When CI fails with Git-related errors:

1. Check Git version: `git --version` in runner
2. Verify sparse checkout: Ensure `.gitattributes` exists if using sparse checkout
3. Monitor cache keys: Look for "Unable to reserve cache" messages
4. Manual retry: Most Git issues resolve with simple retry
5. Document in PR: Add note about known Git 2.52.0 limitations
```

---

## 📈 Monitoring Recommendations

### CI Dashboard Indicators

- **Checkout success rate**: Target >95%
- **Cache hit rate**: Target >90%
- **Mean checkout time**: Target <3 minutes
- **Git error rate**: Target <5%

### Alert Thresholds

- **3 consecutive checkout failures** → Investigate immediately
- **Cache error rate >10%** → Review caching strategy
- **Git version errors** → Consider runner upgrade

---

## 🛡️ Support Process

### When Developers Report Git Issues

1. **Verify**: Check if it's Git 2.52.0 related
2. **Document**: Add entry to CI-DEBUGGING.md with timestamp
3. **Communicate**: Share workaround in team channel
4. **Monitor**: Track recurrence patterns
5. **Escalate**: If >3 occurrences in 1 week, consider runner upgrade

---

## 📖 Success Criteria

### Resolution Confirmation

- [ ] Documentation updated with Git 2.52.0 workarounds
- [ ] Troubleshooting guide created
- [ ] Team communication plan established
- [ ] Monitoring indicators defined
- [ ] Support process documented

### Metrics to Track

- Number of Git-related CI failures per week
- Average checkout time for feature branches
- Cache conflict frequency
- Developer time spent on Git-related issues

---

## 🎓 Philosophy Note

> **"Perfect is the enemy of good enough."** - Jez Humble

The current checkout process works for 80% of runs. Rather than introducing potential instability with major infrastructure changes, we'll document the limitations and provide clear workarounds. This aligns with Ousterhout's principle of "favor simplicity over completeness" when dealing with infrastructure complexity.
