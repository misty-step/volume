# Deployment Script Error Scenarios

This document catalogs all error handling scenarios in `deploy-observability.sh` and their user-facing messages.

## Error Categories

### 1. Environment Variable Overrides

**Purpose**: Allow explicit specification of Sentry org/project slugs to bypass auto-discovery.

**Environment Variables**:

- `SENTRY_ORG_SLUG` - Explicitly set organization slug
- `SENTRY_PROJECT_SLUG` - Explicitly set project slug

**Usage**:

```bash
export SENTRY_ORG_SLUG='my-custom-org'
export SENTRY_PROJECT_SLUG='my-custom-project'
./scripts/deploy-observability.sh
```

### 2. Organization Resolution Failures

#### Scenario: No organizations available for token

**Trigger**: Sentry API returns empty array for `/api/0/organizations/`

**Error Message**:

```
Error: No Sentry organizations available for the provided token
Hint: Set SENTRY_ORG_SLUG environment variable to specify explicitly
      export SENTRY_ORG_SLUG='your-org-slug'
```

**Root Causes**:

- Token doesn't have access to any organizations
- Token has invalid/expired permissions
- Account has no organizations created

**Resolution**:

1. Verify token permissions at https://sentry.io/settings/account/api/auth-tokens/
2. Create organization at https://sentry.io/organizations/new/
3. Set `SENTRY_ORG_SLUG` explicitly if you know the slug

#### Scenario: API response parsing failure

**Trigger**: JSON structure doesn't match expected format (missing 'slug' key)

**Error Message**:

```
Error: Failed to parse Sentry organizations API response
Hint: Verify SENTRY_MASTER_TOKEN has correct permissions
```

**Root Causes**:

- API response structure changed
- Token lacks `org:read` scope
- Network/API error returned HTML instead of JSON

**Resolution**:

1. Check token has `org:read` scope
2. Verify API is accessible: `curl -H "Authorization: Bearer $TOKEN" https://sentry.io/api/0/organizations/`
3. Regenerate token if corrupted

#### Scenario: Organization slug empty after resolution

**Trigger**: Resolution logic completes but `$SENTRY_ORG` is empty string

**Error Message**:

```
Error: SENTRY_ORG could not be resolved
```

**Root Causes**:

- Logic bug in resolution code
- Unexpected API response format

**Resolution**:

- This is a defensive check - report as bug if triggered

### 3. Project Resolution Failures

#### Scenario: No projects in organization

**Trigger**: Sentry API returns empty array for `/api/0/organizations/{org}/projects/`

**Error Message**:

```
Error: No Sentry projects found in organization 'my-org'
Hint: Create a project first at https://sentry.io/organizations/my-org/projects/new/
      Or set SENTRY_PROJECT_SLUG environment variable explicitly
      export SENTRY_PROJECT_SLUG='your-project-slug'
```

**Root Causes**:

- New organization with no projects created yet
- Token lacks `project:read` scope for this org
- All projects were deleted

**Resolution**:

1. Create project via provided URL
2. Set `SENTRY_PROJECT_SLUG` if project exists but isn't visible
3. Verify token permissions for organization

#### Scenario: Project API parsing failure

**Trigger**: JSON structure doesn't match expected format

**Error Message**:

```
Error: Failed to parse Sentry projects API response
Hint: Verify organization slug 'my-org' is correct
```

**Root Causes**:

- Organization slug typo (if using `SENTRY_ORG_SLUG`)
- Organization doesn't exist
- API response structure changed

**Resolution**:

1. Verify org slug is correct: `curl -H "Authorization: Bearer $TOKEN" https://sentry.io/api/0/organizations/`
2. Check org URL: https://sentry.io/organizations/{your-org}/

#### Scenario: Project slug empty after resolution

**Trigger**: Resolution logic completes but `$SENTRY_PROJECT` is empty string

**Error Message**:

```
Error: SENTRY_PROJECT could not be resolved
```

**Root Causes**:

- Logic bug in resolution code
- Unexpected API response format

**Resolution**:

- This is a defensive check - report as bug if triggered

### 4. DSN Resolution Failures

#### Scenario: No client keys for project

**Trigger**: Sentry API returns empty array for `/api/0/projects/{org}/{project}/keys/`

**Error Message**:

```
Error: No DSN keys found for project 'my-project'
Hint: Create a client key at https://sentry.io/settings/my-org/projects/my-project/keys/
```

**Root Causes**:

- New project with no client keys created
- All client keys were deleted
- Token lacks `project:read` scope

**Resolution**:

1. Create client key via provided URL
2. Verify token has correct permissions

#### Scenario: DSN API parsing failure

**Trigger**: JSON structure doesn't match expected format (missing `dsn.public` field)

**Error Message**:

```
Error: Failed to parse Sentry project keys API response
Hint: Verify project slug 'my-project' exists in org 'my-org'
```

**Root Causes**:

- Project slug typo (if using `SENTRY_PROJECT_SLUG`)
- Project doesn't exist in organization
- API response structure changed

**Resolution**:

1. Verify project exists: https://sentry.io/settings/{org}/projects/{project}/
2. Check project slug matches exactly

#### Scenario: Invalid DSN format

**Trigger**: DSN doesn't start with `https://`

**Error Message**:

```
Error: Invalid DSN format: <actual-dsn-value>
```

**Root Causes**:

- API returned malformed DSN
- Parsing logic extracted wrong field

**Resolution**:

- This indicates API behavior change - report as bug

## Testing Error Scenarios

### Simulate empty organizations:

```bash
# Mock empty API response
ORGS_JSON='[]'
echo "$ORGS_JSON" | python3 -c "... (org parsing logic)"
# Should exit with __EMPTY__ error
```

### Simulate malformed JSON:

```bash
# Invalid JSON
ORGS_JSON='{"broken": json'
echo "$ORGS_JSON" | python3 -c "... (org parsing logic)"
# Should exit with __ERROR__ error
```

### Test explicit overrides:

```bash
export SENTRY_ORG_SLUG='test-org'
export SENTRY_PROJECT_SLUG='test-project'
# Script should skip API discovery and use these values
```

## Implementation Strategy

### Fail-Fast Pattern

All resolution steps follow this pattern:

1. **Check for explicit override** (environment variable)
2. **Call API** if no override
3. **Parse response** with error handling
4. **Validate parsed value** is non-empty
5. **Fail with helpful message** if any step fails

### Error Message Format

All error messages follow this structure:

```
Error: <What went wrong>
Hint: <Suggested resolution>
      <Optional: Additional context or example command>
```

### Exit Codes

- `0` - Success
- `1` - All failures (script uses `set -e` to fail fast)

### Idempotency

Script remains safe to re-run:

- Environment variable checks allow retries with explicit overrides
- Vercel env var deletion (lines 60-65) uses `|| true` to ignore missing vars
- No destructive operations without confirmation

## Validation Checklist

When adding new API calls, ensure:

- [ ] Check for explicit override env var first
- [ ] Validate API response is non-empty array
- [ ] Catch JSON parsing errors
- [ ] Validate extracted value is non-empty string
- [ ] Provide helpful error message with next steps
- [ ] Include relevant URLs in error messages
- [ ] Test with empty/malformed API responses
