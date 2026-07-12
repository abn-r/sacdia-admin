#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const v1File = path.join(
  ROOT,
  "src/app/(dashboard)/dashboard/catalogs/honor-categories/page.tsx",
);
const v2File = path.join(
  ROOT,
  "src/app/(dashboard-v2)/v2/dashboard/catalogs/honor-categories/page.tsx",
);

const DYNAMIC_BLOCK_RE =
  /const HonorCategoriesCrudPage = dynamic\([\s\S]*?\);\n/g;

let out = fs.readFileSync(v1File, "utf8");
out = out.replace(DYNAMIC_BLOCK_RE, "");
out = out.replace(/^import dynamic from "next\/dynamic";\n/m, "");
out = out.replace(/^import \{ Skeleton \} from "@\/components\/ui\/skeleton";\n/m, "");

if (!out.includes("V2CatalogListShell")) {
  out = out.replace(
    /import \{ getTranslations \} from "next-intl\/server";\n/,
    'import { getTranslations } from "next-intl/server";\nimport { V2CatalogListShell } from "@/components/v2/catalogs/v2-catalog-list-shell";\nimport { HonorCategoriesCrudPage } from "@/components/catalogs/honor-categories-crud-page";\n',
  );
}

out = out.replace(
  /export default async function (\w+)/,
  "export default async function V2$1",
);

out = out.replace(
  /return \(\s*<div className="space-y-6">\s*\{loadError && <EndpointErrorBanner state="missing" detail=\{loadError\} \/>\}\s*<HonorCategoriesCrudPage([\s\S]*?)\/>\s*<\/div>\s*\);/,
  `return (
    <V2CatalogListShell
      title={tHonor("pageTitle")}
      description={tHonor("pageDescription")}
      loadError={loadError}
    >
      <HonorCategoriesCrudPage$1
        hidePageHeader
      />
    </V2CatalogListShell>
  );`,
);

if (!out.includes('getTranslations("catalogs.honorCategories")')) {
  out = out.replace(
    /const t = await getTranslations\("catalogs\.pages\.honorCategoriesList"\);/,
    `const t = await getTranslations("catalogs.pages.honorCategoriesList");
  const tHonor = await getTranslations("catalogs.honorCategories");`,
  );
}

if (out.includes("HonorCategoriesCrudPage") && out.includes("dynamic")) {
  throw new Error("Honor categories transform incomplete");
}

fs.writeFileSync(v2File, out, "utf8");
console.log("Patched honor-categories v2 page.");
