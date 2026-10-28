import type { NavTranslator } from "@/lib/auth/screen-catalog/screen-title";
import type { NavGroup, NavMainItem, NavSubItem } from "./sidebar-items";

/**
 * Sidebar titles are localised from `nav.*` messages. Static titles in
 * `sidebar-items.ts` stay as the Spanish fallback and are never used as keys:
 * permission filtering works on ids/urls only.
 *
 * Resolution for an item id:
 *  1. `NAV_ITEM_KEY_BY_SIDEBAR_ID` -> `nav.items.<key>` (reuses breadcrumb/matrix copy
 *     when the Spanish text is identical to the sidebar title).
 *  2. Otherwise `nav.sidebar.<id with "-" replaced by "_">`.
 */
export const NAV_ITEM_KEY_BY_SIDEBAR_ID: Readonly<Record<string, string>> = {
  "users": "users",
  "clubs": "clubs",
  "coordination": "coordination",
  "requests": "requests",
  "requests-assignments": "requests_assignments",
  "insurance": "insurance",
  "insurance-by-section": "insurance_by_section",
  "insurance-expiring": "insurance_expiring",
  "insurance-config": "insurance_config",
  "payment-orders": "payment_orders",
  "investiture-pastors": "investiture_pastors",
  "honor-instructor-proposals": "honor_instructor_proposals",
  "institutional-certificate-requests": "institutional_certificate_requests",
  "clubs-evidence-folders-templates": "annual_folders_templates",
  "certifications-reviews": "certifications_reviews",
  "year-end": "year_end",
  "annual-folders-templates": "annual_folders_templates",
  "member-of-month": "member_of_month",
  "reports": "reports",
  "campamentos-plantillas": "campamentos_plantillas",
  "campamentos-judges": "campamentos_judges",
  "campamentos-pedidos-catalogo": "campamentos_pedidos_catalogo",
  "campamentos-pedidos-bandeja": "campamentos_pedidos_bandeja",
  "activities": "activities",
  "materials-inventory": "materials_inventory",
  "materials-categories": "materials_categories",
  "materials-receipts": "materials_receipts",
  "resources": "resources",
  "resources-categories": "resources_categories",
  "notifications": "notifications",
  "notifications-categories": "notifications_categories",
  "catalogs-divisions": "geography_divisions",
  "catalogs-countries": "geography_countries",
  "catalogs-unions": "geography_unions",
  "catalogs-local-fields": "geography_local_fields",
  "catalogs-districts": "geography_districts",
  "catalogs-churches": "geography_churches",
  "catalogs-club-types": "club_types",
  "catalogs-classes": "catalog_classes",
  "catalogs-class-modules": "catalog_class_modules",
  "catalogs-class-sections": "catalog_class_sections",
  "catalogs-certifications": "catalogs_certifications",
  "catalogs-activity-types": "activity_types",
  "catalogs-ecclesiastical-years": "ecclesiastical_years",
  "catalogs-allergies": "allergies",
  "catalogs-diseases": "diseases",
  "catalogs-medicines": "medicines",
  "catalogs-relationship-types": "relationship_types",
  "catalogs-master-honors": "catalog_master_honors",
  "catalogs-camporee-event-types": "catalogs_camporee_event_types",
  "admin-local-field-delivery": "admin_local_field_delivery",
  "admin-campamentos-config-local": "admin_campamentos_config_local",
  "admin-campamentos-config-union": "admin_campamentos_config_union",
  "admin-system-jobs": "jobs_queues",
  "admin-system-jobs-history": "admin_system_jobs_history",
  "admin-system-achievements": "achievements",
  "admin-system-audit": "audit_logs",
  "admin-system-roles": "rbac_roles",
  "admin-system-permissions": "rbac_permissions",
};

/** Group id -> `nav.sections` key. */
export const NAV_SECTION_KEY_BY_GROUP_ID: Readonly<Record<number, string>> = {
  1: "clubs",
  2: "operations",
  3: "validation",
  4: "rankings_analytics",
  5: "campamentos",
  6: "materials",
  7: "communications",
  8: "administration",
};

/** Message key relative to the `nav` namespace for a sidebar item id. */
export function sidebarItemMessageKey(id: string): string {
  const reused = NAV_ITEM_KEY_BY_SIDEBAR_ID[id];
  return reused ? `items.${reused}` : `sidebar.${id.replace(/-/g, "_")}`;
}

/** Message key relative to the `nav` namespace for a sidebar group label. */
export function sidebarGroupMessageKey(groupId: number): string | null {
  const key = NAV_SECTION_KEY_BY_GROUP_ID[groupId];
  return key ? `sections.${key}` : null;
}

function localizeSubItem(sub: NavSubItem, t: NavTranslator): NavSubItem {
  const key = sidebarItemMessageKey(sub.id);
  return {
    ...sub,
    title: t.has(key) ? t(key) : sub.title,
    ...(sub.subItems
      ? { subItems: sub.subItems.map((child) => localizeSubItem(child, t)) }
      : {}),
  };
}

function localizeMainItem(item: NavMainItem, t: NavTranslator): NavMainItem {
  const key = sidebarItemMessageKey(item.id);
  const title = t.has(key) ? t(key) : item.title;
  if ("subItems" in item && item.subItems) {
    return {
      ...item,
      title,
      subItems: item.subItems.map((sub) => localizeSubItem(sub, t)),
    };
  }
  return { ...item, title };
}

/** Returns a copy of the (already filtered) sidebar with localised titles/labels. */
export function localizeSidebarItems(groups: NavGroup[], t: NavTranslator): NavGroup[] {
  return groups.map((group) => {
    const labelKey = sidebarGroupMessageKey(group.id);
    const label = labelKey && t.has(labelKey) ? t(labelKey) : group.label;
    return {
      ...group,
      ...(label !== undefined ? { label } : {}),
      items: group.items.map((item) => localizeMainItem(item, t)),
    };
  });
}
