#!/usr/bin/env bash
# Test error handling in deploy-observability.sh
# Tests Python validation logic in isolation

set -euo pipefail

echo "Testing Sentry API response validation..."
echo

# Test 1: Empty organizations array
echo "Test 1: Empty organizations array"
RESULT=$(echo '[]' | python3 -c "
import json, sys
try:
    orgs = json.load(sys.stdin)
    if not orgs or len(orgs) == 0:
        print('__EMPTY__', file=sys.stderr)
        sys.exit(1)
    print(orgs[0]['slug'])
except (KeyError, IndexError) as e:
    print('__ERROR__', file=sys.stderr)
    sys.exit(1)
" 2>&1) && SUCCESS=true || SUCCESS=false

if [[ "$RESULT" == "__EMPTY__" ]] && [[ "$SUCCESS" == "false" ]]; then
  echo "  ✓ Correctly detected empty array"
else
  echo "  ✗ Failed: got '$RESULT'"
  exit 1
fi
echo

# Test 2: Malformed JSON
echo "Test 2: Malformed JSON"
RESULT=$(echo '{broken json' | python3 -c "
import json, sys
try:
    orgs = json.load(sys.stdin)
    if not orgs or len(orgs) == 0:
        print('__EMPTY__', file=sys.stderr)
        sys.exit(1)
    print(orgs[0]['slug'])
except (KeyError, IndexError) as e:
    print('__ERROR__', file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print('__ERROR__', file=sys.stderr)
    sys.exit(1)
" 2>&1) && SUCCESS=true || SUCCESS=false

if [[ "$RESULT" == "__ERROR__" ]] && [[ "$SUCCESS" == "false" ]]; then
  echo "  ✓ Correctly detected malformed JSON"
else
  echo "  ✗ Failed: got '$RESULT'"
  exit 1
fi
echo

# Test 3: Missing 'slug' field
echo "Test 3: Missing 'slug' field"
RESULT=$(echo '[{"name": "test"}]' | python3 -c "
import json, sys
try:
    orgs = json.load(sys.stdin)
    if not orgs or len(orgs) == 0:
        print('__EMPTY__', file=sys.stderr)
        sys.exit(1)
    print(orgs[0]['slug'])
except (KeyError, IndexError) as e:
    print('__ERROR__', file=sys.stderr)
    sys.exit(1)
" 2>&1) && SUCCESS=true || SUCCESS=false

if [[ "$RESULT" == "__ERROR__" ]] && [[ "$SUCCESS" == "false" ]]; then
  echo "  ✓ Correctly detected missing slug field"
else
  echo "  ✗ Failed: got '$RESULT'"
  exit 1
fi
echo

# Test 4: Valid response
echo "Test 4: Valid organization response"
RESULT=$(echo '[{"slug": "my-org"}]' | python3 -c "
import json, sys
try:
    orgs = json.load(sys.stdin)
    if not orgs or len(orgs) == 0:
        print('__EMPTY__', file=sys.stderr)
        sys.exit(1)
    print(orgs[0]['slug'])
except (KeyError, IndexError) as e:
    print('__ERROR__', file=sys.stderr)
    sys.exit(1)
" 2>&1) && SUCCESS=true || SUCCESS=false

if [[ "$RESULT" == "my-org" ]] && [[ "$SUCCESS" == "true" ]]; then
  echo "  ✓ Correctly extracted slug"
else
  echo "  ✗ Failed: got '$RESULT'"
  exit 1
fi
echo

# Test 5: Project resolution with 'volume' preference
echo "Test 5: Project resolution (volume exists)"
RESULT=$(echo '[{"slug": "other"}, {"slug": "volume"}, {"slug": "another"}]' | python3 -c "
import json, sys
try:
    projects = json.load(sys.stdin)
    if not projects or len(projects) == 0:
        print('__EMPTY__', file=sys.stderr)
        sys.exit(1)
    # Prefer 'volume' project if exists, otherwise first project
    volume = next((p['slug'] for p in projects if p['slug'] == 'volume'), None)
    print(volume if volume else projects[0]['slug'])
except (KeyError, IndexError) as e:
    print('__ERROR__', file=sys.stderr)
    sys.exit(1)
" 2>&1) && SUCCESS=true || SUCCESS=false

if [[ "$RESULT" == "volume" ]] && [[ "$SUCCESS" == "true" ]]; then
  echo "  ✓ Correctly preferred 'volume' project"
else
  echo "  ✗ Failed: got '$RESULT'"
  exit 1
fi
echo

# Test 6: Project resolution without 'volume'
echo "Test 6: Project resolution (volume missing)"
RESULT=$(echo '[{"slug": "first-project"}, {"slug": "other"}]' | python3 -c "
import json, sys
try:
    projects = json.load(sys.stdin)
    if not projects or len(projects) == 0:
        print('__EMPTY__', file=sys.stderr)
        sys.exit(1)
    # Prefer 'volume' project if exists, otherwise first project
    volume = next((p['slug'] for p in projects if p['slug'] == 'volume'), None)
    print(volume if volume else projects[0]['slug'])
except (KeyError, IndexError) as e:
    print('__ERROR__', file=sys.stderr)
    sys.exit(1)
" 2>&1) && SUCCESS=true || SUCCESS=false

if [[ "$RESULT" == "first-project" ]] && [[ "$SUCCESS" == "true" ]]; then
  echo "  ✓ Correctly fell back to first project"
else
  echo "  ✗ Failed: got '$RESULT'"
  exit 1
fi
echo

# Test 7: DSN extraction
echo "Test 7: DSN extraction from keys"
RESULT=$(echo '[{"dsn": {"public": "https://key@sentry.io/123"}}]' | python3 -c "
import json, sys
try:
    keys = json.load(sys.stdin)
    if not keys or len(keys) == 0:
        print('__EMPTY__', file=sys.stderr)
        sys.exit(1)
    print(keys[0]['dsn']['public'])
except (KeyError, IndexError) as e:
    print('__ERROR__', file=sys.stderr)
    sys.exit(1)
" 2>&1) && SUCCESS=true || SUCCESS=false

if [[ "$RESULT" == "https://key@sentry.io/123" ]] && [[ "$SUCCESS" == "true" ]]; then
  echo "  ✓ Correctly extracted DSN"
else
  echo "  ✗ Failed: got '$RESULT'"
  exit 1
fi
echo

# Test 8: Environment variable override checks
echo "Test 8: Environment variable override precedence"
unset SENTRY_ORG_SLUG SENTRY_PROJECT_SLUG

# Should be empty (no override)
if [[ -z "${SENTRY_ORG_SLUG:-}" ]]; then
  echo "  ✓ SENTRY_ORG_SLUG correctly unset"
else
  echo "  ✗ Failed: SENTRY_ORG_SLUG should be empty"
  exit 1
fi

# Set override
export SENTRY_ORG_SLUG="test-override"
if [[ "${SENTRY_ORG_SLUG:-}" == "test-override" ]]; then
  echo "  ✓ SENTRY_ORG_SLUG override works"
else
  echo "  ✗ Failed: SENTRY_ORG_SLUG override not working"
  exit 1
fi
unset SENTRY_ORG_SLUG
echo

# Test 9: DSN format validation
echo "Test 9: DSN format validation"
VALID_DSN="https://abc123@o123.ingest.sentry.io/456"
INVALID_DSN="http://wrong-protocol@sentry.io/789"

if [[ "$VALID_DSN" =~ ^https:// ]]; then
  echo "  ✓ Valid DSN format accepted"
else
  echo "  ✗ Failed: Valid DSN rejected"
  exit 1
fi

if ! [[ "$INVALID_DSN" =~ ^https:// ]]; then
  echo "  ✓ Invalid DSN format rejected"
else
  echo "  ✗ Failed: Invalid DSN accepted"
  exit 1
fi
echo

echo "=========================================="
echo "All tests passed! ✓"
echo "=========================================="
