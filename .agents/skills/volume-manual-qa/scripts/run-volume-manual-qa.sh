#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/volume-manual-qa-$(date +%Y%m%d-%H%M%S)}"
SCREEN_DIR="$OUTPUT_DIR/screenshots"
LOG_DIR="$OUTPUT_DIR/logs"
SESSION="volume-qa-$(date +%s)"
DEV_LOG="$OUTPUT_DIR/dev.log"

mkdir -p "$SCREEN_DIR" "$LOG_DIR"

check_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
}

is_post_login_url() {
  local url="$1"
  [[ "$url" == *"/today"* || "$url" == *"/coach"* ]]
}

assert_route_url() {
  local label="$1"
  local url="$2"
  shift 2

  if [[ "$url" == *"/pricing?reason=expired"* || "$url" == *"/sign-in"* ]]; then
    echo "$label redirected away from authenticated route: $url" >&2
    exit 1
  fi

  local expected_path
  for expected_path in "$@"; do
    if [[ "$url" == *"$expected_path"* ]]; then
      return 0
    fi
  done

  echo "$label landed on unexpected URL: $url (expected one of: $*)" >&2
  exit 1
}

wait_for_send_enabled() {
  local attempts=10
  local delay_seconds=0.2
  local send_after

  for _ in $(seq 1 "$attempts"); do
    agent-browser --session "$SESSION" is enabled 'button:has-text("Send")' \
      >"$LOG_DIR/send-enabled-after.txt"
    send_after="$(cat "$LOG_DIR/send-enabled-after.txt")"
    if [[ "$send_after" == "true" ]]; then
      echo "$send_after"
      return 0
    fi
    sleep "$delay_seconds"
  done

  echo "false"
  return 1
}

check_command agent-browser
check_command jq

if [[ ! -f "$ROOT_DIR/.env.local" ]]; then
  echo "Missing .env.local at $ROOT_DIR/.env.local" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$ROOT_DIR/.env.local"
set +a

if [[ -z "${CLERK_TEST_USER_EMAIL:-}" || -z "${CLERK_TEST_USER_PASSWORD:-}" ]]; then
  echo "Missing CLERK_TEST_USER_EMAIL or CLERK_TEST_USER_PASSWORD in .env.local" >&2
  exit 1
fi

cleanup() {
  if [[ -n "${BROWSER_OPEN:-}" ]]; then
    agent-browser --session "$SESSION" close >/dev/null 2>&1 || true
  fi
  if [[ -n "${DEV_PID:-}" ]]; then
    kill "$DEV_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

pushd "$ROOT_DIR" >/dev/null

bun run dev:next >"$DEV_LOG" 2>&1 &
DEV_PID=$!

for _ in {1..30}; do
  CODE="$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || true)"
  if [[ "$CODE" == "200" || "$CODE" == "302" || "$CODE" == "307" ]]; then
    break
  fi
  sleep 1
done

HEALTH_JSON="$LOG_DIR/health.json"
curl -sS http://localhost:3000/api/health >"$HEALTH_JSON"
HEALTH_STATUS="$(jq -r '.status // "unknown"' "$HEALTH_JSON")"
if [[ "$HEALTH_STATUS" != "pass" ]]; then
  echo "Health check failed: status=$HEALTH_STATUS" >&2
  exit 1
fi

rm -f "$HOME/.agent-browser/$SESSION.sock" "$HOME/.agent-browser/$SESSION.pid"

agent-browser --session "$SESSION" open "http://localhost:3000/sign-in?redirect_url=http://localhost:3000/coach" >/dev/null
BROWSER_OPEN=1
agent-browser --session "$SESSION" wait 1500 >/dev/null
agent-browser --session "$SESSION" screenshot "$SCREEN_DIR/signin.png" >/dev/null

agent-browser --session "$SESSION" fill 'input[placeholder="Enter your email address"]' "$CLERK_TEST_USER_EMAIL" >/dev/null
agent-browser --session "$SESSION" fill 'input[placeholder="Enter your password"]' "$CLERK_TEST_USER_PASSWORD" >/dev/null
agent-browser --session "$SESSION" click 'button:has-text("Continue")' >/dev/null
agent-browser --session "$SESSION" wait 3000 >/dev/null
agent-browser --session "$SESSION" get url >"$LOG_DIR/post-login-url.txt"
agent-browser --session "$SESSION" screenshot "$SCREEN_DIR/post-login.png" >/dev/null

POST_LOGIN_URL="$(cat "$LOG_DIR/post-login-url.txt")"
if ! is_post_login_url "$POST_LOGIN_URL"; then
  echo "Authenticated user landed on unexpected route: $POST_LOGIN_URL" >&2
  exit 1
fi

agent-browser --session "$SESSION" open "http://localhost:3000/today" >/dev/null
agent-browser --session "$SESSION" wait 1500 >/dev/null
agent-browser --session "$SESSION" get url >"$LOG_DIR/today-url.txt"
agent-browser --session "$SESSION" screenshot "$SCREEN_DIR/today.png" >/dev/null
TODAY_URL="$(cat "$LOG_DIR/today-url.txt")"
assert_route_url "Today route" "$TODAY_URL" "/today"

agent-browser --session "$SESSION" open "http://localhost:3000/coach" >/dev/null
agent-browser --session "$SESSION" wait 1500 >/dev/null
agent-browser --session "$SESSION" get url >"$LOG_DIR/coach-url.txt"
agent-browser --session "$SESSION" screenshot "$SCREEN_DIR/coach.png" >/dev/null
COACH_URL="$(cat "$LOG_DIR/coach-url.txt")"
assert_route_url "Coach route" "$COACH_URL" "/today"

agent-browser --session "$SESSION" is enabled 'button:has-text("Send")' >"$LOG_DIR/send-enabled-before.txt"
SEND_BEFORE="$(cat "$LOG_DIR/send-enabled-before.txt")"
if [[ "$SEND_BEFORE" != "false" ]]; then
  echo "Coach send button should start disabled; got: $SEND_BEFORE" >&2
  exit 1
fi

agent-browser --session "$SESSION" keyboard type "show today's summary" >/dev/null
if ! SEND_AFTER="$(wait_for_send_enabled)"; then
  echo "Coach send button did not enable after typing" >&2
  exit 1
fi

agent-browser --session "$SESSION" click 'button:has-text("Send")' >/dev/null
agent-browser --session "$SESSION" wait 2500 >/dev/null
agent-browser --session "$SESSION" screenshot "$SCREEN_DIR/coach-after-send.png" >/dev/null

COACH_API_RAW="$LOG_DIR/coach-response-raw.json.txt"
COACH_API_JSON="$LOG_DIR/coach-response.json"

agent-browser --session "$SESSION" eval "(async () => {
  const res = await fetch('/api/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'show today summary' }],
      preferences: { unit: 'lbs', soundEnabled: true, timezoneOffsetMinutes: 0 }
    })
  });
  const data = await res.json();
  return JSON.stringify(data);
})()" >"$COACH_API_RAW"

jq -r '.' "$COACH_API_RAW" >"$COACH_API_JSON"

ASSISTANT_TEXT="$(jq -r '.assistantText // ""' "$COACH_API_JSON")"
TOOLS_USED_CSV="$(jq -r '.trace.toolsUsed // [] | join(",")' "$COACH_API_JSON")"
FALLBACK_USED="$(jq -r '.trace.fallbackUsed // false' "$COACH_API_JSON")"
MODEL_ID="$(jq -r '.trace.model // ""' "$COACH_API_JSON")"

if [[ -z "$ASSISTANT_TEXT" ]]; then
  echo "Coach semantic check failed: assistantText is empty" >&2
  exit 1
fi

if [[ "$FALLBACK_USED" == "true" || "$MODEL_ID" == "runtime-unavailable" ]]; then
  echo "Coach semantic check failed: fallback/runtime-unavailable response" >&2
  exit 1
fi

if ! jq -e '.trace.toolsUsed | length > 0' "$COACH_API_JSON" >/dev/null; then
  echo "Coach semantic check failed: no tools used for today summary prompt" >&2
  exit 1
fi

if ! jq -e '.trace.toolsUsed | index("get_today_summary") != null' "$COACH_API_JSON" >/dev/null; then
  echo "Coach semantic check failed: expected get_today_summary tool usage" >&2
  exit 1
fi

if grep -Eiq "can't process|runtime unavailable|tool execution failed|hit an error while planning" <<<"$ASSISTANT_TEXT"; then
  echo "Coach semantic check failed: assistant returned error-like content" >&2
  exit 1
fi

if ! grep -Eiq "today|set|logged|summary|no sets|blank slate" <<<"$ASSISTANT_TEXT"; then
  echo "Coach semantic check failed: assistant text does not match today-summary intent" >&2
  exit 1
fi

agent-browser --session "$SESSION" console >"$LOG_DIR/console.txt"
agent-browser --session "$SESSION" errors >"$LOG_DIR/errors.txt"

ERROR_LINES="$(wc -l <"$LOG_DIR/errors.txt" | tr -d ' ')"
if [[ "$ERROR_LINES" -gt 0 ]]; then
  echo "Manual QA failed: page errors detected ($ERROR_LINES)" >&2
  exit 1
fi

cat >"$OUTPUT_DIR/report.md" <<EOF
# Volume Manual QA Report

- Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- Output dir: $OUTPUT_DIR
- Session: $SESSION

## Result

- Status: PASS
- Health endpoint: $HEALTH_STATUS
- Post-login URL: $POST_LOGIN_URL
- Today URL: $TODAY_URL
- Coach URL: $COACH_URL
- Send enabled before typing: $SEND_BEFORE
- Send enabled after typing: $SEND_AFTER
- Page error lines: $ERROR_LINES
- Semantic assistant text: $ASSISTANT_TEXT
- Semantic tools used: $TOOLS_USED_CSV
- Semantic fallback used: $FALLBACK_USED
- Semantic model: $MODEL_ID

## Artifacts

- Screenshots:
  - $SCREEN_DIR/signin.png
  - $SCREEN_DIR/post-login.png
  - $SCREEN_DIR/today.png
  - $SCREEN_DIR/coach.png
  - $SCREEN_DIR/coach-after-send.png
- Logs:
  - $LOG_DIR/health.json
  - $LOG_DIR/post-login-url.txt
  - $LOG_DIR/today-url.txt
  - $LOG_DIR/coach-url.txt
  - $LOG_DIR/send-enabled-before.txt
  - $LOG_DIR/send-enabled-after.txt
  - $LOG_DIR/coach-response-raw.json.txt
  - $LOG_DIR/coach-response.json
  - $LOG_DIR/console.txt
  - $LOG_DIR/errors.txt
  - $DEV_LOG

## Notes

- Console may include known development warnings (e.g., Clerk dev keys, CSP-blocked PostHog script loads).
- Any redirect to \`/pricing?reason=expired\` for the QA account is a setup failure for authenticated QA.
EOF

echo "PASS: volume manual QA"
echo "Report: $OUTPUT_DIR/report.md"

popd >/dev/null
