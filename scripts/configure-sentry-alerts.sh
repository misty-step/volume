#!/usr/bin/env bash
set -euo pipefail

# Configure Sentry Alerts - Idempotent Alert Setup
# Creates alerts for: new issues, error rate spikes, performance regressions
# Prerequisites: ~/.secrets with SENTRY_MASTER_TOKEN

echo "==> Sentry Alert Configuration"
echo

# Check prerequisites
[[ -f ~/.secrets ]] || { echo "Error: ~/.secrets not found"; exit 1; }

# Source secrets
source ~/.secrets
[[ -n "${SENTRY_MASTER_TOKEN:-}" ]] || { echo "Error: SENTRY_MASTER_TOKEN not in ~/.secrets"; exit 1; }

# Allow org/project override or auto-discover
if [[ -z "${SENTRY_ORG:-}" ]]; then
  SENTRY_ORG=$(curl -s "https://sentry.io/api/0/organizations/" \
    -H "Authorization: Bearer $SENTRY_MASTER_TOKEN" | \
    python3 -c "import json,sys; orgs=json.load(sys.stdin); print(orgs[0]['slug'] if orgs else '')")
  [[ -n "$SENTRY_ORG" ]] || { echo "Error: Could not auto-discover Sentry org"; exit 1; }
  echo "  Organization: $SENTRY_ORG (auto-discovered)"
else
  echo "  Organization: $SENTRY_ORG"
fi

if [[ -z "${SENTRY_PROJECT:-}" ]]; then
  SENTRY_PROJECT=$(curl -s "https://sentry.io/api/0/organizations/$SENTRY_ORG/projects/" \
    -H "Authorization: Bearer $SENTRY_MASTER_TOKEN" | \
    python3 -c "import json,sys; projects=json.load(sys.stdin); print(projects[0]['slug'] if projects else '')")
  [[ -n "$SENTRY_PROJECT" ]] || { echo "Error: Could not auto-discover Sentry project"; exit 1; }
  echo "  Project: $SENTRY_PROJECT (auto-discovered)"
else
  echo "  Project: $SENTRY_PROJECT"
fi

echo

# Helper function to check if alert exists
alert_exists() {
  local alert_name="$1"
  local alert_type="$2"  # "issue" or "metric"

  if [[ "$alert_type" == "issue" ]]; then
    local endpoint="https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/rules/"
  else
    local endpoint="https://sentry.io/api/0/organizations/$SENTRY_ORG/alert-rules/"
  fi

  curl -s "$endpoint" \
    -H "Authorization: Bearer $SENTRY_MASTER_TOKEN" | \
    python3 -c "import json,sys; alerts=json.load(sys.stdin); print('true' if any(a.get('name')=='$alert_name' for a in alerts) else 'false')"
}

# Helper function with retry for rate limiting
api_call() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local max_retries=3
  local retry=0

  while [[ $retry -lt $max_retries ]]; do
    if [[ -n "$data" ]]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
        -H "Authorization: Bearer $SENTRY_MASTER_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$data")
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
        -H "Authorization: Bearer $SENTRY_MASTER_TOKEN")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [[ "$http_code" == "429" ]]; then
      echo "    Rate limited, waiting 5s..." >&2
      sleep 5
      ((retry++))
      continue
    fi

    echo "$body"
    return 0
  done

  echo "Error: Max retries exceeded" >&2
  return 1
}

# Alert 1: New Issue Alert
echo "==> Creating New Issue Alert..."
ALERT_NAME="New Issue Alert"
if [[ "$(alert_exists "$ALERT_NAME" "issue")" == "true" ]]; then
  echo "  ✓ Alert already exists: $ALERT_NAME"
else
  api_call POST "https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/rules/" '{
    "name": "'"$ALERT_NAME"'",
    "actionMatch": "all",
    "filterMatch": "all",
    "actions": [
      {
        "id": "sentry.mail.actions.NotifyEmailAction",
        "targetType": "IssueOwners",
        "fallthroughType": "ActiveMembers"
      }
    ],
    "conditions": [
      {
        "id": "sentry.rules.conditions.first_seen_event.FirstSeenEventCondition"
      }
    ],
    "filters": [],
    "frequency": 30
  }' > /dev/null
  echo "  ✓ Created: $ALERT_NAME"
fi

# Alert 2: Error Rate Spike (>10 errors in 5 minutes)
echo "==> Creating Error Rate Spike Alert..."
ALERT_NAME="Error Rate Spike"
if [[ "$(alert_exists "$ALERT_NAME" "metric")" == "true" ]]; then
  echo "  ✓ Alert already exists: $ALERT_NAME"
else
  api_call POST "https://sentry.io/api/0/organizations/$SENTRY_ORG/alert-rules/" '{
    "name": "'"$ALERT_NAME"'",
    "aggregate": "count()",
    "dataset": "events",
    "query": "",
    "timeWindow": 5,
    "thresholdType": 0,
    "triggers": [
      {
        "label": "critical",
        "alertThreshold": 10,
        "actions": [
          {
            "type": "email",
            "targetType": "team",
            "targetIdentifier": "default"
          }
        ]
      }
    ],
    "projects": ["'"$SENTRY_PROJECT"'"],
    "owner": null,
    "environment": null
  }' > /dev/null
  echo "  ✓ Created: $ALERT_NAME"
fi

# Alert 3: Performance Regression (p95 > 3000ms)
echo "==> Creating Performance Regression Alert..."
ALERT_NAME="Performance Regression"
if [[ "$(alert_exists "$ALERT_NAME" "metric")" == "true" ]]; then
  echo "  ✓ Alert already exists: $ALERT_NAME"
else
  api_call POST "https://sentry.io/api/0/organizations/$SENTRY_ORG/alert-rules/" '{
    "name": "'"$ALERT_NAME"'",
    "aggregate": "p95(transaction.duration)",
    "dataset": "transactions",
    "query": "",
    "timeWindow": 5,
    "thresholdType": 0,
    "triggers": [
      {
        "label": "warning",
        "alertThreshold": 3000,
        "actions": [
          {
            "type": "email",
            "targetType": "team",
            "targetIdentifier": "default"
          }
        ]
      }
    ],
    "projects": ["'"$SENTRY_PROJECT"'"],
    "owner": null,
    "environment": null
  }' > /dev/null
  echo "  ✓ Created: $ALERT_NAME"
fi

echo
echo "==> Alert configuration complete!"
echo
echo "View alerts at: https://sentry.io/organizations/$SENTRY_ORG/alerts/rules/"
