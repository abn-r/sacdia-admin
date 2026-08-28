import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");

describe("development deployment entrypoints", () => {
  it("keeps every route dependency required by the development panel", () => {
    const requiredModules = [
      "components/catalogs/catalog-crud-page.tsx",
      "components/rankings/breakdown-view.tsx",
      "lib/api/analytics.ts",
      "lib/catalogs/actions.ts",
      "lib/api/member-rankings.ts",
      "lib/ui/app-alerts.ts",
      "lib/ui/app-alert-params.ts",
    ];

    for (const modulePath of requiredModules) {
      expect(existsSync(resolve(sourceRoot, modulePath)), modulePath).toBe(true);
    }
  });
});
