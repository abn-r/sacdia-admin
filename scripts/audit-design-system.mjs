#!/usr/bin/env node
/**
 * Design system drift audit for sacdia-admin.
 * Scans src/ for common violations documented in DESIGN-SYSTEM.md.
 *
 * Usage: node scripts/audit-design-system.mjs [--strict]
 * Exit 1 in --strict mode when any error-severity finding exists.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { RULES } from "./design-system-rules.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");
const STRICT = process.argv.includes("--strict");

const SKIP_DIRS = new Set(["node_modules", ".next"]);
const SCAN_EXT = new Set([".tsx", ".ts", ".css"]);

/** @type {Array<{ severity: "error" | "warn", file: string, line: number, rule: string, excerpt: string }>} */
const findings = [];


async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (SCAN_EXT.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

async function scanFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  const content = await readFile(filePath, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      if (rule.allow(rel)) continue;
      if (rule.test(line)) {
        findings.push({
          severity: rule.severity,
          file: rel,
          line: i + 1,
          rule: rule.id,
          excerpt: line.trim().slice(0, 120),
        });
      }
    }
  }
}

async function main() {
  const files = await walk(SRC);
  await Promise.all(files.map(scanFile));

  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");

  const byRule = new Map();
  for (const f of findings) {
    byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
  }

  console.log("DESIGN-SYSTEM AUDIT — sacdia-admin\n");
  console.log(`Files scanned: ${files.length}`);
  console.log(`Errors: ${errors.length} | Warnings: ${warns.length}\n`);

  if (byRule.size > 0) {
    console.log("By rule:");
    for (const [rule, count] of [...byRule.entries()].sort()) {
      console.log(`  ${rule}: ${count}`);
    }
    console.log("");
  }

  const preview = [...errors, ...warns].slice(0, 40);
  for (const f of preview) {
    console.log(
      `[${f.severity.toUpperCase()}] ${f.rule} — ${f.file}:${f.line}`,
    );
    console.log(`  ${f.excerpt}`);
  }

  if (findings.length > preview.length) {
    console.log(`\n… and ${findings.length - preview.length} more`);
  }

  if (errors.length === 0 && warns.length === 0) {
    console.log("\nNo drift findings.");
  } else if (STRICT && errors.length > 0) {
    console.error(`\nStrict mode: ${errors.length} error(s).`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
