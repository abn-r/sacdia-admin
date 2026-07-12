#!/usr/bin/env node
/**
 * Scaffolds v2 dashboard routes mirroring v1 pages.
 * Generated pages delegate to lib/v2/bridges/render-v2-page.tsx
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const V1_ROOT = path.join(ROOT, "src/app/(dashboard)/dashboard");
const V2_ROOT = path.join(ROOT, "src/app/(dashboard-v2)/v2/dashboard");

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
      const routePath = base || "";
      pages.push(routePath);
    }
  }

  return pages;
}

function hasDynamicSegments(routePath) {
  return routePath.includes("[");
}

function buildPageContent(routePath) {
  const bridgeKey = routePath || "home";
  const hasParams = hasDynamicSegments(routePath);
  const hasSearchParams = true; // most list pages use searchParams

  const propsType = [];
  if (hasParams) propsType.push("params: Promise<Record<string, string>>");
  if (hasSearchParams) {
    propsType.push(
      "searchParams?: Promise<Record<string, string | string[] | undefined>>",
    );
  }

  const propsDecl = propsType.length
    ? `{ ${propsType.join("; ")} }`
    : "";

  return `import { renderV2Page } from "@/lib/v2/bridges/render-v2-page";

export default async function Page(${propsDecl ? propsDecl : ""}) {
  return renderV2Page("${bridgeKey}"${propsDecl ? ", { params, searchParams }" : ""});
}
`;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

const routes = walkPages(V1_ROOT);
let created = 0;
let skipped = 0;

for (const routePath of routes) {
  // Skip legacy v2 redirects inside v1
  if (routePath.startsWith("clubs/v2")) {
    skipped++;
    continue;
  }

  const outPath = path.join(V2_ROOT, routePath, "page.tsx");
  const content = buildPageContent(routePath);
  ensureDir(outPath);
  fs.writeFileSync(outPath, content, "utf8");
  created++;
}

console.log(`Scaffolded ${created} v2 pages (${skipped} skipped).`);
