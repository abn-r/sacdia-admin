#!/usr/bin/env node
/**
 * Converts bridged geography + club-ideals list v2 pages into native
 * V2CatalogListShell pages from v1 sources.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const GEOGRAPHY_ROUTES = [
  "catalogs/geography/unions",
  "catalogs/geography/local-fields",
  "catalogs/geography/districts",
  "catalogs/geography/churches",
];

const CLUB_IDEALS_ROUTE = "catalogs/club-ideals";

function addShellImport(source) {
  if (source.includes("V2CatalogListShell")) return source;
  return source.replace(
    /import \{ getTranslations \} from "next-intl\/server";\n/,
    'import { getTranslations } from "next-intl/server";\nimport { V2CatalogListShell } from "@/components/v2/catalogs/v2-catalog-list-shell";\n',
  );
}

function stripEndpointBannerImport(source) {
  return source.replace(/^import \{ EndpointErrorBanner \}[^\n]*\n/m, "");
}

function stripContentFrame(source) {
  return source.replace(/^import \{ V2ContentFrame \}[^\n]*\n/m, "");
}

function renameExport(source) {
  return source.replace(
    /export default async function (\w+)/,
    "export default async function V2$1",
  );
}

function transformGeography(source, routePath) {
  let out = source;
  out = stripContentFrame(out);
  out = stripEndpointBannerImport(out);
  out = addShellImport(out);
  out = renameExport(out);

  const patterns = [
    /return \(\s*<div className="space-y-6">\s*\{loadError && <EndpointErrorBanner state="missing" detail=\{loadError\} \/>\}\s*<GeographyListClient([\s\S]*?)\/>\s*<\/div>\s*\);/,
    /return \(\s*<V2ContentFrame>\s*<div className="space-y-6">\s*\{loadError && <EndpointErrorBanner state="missing" detail=\{loadError\} \/>\}\s*<GeographyListClient([\s\S]*?)\/>\s*<\/div>\s*<\/V2ContentFrame>\s*\);/,
  ];

  let matched = false;
  for (const pattern of patterns) {
    if (pattern.test(out)) {
      out = out.replace(
        pattern,
        `return (
    <V2CatalogListShell
      title={t("listTitle")}
      description={t("description")}
      loadError={loadError}
    >
      <GeographyListClient$1
        hidePageHeader
      />
    </V2CatalogListShell>
  );`,
      );
      matched = true;
      break;
    }
  }

  if (!matched) {
    throw new Error(`Failed to transform geography page ${routePath}`);
  }

  // Ensure v1 basePath (panel-aware via client usePanelPath)
  out = out.replace(/basePath="\/v2\/dashboard\//g, 'basePath="/dashboard/');

  return out;
}

function transformClubIdeals(source) {
  let out = source;
  out = stripContentFrame(out);
  out = stripEndpointBannerImport(out);
  out = addShellImport(out);
  out = renameExport(out);

  const patterns = [
    /return \(\s*<div className="space-y-6">\s*\{loadError && \(\s*<EndpointErrorBanner state="missing" detail=\{loadError\} \/>\s*\)\}\s*<ClubIdealListClient([\s\S]*?)\/>\s*<\/div>\s*\);/,
    /return \(\s*<V2ContentFrame>\s*<div className="space-y-6">\s*\{loadError && \(\s*<EndpointErrorBanner state="missing" detail=\{loadError\} \/>\s*\)\}\s*<ClubIdealListClient([\s\S]*?)\/>\s*<\/div>\s*<\/V2ContentFrame>\s*\);/,
    /return \(\s*<div className="space-y-6">\s*\{loadError && <EndpointErrorBanner state="missing" detail=\{loadError\} \/>\}\s*<ClubIdealListClient([\s\S]*?)\/>\s*<\/div>\s*\);/,
  ];

  let matched = false;
  for (const pattern of patterns) {
    if (pattern.test(out)) {
      out = out.replace(
        pattern,
        `return (
    <V2CatalogListShell
      title={t("listTitle")}
      description={t("description")}
      loadError={loadError}
    >
      <ClubIdealListClient$1
        hidePageHeader
      />
    </V2CatalogListShell>
  );`,
      );
      matched = true;
      break;
    }
  }

  if (!matched) {
    throw new Error("Failed to transform club-ideals page");
  }

  return out;
}

let updated = 0;

for (const routePath of GEOGRAPHY_ROUTES) {
  const v1File = path.join(ROOT, "src/app/(dashboard)/dashboard", routePath, "page.tsx");
  const v2File = path.join(ROOT, "src/app/(dashboard-v2)/v2/dashboard", routePath, "page.tsx");
  const v1Source = fs.readFileSync(v1File, "utf8");
  fs.writeFileSync(v2File, transformGeography(v1Source, routePath), "utf8");
  updated++;
}

{
  const v1File = path.join(ROOT, "src/app/(dashboard)/dashboard", CLUB_IDEALS_ROUTE, "page.tsx");
  const v2File = path.join(ROOT, "src/app/(dashboard-v2)/v2/dashboard", CLUB_IDEALS_ROUTE, "page.tsx");
  const v1Source = fs.readFileSync(v1File, "utf8");
  fs.writeFileSync(v2File, transformClubIdeals(v1Source), "utf8");
  updated++;
}

console.log(`Updated ${updated} native v2 geography/club-ideals list pages.`);
