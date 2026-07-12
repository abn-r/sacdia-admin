#!/usr/bin/env node
/**
 * Adds usePanelPath() to shared client components with hardcoded /dashboard links.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP = new Set([
  "src/components/shared/panel-dashboard-link.tsx",
  "src/components/layout/app-sidebar.tsx",
  "src/components/studio-shell/app-header.tsx",
  "src/components/studio-shell/app-sidebar.tsx",
  "src/components/studio-shell/search-dialog.tsx",
  "src/components/catalogs/catalogs-hub-page.tsx",
  "src/components/membership/pending-membership-queue.tsx",
  "src/components/auth/login-form.test.tsx",
  "src/components/camporees/delete-camporee-dialog.test.tsx",
  "src/components/catalogs/geography-list-client.test.tsx",
  "src/components/dashboard/coordinator-lf-home.tsx", // server — PanelDashboardLink (manual)
  "src/components/users/users-table.tsx", // server — PanelDashboardLink (manual)
]);

const FILES = [
  "src/components/users/users-toolbar-actions.tsx",
  "src/components/users/new-user-form.tsx",
  // users-table: server component — PanelDashboardLink (manual)
  "src/components/v2/users/v2-users-table.tsx",
  "src/components/v2/dashboard/v2-recent-users-list.tsx",
  "src/components/clubs/clubs-list-client.tsx",
  "src/components/clubs/clubs-create-menu.tsx",
  "src/components/clubs/clubs-table-actions-cell.tsx",
  "src/components/honors/honors-crud-page.tsx",
  "src/components/honors/honor-form.tsx",
  "src/components/rbac/roles-table.tsx",
  "src/components/rbac/role-form.tsx",
  "src/components/reports/reports-list-client.tsx",
  "src/components/insurance/expiring-insurance-alert.tsx",
  "src/components/insurance/expiring-dashboard.tsx",
  "src/components/activities/activity-detail-actions.tsx",
  "src/components/activities/activities-table.tsx",
  "src/components/coordination/coordination-admin-client.tsx",
  "src/components/camporee-events/event-template-list-client.tsx",
  "src/components/camporee-events/event-template-form-page.tsx",
  "src/components/camporee-events/event-form-page.tsx",
  "src/components/camporee-events/timeline/event-row.tsx",
  "src/components/camporee-events/timeline/events-timeline-view.tsx",
  "src/components/camporee-events/timeline/events-toolbar.tsx",
  "src/components/certificate-bulk-imports/certificate-bulk-import-detail-page.tsx",
  "src/components/certificate-bulk-imports/certificate-bulk-import-list-page.tsx",
  "src/components/classes/classes-list.tsx",
  "src/components/certifications/certifications-list.tsx",
  "src/components/camporees/camporee-payments-tab.tsx",
  "src/components/camporees/camporee-payments-panel.tsx",
  "src/components/camporees/camporees-view.tsx",
  "src/components/units/units-tab.tsx",
];

function patchFile(relPath) {
  const filePath = path.join(ROOT, relPath);
  if (!fs.existsSync(filePath)) {
    console.warn(`Skip missing ${relPath}`);
    return false;
  }

  let source = fs.readFileSync(filePath, "utf8");
  if (!source.includes('"use client"') && !source.includes("'use client'")) {
    console.warn(`Skip non-client ${relPath}`);
    return false;
  }
  if (!source.includes("/dashboard")) return false;
  if (source.includes("usePanelPath") && !source.includes("toV2Path")) return false;

  source = source.replace(
    /import \{ toV2Path \} from "@\/lib\/v2\/route-map";\n/g,
    "",
  );

  if (!source.includes('from "@/lib/v2/panel-path-context"')) {
    const hookImport =
      'import { usePanelPath } from "@/lib/v2/panel-path-context";\n';
    const useClientMatch = source.match(/^["']use client["'];\n/m);
    if (useClientMatch) {
      const insertAt = useClientMatch.index + useClientMatch[0].length;
      source = source.slice(0, insertAt) + "\n" + hookImport + source.slice(insertAt);
    } else {
      source = hookImport + source;
    }
  }

  // LIST_HREF / ROLES_PATH — capture values before stripping const
  const capturedConsts = new Map();
  source = source.replace(
    /^const (LIST_HREF|ROLES_PATH) = ("|`|')(\/dashboard[^"`']*)\2;/gm,
    (_, name, _q, value) => {
      capturedConsts.set(name, value);
      return "";
    },
  );

  source = source.replace(
    /redirectTo="(\/dashboard[^"]+)"/g,
    'redirectTo={toPanelPath("$1")}',
  );

  source = source.replace(
    /href="(\/dashboard[^"]*)"/g,
    'href={toPanelPath("$1")}',
  );

  source = source.replace(
    /href=\{`(\/dashboard[^`]*)\$\{/g,
    'href={`${toPanelPath(`$1`)}${',
  );

  source = source.replace(
    /href=\{`(\/dashboard[^`]+)`\}/g,
    "href={toPanelPath(`$1`)}",
  );

  source = source.replace(
    /router\.push\(`(\/dashboard[^`]+)`\)/g,
    "router.push(toPanelPath(`$1`))",
  );

  source = source.replace(
    /router\.push\("(\/dashboard[^"]+)"\)/g,
    'router.push(toPanelPath("$1"))',
  );

  source = source.replace(
    /window\.location\.href = toV2Path\(`(\/dashboard[^`]+)`\)/g,
    "window.location.href = toPanelPath(`$1`)",
  );

  source = source.replace(
    /nameHref=\{([^}]*?)\? `(\/dashboard[^`]*)\$\{([^}]+)\}([^`]*?)` : undefined\}/g,
    "nameHref={$1 ? toPanelPath(`$2${$3}$4`) : undefined}",
  );

  source = source.replace(
    /const editHref = ([^?]+) \? `(\/dashboard[^`]*)\$\{([^}]+)\}([^`]*?)` : null;/g,
    "const editHref = $1 ? toPanelPath(`$2${$3}$4`) : null;",
  );

  source = source.replace(
    /const editHref = `(\/dashboard[^`]*)\$\{([^}]+)\}([^`]*?)`;/g,
    "const editHref = toPanelPath(`$1${$2}$3`);",
  );

  source = source.replace(
    /const viewHref = `(\/dashboard[^`]*)\$\{([^}]+)\}([^`]*?)`;/g,
    "const viewHref = toPanelPath(`$1${$2}$3`);",
  );

  source = source.replace(
    /const backHref = `(\/dashboard[^`]+)`;/g,
    'const backHref = toPanelPath(`$1`);',
  );

  for (const [name, value] of capturedConsts) {
    source = source.replace(
      new RegExp(`\\b${name}\\b`, "g"),
      `toPanelPath("${value}")`,
    );
  }

  // Inject hook in each exported function component missing it
  const fnRegex = /export function (\w+)\([^)]*\)\s*\{/g;
  let match;
  const injections = [];
  while ((match = fnRegex.exec(source)) !== null) {
    const bodyStart = match.index + match[0].length;
    const nextChunk = source.slice(bodyStart, bodyStart + 400);
    if (!nextChunk.includes("toPanelPath(") && !nextChunk.includes("const { toPanelPath }")) {
      injections.push({ bodyStart, name: match[1] });
    }
  }

  let offset = 0;
  for (const { bodyStart } of injections) {
    const insertAt = bodyStart + offset;
    const injection = "\n  const { toPanelPath } = usePanelPath();\n";
    source = source.slice(0, insertAt) + injection + source.slice(insertAt);
    offset += injection.length;
  }

  fs.writeFileSync(filePath, source, "utf8");
  return true;
}

let patched = 0;
for (const rel of FILES) {
  if (SKIP.has(rel)) continue;
  if (patchFile(rel)) {
    patched++;
    console.log(`Patched ${rel}`);
  }
}
console.log(`Done. Patched ${patched} files.`);
