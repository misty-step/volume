const fs = require("fs");
const path = require("path");

const EVENTS_FILE = path.join(__dirname, "../src/lib/analytics/events.ts");
const DOCS_STUB = path.join(__dirname, "analytics-docs-stub.json");

try {
  const docsEvents = JSON.parse(fs.readFileSync(DOCS_STUB, "utf8"));
  const eventsContent = fs.readFileSync(EVENTS_FILE, "utf8");

  // Find the EventDefinitions object
  const defsStart = eventsContent.indexOf("export const EventDefinitions");
  if (defsStart === -1) {
    console.error("Could not find EventDefinitions in events.ts");
    process.exit(1);
  }

  const defsContent = eventsContent.slice(defsStart);
  const keys = [];
  // Regex to match keys in the object literal: "Key Name": {
  const regex = /^\s*"([^"]+)":\s*\{/gm;
  let match;

  while ((match = regex.exec(defsContent)) !== null) {
    keys.push(match[1]);
  }

  const missingInDocs = keys.filter((k) => !docsEvents.includes(k));
  const missingInCode = docsEvents.filter((k) => !keys.includes(k));

  let hasError = false;

  if (missingInDocs.length > 0) {
    console.error(
      "❌ Events defined in code but missing in docs (stub):",
      missingInDocs
    );
    hasError = true;
  }

  if (missingInCode.length > 0) {
    console.error(
      "❌ Events defined in docs (stub) but missing in code:",
      missingInCode
    );
    hasError = true;
  }

  if (hasError) {
    process.exit(1);
  }

  console.log("✅ Analytics events sync check passed.");
} catch (error) {
  console.error("Script failed:", error);
  process.exit(1);
}
