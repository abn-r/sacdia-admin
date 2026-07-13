#!/usr/bin/env node
/**
 * Generates v2 dashboard pages by transforming v1 page sources.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const V1_ROOT = path.join(ROOT, "src/app/(dashboard)/dashboard");
const V2_ROOT = path.join(ROOT, "src/app/(dashboard-v2)/v2/dashboard");

const CUSTOM_V2_PAGES = new Set([
  "",
  "users",
  "users/[userId]",
  "clubs",
  "clubs/[id]",
  "enrollments",
  "evidence-review",
  "investiture",
  "investiture/pipeline",
  "investiture/config",
  "requests/membership",
  "requests/assignments",
  "requests/transfers",
  "sla",
  "annual-folders",
  "annual-folders/evaluate",
  "annual-folders/categories",
  "annual-folders/rankings",
  "annual-folders/templates",
  "annual-folders/ranking-config",
  "annual-folders/ranking-config/new",
  "annual-folders/ranking-config/[id]",
  "annual-folders/rankings/[enrollmentId]/breakdown",
  "catalogs/activity-types",
  "catalogs/allergies",
  "catalogs/camporee-event-types",
  "catalogs/class-modules",
  "catalogs/class-sections",
  "catalogs/classes",
  "catalogs/club-types",
  "catalogs/diseases",
  "catalogs/finance-categories",
  "catalogs/geography/countries",
  "catalogs/honors-catalog",
  "catalogs/inventory-categories",
  "catalogs/master-honors",
  "catalogs/medicines",
  "catalogs/relationship-types",
  "catalogs/geography/unions",
  "catalogs/geography/local-fields",
  "catalogs/geography/districts",
  "catalogs/geography/churches",
  "catalogs/club-ideals",
  "catalogs",
  "catalogs/honor-categories",
  "catalogs/ecclesiastical-years",
  "camporees/union/[id]",
  "camporees/union/[id]/events/new",
  "camporees/union/[id]/events/[eventId]/edit",
]);

function walkPages(dir, base = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const pages = [];

  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      pages.push(...walkPages(full, rel));
      continue;
    }

    if (entry.name === "page.tsx") {
      pages.push({ routePath: base, v1File: full });
    }
  }

  return pages;
}

function findTopLevelReturn(source, bodyStart) {
  let depth = 1;
  let i = bodyStart;

  while (i < source.length && depth > 0) {
    const ch = source[i];

    if (ch === "{") depth++;
    else if (ch === "}") depth--;

    if (depth === 1 && source.startsWith("return (", i)) {
      const parenStart = i + "return ".length;
      const closing = findMatchingParen(source, parenStart);
      if (closing === -1) return null;
      return { returnStart: i, parenStart, parenEnd: closing };
    }

    i++;
  }

  return null;
}

function findMatchingParen(source, openIdx) {
  if (source[openIdx] !== "(") return -1;
  let depth = 0;
  for (let i = openIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function copyAllColocatedComponents() {
  function walk(base = "") {
    const full = path.join(V1_ROOT, base);
    if (!fs.existsSync(full)) return;

    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      const child = path.join(full, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "_components") {
          const dest = path.join(V2_ROOT, base, "_components");
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.cpSync(child, dest, { recursive: true });
        } else {
          walk(rel);
        }
      }
    }
  }

  walk();
}

function injectPanelRedirectImport(source) {
  if (source.includes("panelRedirect")) return source;
  if (!/redirect\(\s*['"`]\/dashboard/.test(source)) return source;

  const firstImport = source.match(/^import .+;\n/m);
  if (!firstImport) return source;

  const insertAt = firstImport.index + firstImport[0].length;
  return (
    source.slice(0, insertAt) +
    'import { panelRedirect } from "@/lib/v2/panel-path-server";\n' +
    source.slice(insertAt)
  );
}

function rewriteDashboardRedirects(source) {
  return source.replace(
    /redirect\((['"`])(\/dashboard[^'"`]*)\1\)/g,
    "panelRedirect($1$2$1)",
  );
}

function transformV1Source(source) {
  let out = source;

  // Native v2 pages mirror v1 logic; studio layout provides chrome (no V2ContentFrame).
  // Keep canonical `/dashboard` paths — client components resolve via usePanelPath().
  out = injectPanelRedirectImport(out);
  out = rewriteDashboardRedirects(out);

  return out;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const pages = walkPages(V1_ROOT);
copyAllColocatedComponents();
let generated = 0;
let skipped = 0;

for (const { routePath, v1File } of pages) {
  if (routePath.startsWith("clubs/v2")) {
    skipped++;
    continue;
  }

  if (CUSTOM_V2_PAGES.has(routePath)) {
    skipped++;
    continue;
  }

  const source = fs.readFileSync(v1File, "utf8");
  const transformed = transformV1Source(source);
  const outPath = path.join(V2_ROOT, routePath, "page.tsx");
  ensureDir(outPath);
  fs.writeFileSync(outPath, transformed, "utf8");
  generated++;
}

console.log(`Generated ${generated} transformed v2 pages (${skipped} custom/skipped).`);
