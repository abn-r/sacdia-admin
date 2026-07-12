#!/usr/bin/env node
/**
 * Converts bridged Phase E catalog v2 pages (V2ContentFrame) into native
 * V2PhaseECatalogPage shells using logic from matching v1 pages.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PHASE_E_ROUTES = [
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
];

const DYNAMIC_BLOCK_RE =
  /const PhaseECatalogCrudPage = dynamic\([\s\S]*?\);\n/g;

function stripDynamicImport(source) {
  return source.replace(DYNAMIC_BLOCK_RE, "");
}

function stripSkeletonImports(source) {
  return source
    .replace(/^import dynamic from "next\/dynamic";\n/m, "")
    .replace(/^import \{ Skeleton \} from "@\/components\/ui\/skeleton";\n/m, "");
}

function transformV1ToV2(source, routePath) {
  let out = source;

  out = out.replace(/^import \{ V2ContentFrame \}[^\n]*\n/m, "");
  out = stripDynamicImport(out);
  out = stripSkeletonImports(out);

  if (!out.includes('import { V2PhaseECatalogPage }')) {
    out = out.replace(
      /^(import .+\n)(?!import )/m,
      '$1import { V2PhaseECatalogPage } from "@/components/v2/catalogs/v2-phase-e-catalog-page";\n',
    );
  }

  out = out.replace(
    /export default async function (\w+)/,
    "export default async function V2$1",
  );

  out = out.replace(
    /return \(\s*<div className="space-y-6">\s*\{loadError && <EndpointErrorBanner state="missing" detail=\{loadError\} \/>\}\s*<PhaseECatalogCrudPage([\s\S]*?)\/>\s*<\/div>\s*\);/,
    "return (\n    <V2PhaseECatalogPage\n      loadError={loadError}$1/>\n  );",
  );

  // Bridged v2 pages wrap in V2ContentFrame — handle that pattern too
  out = out.replace(
    /return \(\s*<V2ContentFrame>\s*<div className="space-y-6">\s*\{loadError && <EndpointErrorBanner state="missing" detail=\{loadError\} \/>\}\s*<PhaseECatalogCrudPage([\s\S]*?)\/>\s*<\/div>\s*<\/V2ContentFrame>\s*\);/,
    "return (\n    <V2PhaseECatalogPage\n      loadError={loadError}$1/>\n  );",
  );

  if (out.includes("PhaseECatalogCrudPage")) {
    throw new Error(`Failed to transform ${routePath}: PhaseECatalogCrudPage still present`);
  }

  return out;
}

let updated = 0;

for (const routePath of PHASE_E_ROUTES) {
  const v1File = path.join(ROOT, "src/app/(dashboard)/dashboard", routePath, "page.tsx");
  const v2File = path.join(ROOT, "src/app/(dashboard-v2)/v2/dashboard", routePath, "page.tsx");

  if (!fs.existsSync(v1File)) {
    console.warn(`Skip ${routePath}: v1 missing`);
    continue;
  }

  const v1Source = fs.readFileSync(v1File, "utf8");
  const v2Source = transformV1ToV2(v1Source, routePath);
  fs.mkdirSync(path.dirname(v2File), { recursive: true });
  fs.writeFileSync(v2File, v2Source, "utf8");
  updated++;
}

console.log(`Updated ${updated} native v2 Phase E catalog pages.`);
