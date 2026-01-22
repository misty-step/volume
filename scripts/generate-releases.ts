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
 * Generate product-focused release notes using OpenAI.
 */
async function generateProductNotes(
  release: Release,
  openai: OpenAI
): Promise<string> {
  // Format changes for the prompt
  const changesSummary = release.changes
    .map((c) => {
      const scope = c.scope ? `[${c.scope}] ` : "";
      const type = c.type === "feat" ? "NEW" : c.type === "fix" ? "FIX" : c.type.toUpperCase();
      return `- ${type}: ${scope}${c.description}`;
    })
    .join("\n");

  const prompt = `You are writing release notes for Volume, a workout tracking app that helps users log sets quickly and see what's working in their fitness journey.

Given this technical changelog for version ${release.version} (released ${release.date}):

${changesSummary}

Write 2-3 short paragraphs of release notes that:
1. Lead with the most impactful user-facing change
2. Explain benefits to the user, not implementation details
3. Use second person ("you can now...")
4. Be concise and direct - no fluff
5. Skip internal/chore changes unless they improve reliability or performance
6. If the only changes are internal, focus on reliability/stability improvements

Format: Plain markdown paragraphs, no headers or bullet points. Keep it under 150 words total.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
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
