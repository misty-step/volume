#!/bin/bash
set -e

# Convex Data Sync: Production → Dev
# Safe one-way sync for local QA with production data

# Hard-coded for safety (cannot accidentally touch production)
PROD="whimsical-marten-631"  # Source: READ ONLY
DEV="curious-salamander-943"  # Target: Will be wiped (disposable)
TEMP_FILE="/tmp/convex-prod-snapshot.zip"

echo "🔄 Syncing dev with production data..."
echo "   Source: $PROD (read-only)"
echo "   Target: $DEV (will be replaced)"
echo ""

# Export from production (read-only operation)
echo "📤 Exporting from production..."
npx convex export \
  --deployment-name "$PROD" \
  --path "$TEMP_FILE" \
  --include-file-storage

# Validate export before proceeding
if [ ! -f "$TEMP_FILE" ]; then
  echo "❌ ERROR: Export file not created at $TEMP_FILE"
  echo "   Export may have failed. Aborting to protect dev data."
  exit 1
fi

# Check file size (should be > 1KB for valid export)
FILE_SIZE=$(stat -f%z "$TEMP_FILE" 2>/dev/null || stat -c%s "$TEMP_FILE" 2>/dev/null)
if [ "$FILE_SIZE" -lt 1024 ]; then
  echo "❌ ERROR: Export file is too small ($FILE_SIZE bytes)"
  echo "   Expected > 1KB. File may be corrupted. Aborting."
  rm -f "$TEMP_FILE"
  exit 1
fi

echo "✓ Export validated: $(echo "scale=2; $FILE_SIZE / 1024 / 1024" | bc)MB"

# Import to dev (wipes dev data)
echo ""
echo "📥 Importing to dev (replacing all data)..."
npx convex import \
  --deployment-name "$DEV" \
  --replace-all \
  --yes \
  "$TEMP_FILE"

# Cleanup
rm -f "$TEMP_FILE"

echo ""
echo "✅ Dev synced with production data!"
echo "   Run 'pnpm dev' to start testing with real data"
echo ""
