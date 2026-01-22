#!/usr/bin/env tsx
/**
 * Release Notes Generator
 *
 * Parses CHANGELOG.md and generates:
 * 1. Structured JSON for each release (technical)
 * 2. LLM-synthesized product notes (user-focused)
 *
 * Usage:
 *   pnpm generate:releases           # Generate missing releases
 *   pnpm generate:releases --dry-run # Parse only, no LLM calls
 *   pnpm generate:releases --force   # Regenerate all releases
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import OpenAI from "openai";
import {
  parseChangelog,
  formatReleaseMarkdown,
} from "../src/lib/releases/parser";
import type { Release, ReleaseManifest, ChangelogEntry } from "../src/lib/releases/types";

const CONTENT_DIR = join(process.cwd(), "content/releases");
const CHANGELOG_PATH = join(process.cwd(), "CHANGELOG.md");

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");

/**
 * Build the system prompt for release notes generation.
 * Encodes Volume's voice and strict rules for user-focused copy.
 */
function buildSystemPrompt(): string {
  return `You are a product writer for Volume, a workout tracking app. Your job is to translate technical changes into benefits users care about.

VOICE:
- Direct, confident, no hedging
- Friendly but not overly casual
- Celebrate wins without being cheesy
- Second person: "you" not "users"

CRITICAL RULES - NEVER VIOLATE:
1. NO TECHNICAL JARGON. Never mention:
   - Hook names (useX, useSomething)
   - Component names (ExerciseCard, SettingsPanel)
   - Internal APIs, functions, or implementation details
   - Technical patterns (centralized, abstraction, refactor)

2. BENEFITS OVER MECHANISMS. Always ask "so what does this mean for the user?"
   - BAD: "Added a useUndoableAction hook that centralizes undo logic"
   - GOOD: "Made a mistake? You can now undo accidental deletions with one tap"

3. VALUE OVER FEATURES. Focus on what users can DO, not what we built.
   - BAD: "Implemented soft delete with automatic restore functionality"
   - GOOD: "Accidentally delete an exercise? No problem—just add it again and your history comes back"

4. SKIP INTERNAL CHANGES. Don't mention:
   - Refactoring, code cleanup, or "under the hood" work
   - Dependencies, libraries, or technical debt
   - Unless they directly improve speed, reliability, or user experience

5. KEEP IT REAL. Write like you're telling a friend what's new, not writing a press release.`;
}

/**
 * Generate product-focused release notes using OpenAI.
 */
async function generateProductNotes(
  release: Release,
  openai: OpenAI
): Promise<string> {
  // Format changes for the prompt - strip technical markers
  const changesSummary = release.changes
    .filter((c) => c.type === "feat" || c.type === "fix" || c.type === "perf")
    .map((c) => {
      const type = c.type === "feat" ? "NEW" : c.type === "fix" ? "FIXED" : "FASTER";
      return `- ${type}: ${c.description}`;
    })
    .join("\n");

  // Count internal-only changes
  const internalCount = release.changes.filter(
    (c) => c.type === "chore" || c.type === "refactor" || c.type === "docs"
  ).length;

  const userPrompt = `Write release notes for Volume v${release.version} (${release.date}).

TECHNICAL CHANGELOG (translate these into user benefits):
${changesSummary || "(No user-facing changes listed)"}
${internalCount > 0 ? `\n(Plus ${internalCount} internal improvements for stability)` : ""}

REQUIREMENTS:
- 2-3 short paragraphs, under 120 words total
- Lead with the most valuable change for users
- No bullet points, no headers—just conversational paragraphs
- If only internal changes, write about improved reliability/stability
- Remember: NO technical jargon, hook names, or implementation details`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

/**
 * Check if release content already exists.
 */
function releaseExists(version: string): boolean {
  const dir = join(CONTENT_DIR, `v${version}`);
  return existsSync(join(dir, "changelog.json")) && existsSync(join(dir, "notes.md"));
}

/**
 * Save release content to disk.
 */
function saveRelease(release: Release, productNotes: string): void {
  const dir = join(CONTENT_DIR, `v${release.version}`);
  mkdirSync(dir, { recursive: true });

  // Save structured changelog
  writeFileSync(
    join(dir, "changelog.json"),
    JSON.stringify(release, null, 2)
  );

  // Save product notes
  writeFileSync(join(dir, "notes.md"), productNotes);

  console.log(`  ✓ Saved v${release.version}`);
}

/**
 * Update the manifest file.
 */
function updateManifest(releases: Release[]): void {
  const manifest: ReleaseManifest = {
    latest: releases[0]?.version || "",
    versions: releases.map((r) => r.version),
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(
    join(CONTENT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`  ✓ Updated manifest (${manifest.versions.length} versions)`);
}

async function main() {
  console.log("Release Notes Generator");
  console.log("=======================\n");

  // Parse changelog
  console.log("Parsing CHANGELOG.md...");
  const releases = parseChangelog(CHANGELOG_PATH);
  console.log(`  Found ${releases.length} releases\n`);

  if (DRY_RUN) {
    console.log("DRY RUN - Parsed releases:");
    for (const release of releases) {
      const feats = release.changes.filter((c) => c.type === "feat").length;
      const fixes = release.changes.filter((c) => c.type === "fix").length;
      console.log(
        `  v${release.version} (${release.date}): ${feats} features, ${fixes} fixes`
      );
    }
    return;
  }

  // Ensure content directory exists
  mkdirSync(CONTENT_DIR, { recursive: true });

  // Initialize OpenAI
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("ERROR: OPENAI_API_KEY not set");
    console.error("Set it in your environment or .env.local");
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey });

  // Generate missing releases
  console.log("Generating release notes...");
  let generated = 0;
  let skipped = 0;

  for (const release of releases) {
    if (!FORCE && releaseExists(release.version)) {
      skipped++;
      continue;
    }

    console.log(`  Generating v${release.version}...`);
    const productNotes = await generateProductNotes(release, openai);
    saveRelease(release, productNotes);
    generated++;

    // Small delay to avoid rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  // Update manifest
  console.log("\nUpdating manifest...");
  updateManifest(releases);

  console.log(`\nDone! Generated: ${generated}, Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
