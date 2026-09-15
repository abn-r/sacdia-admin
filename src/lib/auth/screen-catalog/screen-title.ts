import {
  getScreenFallbackTitle,
  OTHER_SCREEN_GROUP_ID,
  type ScreenKeyGroup,
} from "./index";
import type { ScreenDefinition } from "./types";

export type NavTranslator = {
  (key: string): string;
  has: (key: string) => boolean;
};

/**
 * Screen id → `nav.items` key when the snake_case of the id is not the key.
 * Ids whose snake_case already exists in `nav.items` need no entry here.
 */
export const NAV_KEY_BY_SCREEN_ID: Readonly<Record<string, string>> = {
  home: "dashboard",
  "club-inventory": "inventory",
  "validations-investitures": "validation",
  "clubs-evidence-folders-list": "evidence_folders",
  "certifications-list": "certifications",
  "reports-list": "reports",
  "campamentos-list-local": "camporees_local",
  "campamentos-list-union": "camporees_union",
  "resources-list": "resources_all",
  "notifications-hub": "notifications_send",
  "catalogs-divisions": "geography_divisions",
  "catalogs-countries": "geography_countries",
  "catalogs-unions": "geography_unions",
  "catalogs-local-fields": "geography_local_fields",
  "catalogs-districts": "geography_districts",
  "catalogs-churches": "geography_churches",
  "catalogs-club-ideals": "club_ideals",
  "catalogs-club-types": "club_types",
  "catalogs-classes": "catalog_classes",
  "catalogs-class-modules": "catalog_class_modules",
  "catalogs-class-sections": "catalog_class_sections",
  "catalogs-activity-types": "activity_types",
  "catalogs-ecclesiastical-years": "ecclesiastical_years",
  "catalogs-allergies": "allergies",
  "catalogs-diseases": "diseases",
  "catalogs-medicines": "medicines",
  "catalogs-relationship-types": "relationship_types",
  "catalogs-finance-categories": "catalog_finance_categories",
  "catalogs-inventory-categories": "catalog_inventory_categories",
  "catalogs-honor-categories": "honor_categories",
  "catalogs-honors": "catalog_honors",
  "catalogs-master-honors": "catalog_master_honors",
  "admin-local-field-payment-methods": "materials_config",
  "admin-settings-scoring-categories": "settings_scoring",
  "admin-system-variables": "settings_system",
  "admin-system-jobs": "jobs_queues",
  "admin-system-achievements": "achievements",
  "admin-system-audit": "audit_logs",
  "admin-system-roles": "rbac_roles",
  "admin-system-permissions": "rbac_permissions",
  "admin-system-matrix": "rbac",
};

/** `nav.items` key candidates for a screen, most specific first. */
export function navKeyCandidates(screen: ScreenDefinition): string[] {
  const out: string[] = [];
  if (screen.titleKey) out.push(screen.titleKey);
  const alias = NAV_KEY_BY_SCREEN_ID[screen.id];
  if (alias) out.push(alias);
  out.push(screen.id.replace(/-/g, "_"));
  return out;
}

/** Localised screen title; falls back to the sidebar title. */
export function getScreenTitle(tNav: NavTranslator, screen: ScreenDefinition): string {
  for (const key of navKeyCandidates(screen)) {
    if (tNav.has(key)) {
      return tNav(key);
    }
  }
  return getScreenFallbackTitle(screen);
}

/** Title for a matrix / picker group. */
export function getScreenGroupTitle<T>(
  tNav: NavTranslator,
  group: ScreenKeyGroup<T>,
  otherLabel: string,
): string {
  if (group.screenId === OTHER_SCREEN_GROUP_ID || !group.screen) {
    return otherLabel;
  }
  return getScreenTitle(tNav, group.screen);
}
