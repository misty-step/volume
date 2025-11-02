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
