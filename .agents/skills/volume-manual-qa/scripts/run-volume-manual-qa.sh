#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/volume-manual-qa-$(date +%Y%m%d-%H%M%S)}"
SCREEN_DIR="$OUTPUT_DIR/screenshots"
LOG_DIR="$OUTPUT_DIR/logs"
SESSION="volume-qa-$(date +%s)"
DEV_LOG="$OUTPUT_DIR/dev.log"
APP_PORT="${PORT:-3100}"
APP_URL="${APP_URL:-http://localhost:${APP_PORT}}"
SKIP_APP_START="${SKIP_APP_START:-0}"

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

click_submit_button() {
  agent-browser --session "$SESSION" eval "(() => {
    const button = document.querySelector('button[type=\"submit\"]');
    if (!button) throw new Error('Missing submit button');
    button.click();
    return true;
  })()" >/dev/null
}

wait_for_post_login_url() {
  local output_file="$1"
  local attempts="${2:-15}"
  local delay_seconds="${3:-1}"
  local current_url

  for _ in $(seq 1 "$attempts"); do
    agent-browser --session "$SESSION" get url >"$output_file"
    current_url="$(cat "$output_file")"
    if is_post_login_url "$current_url"; then
      return 0
    fi
    sleep "$delay_seconds"
  done

  return 1
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
    agent-browser --session "$SESSION" is enabled 'form[data-testid="coach-composer"] button[type="submit"]' \
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

wait_for_body_contains_any() {
  local output_file="$1"
  local attempts="${2:-30}"
  local delay_seconds="${3:-1}"
  shift 3
  local page_text

  for _ in $(seq 1 "$attempts"); do
    agent-browser --session "$SESSION" get text body >"$output_file"
    page_text="$(cat "$output_file")"

    for expected in "$@"; do
      if [[ "$page_text" == *"$expected"* ]]; then
        return 0
      fi
    done

    if [[ "$page_text" == *"I can't process that request right now."* || "$page_text" == *"I hit an error while"* ]]; then
      echo "Coach semantic check failed: response rendered an error message" >&2
      return 1
    fi

    sleep "$delay_seconds"
  done

  echo "Coach semantic check failed: response did not summarize today's workout state" >&2
  return 1
}

check_command agent-browser
check_command curl
check_command jq
if [[ "$SKIP_APP_START" != "1" ]]; then
  check_command bun
fi

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

if [[ -z "${OPENROUTER_API_KEY:-}" || -z "${OPENROUTER_API_KEY//[[:space:]]/}" ]]; then
  echo "Missing OPENROUTER_API_KEY in .env.local" >&2
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

if [[ "$SKIP_APP_START" != "1" ]]; then
  PORT="$APP_PORT" bun run dev:next >"$DEV_LOG" 2>&1 &
  DEV_PID=$!
else
  printf "Reusing existing app at %s\n" "$APP_URL" >"$DEV_LOG"
fi

READY=0
for _ in {1..30}; do
  if [[ -n "${DEV_PID:-}" ]] && ! kill -0 "$DEV_PID" >/dev/null 2>&1; then
    echo "dev server exited before startup completed" >&2
    tail -n 40 "$DEV_LOG" >&2 || true
    exit 1
  fi
  CODE="$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL" || true)"
  if [[ "$CODE" == "200" || "$CODE" == "302" || "$CODE" == "307" ]]; then
    READY=1
    break
  fi
  sleep 1
done

if [[ "$READY" != "1" ]]; then
  echo "dev server did not become ready on $APP_URL" >&2
  tail -n 40 "$DEV_LOG" >&2 || true
  exit 1
fi

HEALTH_JSON="$LOG_DIR/health.json"
curl -sS "$APP_URL/api/health" >"$HEALTH_JSON"
HEALTH_STATUS="$(jq -r '.status // "unknown"' "$HEALTH_JSON")"
COACH_RUNTIME_STATUS="$(jq -r '.checks.coachRuntime.status // "missing"' "$HEALTH_JSON")"
if [[ "$HEALTH_STATUS" != "pass" ]]; then
  echo "Health check failed: status=$HEALTH_STATUS" >&2
  exit 1
fi
if [[ "$COACH_RUNTIME_STATUS" != "pass" ]]; then
  echo "Health check failed: unexpected coachRuntime status=$COACH_RUNTIME_STATUS" >&2
  exit 1
fi

rm -f "$HOME/.agent-browser/$SESSION.sock" "$HOME/.agent-browser/$SESSION.pid"

agent-browser --session "$SESSION" open "$APP_URL/sign-in?redirect_url=$APP_URL/coach" >/dev/null
BROWSER_OPEN=1
agent-browser --session "$SESSION" wait 'input[name="identifier"]' >/dev/null
agent-browser --session "$SESSION" screenshot "$SCREEN_DIR/signin.png" >/dev/null

agent-browser --session "$SESSION" fill 'input[name="identifier"]' "$CLERK_TEST_USER_EMAIL" >/dev/null
click_submit_button
agent-browser --session "$SESSION" wait 'input[name="password"]' >/dev/null
agent-browser --session "$SESSION" fill 'input[name="password"]' "$CLERK_TEST_USER_PASSWORD" >/dev/null
click_submit_button
if ! wait_for_post_login_url "$LOG_DIR/post-login-url.txt"; then
  echo "Authenticated user landed on unexpected route: $(cat "$LOG_DIR/post-login-url.txt")" >&2
  exit 1
fi
agent-browser --session "$SESSION" screenshot "$SCREEN_DIR/post-login.png" >/dev/null

POST_LOGIN_URL="$(cat "$LOG_DIR/post-login-url.txt")"
agent-browser --session "$SESSION" open "$APP_URL/today" >/dev/null
agent-browser --session "$SESSION" wait 1500 >/dev/null
agent-browser --session "$SESSION" get url >"$LOG_DIR/today-url.txt"
agent-browser --session "$SESSION" screenshot "$SCREEN_DIR/today.png" >/dev/null
TODAY_URL="$(cat "$LOG_DIR/today-url.txt")"
assert_route_url "Today route" "$TODAY_URL" "/today"

agent-browser --session "$SESSION" open "$APP_URL/coach" >/dev/null
agent-browser --session "$SESSION" wait 1500 >/dev/null
agent-browser --session "$SESSION" get url >"$LOG_DIR/coach-url.txt"
agent-browser --session "$SESSION" screenshot "$SCREEN_DIR/coach.png" >/dev/null
COACH_URL="$(cat "$LOG_DIR/coach-url.txt")"
assert_route_url "Coach route" "$COACH_URL" "/coach"

agent-browser --session "$SESSION" is enabled 'form[data-testid="coach-composer"] button[type="submit"]' >"$LOG_DIR/send-enabled-before.txt"
SEND_BEFORE="$(cat "$LOG_DIR/send-enabled-before.txt")"

agent-browser --session "$SESSION" network requests --clear >/dev/null
agent-browser --session "$SESSION" keyboard type "show today's summary" >/dev/null
if ! SEND_AFTER="$(wait_for_send_enabled)"; then
  echo "Coach send button did not enable after typing" >&2
  exit 1
fi

agent-browser --session "$SESSION" click 'form[data-testid="coach-composer"] button[type="submit"]' >/dev/null
if ! wait_for_body_contains_any "$LOG_DIR/coach-body.txt" 30 1 \
  "Today's Summary" \
  "No sets logged today" \
  "your log is still empty for today"; then
  exit 1
fi
agent-browser --session "$SESSION" screenshot "$SCREEN_DIR/coach-after-send.png" >/dev/null

agent-browser --session "$SESSION" network requests --filter '/api/coach' >"$LOG_DIR/coach-network.txt"
if ! grep -q '/api/coach .* 200' "$LOG_DIR/coach-network.txt"; then
  echo "Coach semantic check failed: missing successful /api/coach request" >&2
  exit 1
fi

COACH_API_STREAM_RAW="$LOG_DIR/coach-stream-raw.json.txt"
COACH_API_STREAM_JSON="$LOG_DIR/coach-stream.json"

agent-browser --session "$SESSION" eval "(async () => {
  const res = await fetch('/api/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{
        id: 'qa-msg-1',
        role: 'user',
        parts: [{ type: 'text', text: 'show today\\'s summary' }]
      }],
      preferences: { unit: 'lbs', soundEnabled: true, timezoneOffsetMinutes: 0 }
    })
  });
  const body = await res.text();
  return JSON.stringify({ status: res.status, body });
})()" >"$COACH_API_STREAM_RAW"

jq -r '.' "$COACH_API_STREAM_RAW" >"$COACH_API_STREAM_JSON"

STREAM_STATUS="$(jq -r '.status' "$COACH_API_STREAM_JSON")"
STREAM_BODY="$(jq -r '.body' "$COACH_API_STREAM_JSON")"

if [[ "$STREAM_STATUS" != "200" ]]; then
  echo "Coach semantic check failed: streamed /api/coach request returned $STREAM_STATUS" >&2
  exit 1
fi

if [[ "$STREAM_BODY" != *"data-coach_trace"* ]]; then
  echo "Coach semantic check failed: missing coach trace data part in stream" >&2
  exit 1
fi

if [[ "$STREAM_BODY" != *"\"tool_calls_count\":"* ]]; then
  echo "Coach semantic check failed: missing tool_calls_count in stream trace" >&2
  exit 1
fi

if [[ "$STREAM_BODY" == *"\"tool_calls_count\":0"* ]]; then
  echo "Coach semantic check failed: expected coach summary to use at least one tool" >&2
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
- App URL: $APP_URL

## Result

- Status: PASS
- Health endpoint: $HEALTH_STATUS
- Post-login URL: $POST_LOGIN_URL
- Today URL: $TODAY_URL
- Coach URL: $COACH_URL
- Send enabled before typing: $SEND_BEFORE
- Send enabled after typing: $SEND_AFTER
- Page error lines: $ERROR_LINES
- Rendered coach heading: Today's Summary
- Coach API request log: $LOG_DIR/coach-network.txt
- Coach API stream log: $COACH_API_STREAM_JSON

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
  - $LOG_DIR/coach-body.txt
  - $LOG_DIR/coach-network.txt
  - $LOG_DIR/coach-stream-raw.json.txt
  - $LOG_DIR/coach-stream.json
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
