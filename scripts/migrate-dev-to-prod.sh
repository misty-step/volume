#!/bin/bash
set -e

# Convex Data Migration: Dev → Production
# Recovers from deployment misconfiguration incident (2025-10-29)

BACKUP_DIR="$HOME/convex-migration-backup-$(date +%Y%m%d-%H%M%S)"
DEV_EXPORT="$BACKUP_DIR/dev-deployment-export.zip"
DEV_DEPLOYMENT="curious-salamander-943"
PROD_DEPLOYMENT="whimsical-marten-631"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  CONVEX DATA MIGRATION: Dev → Production                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Create backup directory
echo "📁 Creating backup directory..."
mkdir -p "$BACKUP_DIR"
echo "   ✓ Created: $BACKUP_DIR"
echo ""

# Step 2: Export from dev deployment
echo "📤 Exporting data from dev deployment..."
echo "   Source: $DEV_DEPLOYMENT"
echo "   Output: $DEV_EXPORT"
echo ""

bunx convex export \
  --deployment-name "$DEV_DEPLOYMENT" \
  --path "$DEV_EXPORT" \
  --include-file-storage

echo ""
echo "   ✓ Export complete!"
echo ""

# Step 3: Verify export
if [ ! -f "$DEV_EXPORT" ]; then
  echo "❌ ERROR: Export file not created"
  exit 1
fi

FILE_SIZE=$(du -h "$DEV_EXPORT" | cut -f1)
echo "   Export size: $FILE_SIZE"
echo ""

# Step 4: Show preview of what will be imported
echo "📊 Export contents:"
unzip -l "$DEV_EXPORT" | grep -E "(exercises|sets)/documents.jsonl" || echo "   (checking contents...)"
echo ""

# Step 5: Confirm before import
echo "⚠️  IMPORTANT: About to import to PRODUCTION deployment"
echo "   Target: $PROD_DEPLOYMENT"
echo ""
read -p "   Continue with import? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo ""
  echo "❌ Import cancelled"
  echo "   Export saved at: $DEV_EXPORT"
  exit 0
fi

echo ""
echo "📥 Importing data to production deployment..."
echo "   Target: $PROD_DEPLOYMENT"
echo "   Using --replace-all (will clear existing prod data)"
echo ""

# Step 6: Import to production
bunx convex import \
  --deployment-name "$PROD_DEPLOYMENT" \
  --replace-all \
  --yes \
  "$DEV_EXPORT"

echo ""
echo "   ✓ Import complete!"
echo ""

# Step 7: Success message
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✓ MIGRATION COMPLETE                                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Verify data in production dashboard:"
echo "   https://dashboard.convex.dev/deployment/whimsical-marten-631"
echo ""
echo "2. Trigger production redeploy:"
echo "   git commit --allow-empty -m 'chore: redeploy with migrated data'"
echo "   git push origin master"
echo ""
echo "3. Verify at https://volume.fitness"
echo ""
echo "Backup saved at: $BACKUP_DIR"
