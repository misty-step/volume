# Production Deployment Checklist

Use this checklist before deploying Convex functions to production.

## Pre-Deployment Verification

### 1. Code Quality

- [ ] `git status` shows clean working directory (all changes committed)
- [ ] All changes are committed to git
- [ ] Currently on `master` branch (or approved PR branch)
- [ ] `git log` reviewed to understand what's being deployed

### 2. Testing

- [ ] `pnpm typecheck` passes without errors
- [ ] `pnpm test --run` passes all tests
- [ ] `pnpm build` succeeds without errors
- [ ] Manual testing completed for new features

### 3. Deployment

#### Convex Backend Deployment

```bash
# Deploy Convex functions to production
CONVEX_DEPLOYMENT=prod:whimsical-marten-631 pnpm convex deploy -y
```

- [ ] Convex functions deployed successfully
- [ ] Production logs checked for errors:
  ```bash
  CONVEX_DEPLOYMENT=prod:whimsical-marten-631 pnpm convex logs --history 20
  ```

#### Next.js Frontend Deployment

- [ ] Changes pushed to GitHub (triggers Vercel deployment)
- [ ] Vercel deployment succeeded
- [ ] Production site accessible

### 4. Post-Deployment Verification

- [ ] Test critical user flows in production:
  - [ ] User authentication (sign in/sign up)
  - [ ] Exercise creation
  - [ ] Set logging
  - [ ] History viewing
  - [ ] Analytics dashboard
- [ ] No errors in production logs
- [ ] No errors in browser console (production site)

### 5. Rollback Plan (if needed)

If deployment causes issues:

1. **Convex**: Redeploy previous working commit

   ```bash
   git checkout <previous-commit-sha>
   CONVEX_DEPLOYMENT=prod:whimsical-marten-631 pnpm convex deploy -y
   git checkout master
   ```

2. **Vercel**: Rollback via Vercel dashboard → Deployments → Previous deployment → Promote to Production

## Environment Variables

Ensure production environment variables are set correctly:

### Convex Environment (set via `npx convex env set <key> <value> --prod`)

- [ ] `OPENROUTER_API_KEY` - OpenRouter API key for AI features
- [ ] Any new environment variables added since last deployment

### Vercel Environment (set via Vercel dashboard)

- [ ] `NEXT_PUBLIC_CONVEX_URL` - Production Convex URL
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key (pk*live*\*)
- [ ] `CLERK_SECRET_KEY` - Clerk secret key (sk*live*\*)
- [ ] `CLERK_JWT_ISSUER_DOMAIN` - Clerk JWT issuer domain (https://clerk.volume.fitness)

## Common Deployment Mistakes to Avoid

❌ **DO NOT**:

- Deploy uncommitted code
- Skip typecheck or tests
- Deploy from feature branches without review
- Forget to check production logs after deployment

✅ **DO**:

- Commit all changes before deploying
- Run full test suite
- Deploy from `master` branch
- Verify deployment success in production logs
- Test critical user flows after deployment

## Deployment History

Document major deployments here:

- **2025-11-07**: Production safety strategy - documented multi-layered approach (automated CSP testing, staging environment, smoke tests) to prevent configuration failures after 2025-11-06 CSP outage
- **2025-11-06**: Emergency CSP fix - added explicit `clerk.volume.fitness` to CSP headers after production auth outage (wildcard `*.clerk.com` didn't match custom domain)
- **2025-11-06**: Clerk production migration - updated from test keys to live keys (pk*live*/sk*live*), updated JWT issuer to https://clerk.volume.fitness, updated CSP headers for production domain
- **2025-11-04**: Production hotfix - converted createExercise to action-based architecture (commit `132268d`)
- **2025-11-04**: Added deployment documentation and checklist (commit `b353480`)
