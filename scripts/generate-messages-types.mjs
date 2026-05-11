#!/usr/bin/env node
/**
 * Generates src/i18n/messages.d.ts from the authoritative locale file
 * (messages/es.json). Run this after adding or renaming message keys.
 *
 * Usage:
 *   node scripts/generate-messages-types.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const messagesPath = resolve(ROOT, "messages", "es.json");
const outputPath = resolve(ROOT, "src", "i18n", "messages.d.ts");

/** Returns true if key is a valid unquoted TypeScript property identifier. */
function isValidTsIdentifier(key) {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}

/** @param {Record<string, unknown>} obj @param {number} indent */
function jsonToTsInterface(obj, indent = 0) {
  const lines = [];
  const pad = "  ".repeat(indent);
  for (const [k, v] of Object.entries(obj)) {
    // Keys with hyphens or other special chars must be quoted in TS interfaces
    const prop = isValidTsIdentifier(k) ? k : `"${k}"`;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      lines.push(`${pad}${prop}: {`);
      lines.push(...jsonToTsInterface(/** @type {Record<string, unknown>} */ (v), indent + 1));
      lines.push(`${pad}};`);
    } else {
      lines.push(`${pad}${prop}: string;`);
    }
  }
  return lines;
}

const messages = JSON.parse(readFileSync(messagesPath, "utf-8"));

const header = `/**
 * Type-safe next-intl message declarations.
 *
 * AUTO-GENERATED from messages/es.json (the authoritative locale).
 * Do NOT edit manually — regenerate by running:
 *   node scripts/generate-messages-types.mjs
 *
 * HOW IT WORKS:
 *   next-intl v4+ reads this interface via TypeScript module augmentation.
 *   Registering IntlMessages via AppConfig activates STRICT MODE — every
 *   useTranslations(namespace) and t(key) call is type-checked against this
 *   interface, so unknown namespaces and keys produce compile-time errors.
 *
 * ROLLOUT STATUS: STAGED (not yet enforced in typecheck CI)
 *   The IntlMessages interface is fully generated and ready. Strict enforcement
 *   is intentionally deferred because 35 pre-existing call-sites use patterns
 *   that strict mode flags correctly (dynamic keys, custom translator aliases,
 *   cross-namespace key access). Fix those call-sites first, then uncomment
 *   the AppConfig block below to activate full strict checking.
 *
 * TO ACTIVATE STRICT MODE:
 *   1. Fix the 35 call-sites (see PR description for the full list)
 *   2. Uncomment the \`declare module "next-intl"\` block below
 *   3. Run \`pnpm typecheck\` — must pass with 0 errors
 *   4. Delete this comment block
 *
 * CONCURRENT AGENT NOTE (A3 / i18n native routing):
 *   Agent A3 may add new keys to messages/es.json for routing labels.
 *   After A3 merges, run the generator again so this file stays in sync.
 */

// TO ACTIVATE STRICT MODE: uncomment this block after fixing the 35 call-sites.
// See: https://next-intl.dev/docs/workflows/typescript
//
// declare module "next-intl" {
//   interface AppConfig {
//     Messages: IntlMessages;
//   }
// }

export interface IntlMessages {`;

const footer = "}";

const propLines = jsonToTsInterface(messages, 1);
const output = [header, ...propLines, footer].join("\n") + "\n";

writeFileSync(outputPath, output, "utf-8");
console.log(`Generated ${outputPath} (${output.split("\n").length} lines)`);
