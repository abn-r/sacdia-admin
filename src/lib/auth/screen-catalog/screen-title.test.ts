import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { getScreen, SCREEN_CATALOG } from "./index";
import {
  getScreenTitle,
  NAV_KEY_BY_SCREEN_ID,
  navKeyCandidates,
} from "./screen-title";

const navItems: Record<string, string> = JSON.parse(
  readFileSync(resolve(process.cwd(), "messages/es.json"), "utf8"),
).nav.items;

const tNav = Object.assign((key: string) => navItems[key] ?? key, {
  has: (key: string) => key in navItems,
});

describe("screen titles", () => {
  it("only aliases real nav.items keys and real screen ids", () => {
    for (const [screenId, navKey] of Object.entries(NAV_KEY_BY_SCREEN_ID)) {
      expect(getScreen(screenId), screenId).toBeDefined();
      expect(navKey in navItems, `${screenId} → ${navKey}`).toBe(true);
    }
  });

  it("localises the users screen through nav.items.users", () => {
    expect(getScreenTitle(tNav, getScreen("users")!)).toBe(navItems.users);
  });

  it("falls back to the sidebar title when no nav key matches", () => {
    const withoutNavKey = SCREEN_CATALOG.filter(
      (screen) => !navKeyCandidates(screen).some((key) => key in navItems),
    );
    for (const screen of withoutNavKey) {
      expect(getScreenTitle(tNav, screen).length, screen.id).toBeGreaterThan(0);
    }
    // Keep the fallback list from silently growing: add a nav key or an alias.
    expect(withoutNavKey.map((screen) => screen.id).sort()).toEqual(
      [
        "insurance-config",
        "payment-orders",
        "clubs-evidence-folders-templates",
        "certifications-reviews",
        "campamentos-plantillas",
        "campamentos-judges",
        "campamentos-pedidos-catalogo",
        "campamentos-pedidos-bandeja",
        "notifications-categories",
        "catalogs-certifications",
        "catalogs-camporee-event-types",
        "admin-local-field-delivery",
        "admin-campamentos-config-local",
        "admin-campamentos-config-union",
        "admin-system-jobs-history",
      ].sort(),
    );
  });
});
