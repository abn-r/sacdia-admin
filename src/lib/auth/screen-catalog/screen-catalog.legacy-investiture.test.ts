import { describe, expect, it } from "vitest";

import { collectSidebarLeaves, resolvePathEntry, SCREEN_CATALOG } from "./index";

const RETIRED_SCREENS = [
  "investiture-pending",
  "investiture-pipeline",
  "investiture-config",
  "enrollments",
];
const RETIRED_PATHS = [
  "/dashboard/investiture",
  "/dashboard/investiture/pipeline",
  "/dashboard/investiture/config",
  "/dashboard/enrollments",
];

describe("fase 8 — pantallas de la vía anterior", () => {
  it("no registra las pantallas retiradas", () => {
    for (const id of RETIRED_SCREENS) {
      expect(SCREEN_CATALOG.some((screen) => screen.id === id), id).toBe(false);
    }
  });

  it("no resuelve sus rutas ni las muestra en el sidebar", () => {
    const urls = collectSidebarLeaves().map((leaf) => leaf.url);
    for (const path of RETIRED_PATHS) {
      expect(resolvePathEntry(path), path).toBeUndefined();
      expect(urls).not.toContain(path);
    }
  });

  it("conserva las pantallas de autorización", () => {
    expect(resolvePathEntry("/dashboard/investiture-requests")?.screenId).toBe(
      "investiture-requests",
    );
    expect(resolvePathEntry("/dashboard/investiture-settings")?.screenId).toBe(
      "investiture-settings",
    );
  });
});
