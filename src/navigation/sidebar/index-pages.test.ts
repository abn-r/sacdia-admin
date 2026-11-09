import { describe, expect, it } from "vitest";

import { canAccessDashboardPath } from "@/lib/auth/require-page-access";
import { canViewScreen, getScreen, resolvePathEntry, resolveScreenPath } from "@/lib/auth/screen-catalog";
import { buildAuthUser } from "@/lib/auth/testing/auth-user-fixture";

import {
  ALL_INDEX_LINKS,
  CATALOGS_INDEX_PATH,
  CATALOGS_INDEX_SECTIONS,
  CONFIGURATION_INDEX_PATH,
  CONFIGURATION_INDEX_SECTIONS,
} from "./index-pages";
import { resolveIndexSections } from "./index-pages-resolve";
import { sidebarItems } from "./sidebar-items";

const tNav = Object.assign((key: string) => key, { has: () => false });

function user(roles: string[], permissions: string[] = []) {
  return buildAuthUser({ roles, permissions });
}

function visibleLinkIds(sections: typeof CATALOGS_INDEX_SECTIONS, u: ReturnType<typeof user>) {
  return resolveIndexSections(sections, (link) => canAccessDashboardPath(u, link.url), tNav).flatMap(
    (section) => section.links.map((link) => link.id),
  );
}

describe("index pages: data", () => {
  it("every link points at a screen whose resolved path equals the link url", () => {
    for (const link of ALL_INDEX_LINKS) {
      const screen = getScreen(link.id);
      expect(screen, link.id).toBeDefined();
      expect(resolveScreenPath(screen!), link.id).toBe(link.url);
    }
  });

  it("covers every catalog and configuration leaf that used to be in the sidebar", () => {
    const ids = new Set(ALL_INDEX_LINKS.map((link) => link.id));
    for (const id of [
      "catalogs-divisions", "catalogs-countries", "catalogs-unions", "catalogs-local-fields",
      "catalogs-districts", "catalogs-churches", "catalogs-club-ideals", "catalogs-club-types",
      "catalogs-classes", "catalogs-class-modules", "catalogs-class-sections",
      "catalogs-certifications", "catalogs-activity-types", "catalogs-ecclesiastical-years",
      "catalogs-allergies", "catalogs-diseases", "catalogs-medicines", "catalogs-relationship-types",
      "catalogs-finance-categories", "catalogs-inventory-categories", "catalogs-honor-categories",
      "catalogs-honors", "catalogs-master-honors", "catalogs-camporee-event-types",
      "admin-local-field-payment-methods", "admin-local-field-delivery",
      "admin-campamentos-config-local", "admin-campamentos-config-union",
      "admin-settings-scoring-categories", "admin-system-variables", "admin-system-jobs",
      "admin-system-jobs-history", "admin-system-achievements", "admin-system-audit",
      "admin-system-roles", "admin-system-permissions", "admin-system-matrix",
      "investiture-settings", "investiture-pastors", "clubs-evidence-folders-templates",
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("no index link (except the notifications hub) is also a sidebar leaf", () => {
    const sidebarIds = new Set<string>();
    for (const group of sidebarItems) {
      for (const item of group.items) {
        sidebarIds.add(item.id);
        for (const sub of "subItems" in item ? (item.subItems ?? []) : []) sidebarIds.add(sub.id);
      }
    }
    const dup = ALL_INDEX_LINKS.filter((link) => sidebarIds.has(link.id)).map((link) => link.id);
    expect(dup).toEqual(["notifications-hub"]);
  });
});

describe("catalogs index gating", () => {
  it("opens for super-admin and shows every catalog", () => {
    const root = user(["super-admin"]);
    expect(canAccessDashboardPath(root, CATALOGS_INDEX_PATH)).toBe(true);
    expect(visibleLinkIds(CATALOG_SECTIONS, root)).toHaveLength(
      CATALOGS_INDEX_SECTIONS.flatMap((s) => s.links).length,
    );
  });

  it("opens for admin with catalog permissions and lists only the permitted ones", () => {
    const admin = user(["admin"], ["countries:read"]);
    expect(canAccessDashboardPath(admin, CATALOGS_INDEX_PATH)).toBe(true);
    expect(visibleLinkIds(CATALOG_SECTIONS, admin)).toEqual(["catalogs-divisions", "catalogs-countries"]);
  });

  it("opens for certifications:configure and shows only the certifications catalog", () => {
    const lf = user(["director-lf"], ["certifications:configure"]);
    expect(canAccessDashboardPath(lf, CATALOGS_INDEX_PATH)).toBe(true);
    expect(visibleLinkIds(CATALOG_SECTIONS, lf)).toEqual(["catalogs-certifications"]);
  });

  it("is forbidden when the user can reach no catalog (catalogs:read alone is not editor access)", () => {
    const lf = user(["director-lf"], ["catalogs:read", "countries:read", "users:read"]);
    expect(canAccessDashboardPath(lf, CATALOGS_INDEX_PATH)).toBe(false);
    expect(canViewScreen(lf, "admin-catalogs")).toBe(false);
    expect(visibleLinkIds(CATALOG_SECTIONS, lf)).toEqual([]);
  });

  it("does not open unmapped children of the hub (stays fail-closed)", () => {
    const lf = user(["director-lf"], ["certifications:configure"]);
    expect(canAccessDashboardPath(lf, "/dashboard/catalogs/not-a-real-catalog")).toBe(false);
    expect(resolvePathEntry("/dashboard/catalogs/not-a-real-catalog")).toBeUndefined();
  });

  it("keeps per-catalog gates behind the index", () => {
    const lf = user(["director-lf"], ["certifications:configure"]);
    expect(canAccessDashboardPath(lf, "/dashboard/catalogs/countries")).toBe(false);
    expect(canAccessDashboardPath(lf, "/dashboard/catalogs/certifications")).toBe(true);
  });

  it("is forbidden for a pastor-only user", () => {
    const pastor = user(["pastor"], ["dashboard:read"]);
    expect(canAccessDashboardPath(pastor, CATALOGS_INDEX_PATH)).toBe(false);
  });
});

describe("configuration index links", () => {
  it("opens with one reachable link and lists only reachable ones", () => {
    const u = user([], ["roles:read"]);
    expect(canAccessDashboardPath(u, CONFIGURATION_INDEX_PATH)).toBe(true);
    expect(visibleLinkIds(CONFIG_SECTIONS, u)).toEqual(["admin-system-roles"]);
  });

  it("is forbidden without any reachable link", () => {
    const u = user([], ["users:read"]);
    expect(canAccessDashboardPath(u, CONFIGURATION_INDEX_PATH)).toBe(false);
    expect(visibleLinkIds(CONFIG_SECTIONS, u)).toEqual([]);
  });

  it("a field director reaches the investiture window through the index (capability gate)", () => {
    const u = user(["director-lf"], []);
    expect(visibleLinkIds(CONFIG_SECTIONS, u)).toContain("investiture-settings");
  });

  it("super-admin sees every link, including the setup screens moved out of the sidebar", () => {
    const ids = visibleLinkIds(CONFIG_SECTIONS, user(["super-admin"]));
    for (const id of ["investiture-settings", "investiture-pastors", "clubs-evidence-folders-templates"]) {
      expect(ids).toContain(id);
    }
    expect(ids).toHaveLength(CONFIGURATION_INDEX_SECTIONS.flatMap((s) => s.links).length);
  });

  it("gates each link with the same rule as its page", () => {
    for (const link of CONFIGURATION_INDEX_SECTIONS.flatMap((s) => s.links)) {
      for (const u of [user(["admin"], ["roles:read", "permissions:read"]), user(["director-lf"], [])]) {
        expect(canAccessDashboardPath(u, link.url), link.id).toBe(canViewScreen(u, link.id));
      }
    }
  });
});

const CATALOG_SECTIONS = CATALOGS_INDEX_SECTIONS;
const CONFIG_SECTIONS = CONFIGURATION_INDEX_SECTIONS;
