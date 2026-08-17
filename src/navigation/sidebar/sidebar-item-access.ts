import {
  ACHIEVEMENTS_READ,
  ACTIVITIES_READ,
  ACTIVITY_TYPES_READ,
  ALLERGIES_READ,
  AWARD_CATEGORIES_READ,
  CAMPOREE_EVENTS_READ,
  CAMPOREE_EVENT_TYPES_READ,
  CAMPOREES_READ,
  CAMPOREES_UPDATE,
  CHURCHES_READ,
  CLASSES_MANAGE,
  CLASSES_READ,
  CLASS_MODULES_MANAGE,
  CLASS_SECTIONS_MANAGE,
  CLUB_IDEALS_READ,
  CLUB_TYPES_READ,
  CLUBS_READ,
  COORDINATION_MANAGE,
  CATALOGS_READ,
  COUNTRIES_READ,
  DISEASES_READ,
  DISTRICTS_READ,
  ECCLESIASTICAL_YEARS_READ,
  FINANCE_CATEGORIES_MANAGE,
  FINANCES_READ,
  HONOR_CATEGORIES_READ,
  HONORS_READ,
  INVENTORY_CATEGORIES_MANAGE,
  INVENTORY_READ,
  LOCAL_FIELDS_READ,
  MATERIALS_CONFIGURE,
  MATERIALS_MANAGE_INVENTORY,
  MATERIALS_READ,
  MEDICINES_READ,
  MEMBER_RANKING_WEIGHTS_READ,
  MOM_READ,
  MOM_SUPERVISE,
  NOTIFICATIONS_BROADCAST,
  NOTIFICATIONS_CLUB,
  NOTIFICATIONS_SEND,
  PERMISSIONS_READ,
  RANKING_WEIGHTS_READ,
  RANKINGS_READ,
  RELATIONSHIP_TYPES_READ,
  REPORTS_READ,
  REQUESTS_READ,
  RESOURCE_CATEGORIES_READ,
  RESOURCES_READ,
  ROLES_READ,
  SCORING_CATEGORIES_MANAGE,
  SCORING_CATEGORIES_READ,
  SECTION_RANKINGS_READ_CLUB,
  SECTION_RANKINGS_READ_GLOBAL,
  SECTION_RANKINGS_READ_LF,
  UNIONS_READ,
  USERS_READ,
  USER_CERTIFICATIONS_READ,
  CERTIFICATIONS_REVIEW,
  VALIDATION_READ,
} from "@/lib/auth/permissions";

import type { NavAccess } from "./nav-access";

/**
 * Permission gates for sidebar leaf items (keyed by nav item id).
 * Container-only parents inherit visibility from filtered children.
 */
export const NAV_ITEM_ACCESS: Record<string, NavAccess> = {
  home: { permissions: ["dashboard:read"] },

  users: { permissions: [USERS_READ] },
  clubs: { permissions: [CLUBS_READ] },
  coordination: { permissions: [COORDINATION_MANAGE] },

  enrollments: {
    permissions: ["investiture:read", "investiture:validate", CLASSES_READ],
  },
  "certifications-list": { permissions: [USER_CERTIFICATIONS_READ] },
  "certifications-reviews": { permissions: [CERTIFICATIONS_REVIEW] },
  finances: { permissions: [FINANCES_READ] },
  "club-inventory": { permissions: [INVENTORY_READ] },
  "insurance-by-section": { permissions: ["insurance:read"] },
  "insurance-expiring": { permissions: ["insurance:read"] },
  "insurance-config": {
    permissions: ["insurance:configure", "field-payment-orders:configure"],
  },
  "payment-orders": { permissions: ["field-payment-orders:review"] },

  "validations-investitures": {
    permissions: [VALIDATION_READ, "investiture:read"],
  },
  "certificate-bulk-imports": {
    permissions: [VALIDATION_READ, "investiture:read"],
  },
  "investiture-pending": { permissions: ["investiture:read", "investiture:validate"] },
  "investiture-pipeline": { permissions: ["investiture:read", "investiture:validate"] },
  "investiture-config": { permissions: ["investiture:read", "investiture:validate"] },
  "year-end": { permissions: [ECCLESIASTICAL_YEARS_READ, PERMISSIONS_READ] },
  "clubs-evidence-folders-templates": {
    permissions: ["evidence_folders:read"],
  },
  "clubs-evidence-folders-list": {
    permissions: ["evidence_folders:read"],
  },

  "annual-folders-evaluate": {
    permissions: ["annual_folders:evaluate"],
  },
  "annual-folders-rankings": { permissions: [RANKINGS_READ] },
  "annual-folders-templates": {
    permissions: ["annual_folder_templates:read"],
  },
  "annual-folders-ranking-config": {
    permissions: [RANKING_WEIGHTS_READ, MEMBER_RANKING_WEIGHTS_READ],
  },
  "annual-folders-categories": {
    permissions: [AWARD_CATEGORIES_READ],
  },

  "ranking-weights": {
    permissions: [RANKING_WEIGHTS_READ, MEMBER_RANKING_WEIGHTS_READ],
  },
  "section-rankings": {
    permissions: [
      SECTION_RANKINGS_READ_CLUB,
      SECTION_RANKINGS_READ_LF,
      SECTION_RANKINGS_READ_GLOBAL,
    ],
  },
  "member-of-month": {
    permissions: [MOM_READ, MOM_SUPERVISE],
  },

  "requests-transfers": { permissions: [REQUESTS_READ, "requests:review"] },
  "requests-assignments": { permissions: [REQUESTS_READ, "requests:review"] },
  "requests-membership": {
    permissions: [REQUESTS_READ, "club_members:approve"],
  },
  "reports-list": { permissions: [REPORTS_READ] },
  "reports-supervision": { permissions: [REPORTS_READ, "reports:supervise"] },

  "campamentos-list-local": { permissions: [CAMPOREES_READ] },
  "campamentos-list-union": { permissions: [CAMPOREES_READ] },
  "campamentos-plantillas": {
    permissions: [CAMPOREE_EVENTS_READ, CAMPOREES_READ],
  },
  "campamentos-judges": {
    permissions: [CAMPOREES_READ, SCORING_CATEGORIES_READ],
  },
  activities: { permissions: [ACTIVITIES_READ] },

  "materials-inbox": { permissions: [MATERIALS_READ] },
  "materials-inventory": { permissions: [MATERIALS_MANAGE_INVENTORY] },
  "materials-categories": { permissions: [MATERIALS_MANAGE_INVENTORY, MATERIALS_READ] },
  "materials-receipts": { permissions: [MATERIALS_READ] },

  "resources-list": { permissions: [RESOURCES_READ] },
  "resources-categories": { permissions: [RESOURCE_CATEGORIES_READ, RESOURCES_READ] },

  "notifications-hub": {
    permissions: [
      NOTIFICATIONS_SEND,
      NOTIFICATIONS_BROADCAST,
      NOTIFICATIONS_CLUB,
    ],
  },
  "notifications-history": {
    permissions: [
      NOTIFICATIONS_SEND,
      NOTIFICATIONS_BROADCAST,
      NOTIFICATIONS_CLUB,
      "notifications:read_history",
    ],
  },
  "notifications-categories": {
    permissions: [NOTIFICATIONS_SEND, NOTIFICATIONS_BROADCAST],
  },

  "catalogs-divisions": { permissions: [UNIONS_READ, COUNTRIES_READ] },
  "catalogs-countries": { permissions: [COUNTRIES_READ] },
  "catalogs-unions": { permissions: [UNIONS_READ] },
  "catalogs-local-fields": { permissions: [LOCAL_FIELDS_READ] },
  "catalogs-districts": { permissions: [DISTRICTS_READ] },
  "catalogs-churches": { permissions: [CHURCHES_READ] },

  "catalogs-club-ideals": { permissions: [CLUB_IDEALS_READ] },
  "catalogs-club-types": { permissions: [CLUB_TYPES_READ] },
  "catalogs-classes": { permissions: [CLASSES_READ, CLASSES_MANAGE] },
  "catalogs-class-modules": { permissions: [CLASS_MODULES_MANAGE] },
  "catalogs-class-sections": { permissions: [CLASS_SECTIONS_MANAGE] },
  "catalogs-certifications": {
    permissions: [CATALOGS_READ, USER_CERTIFICATIONS_READ],
  },
  "catalogs-activity-types": {
    permissions: [ACTIVITY_TYPES_READ, CATALOGS_READ],
  },
  "catalogs-ecclesiastical-years": {
    permissions: [ECCLESIASTICAL_YEARS_READ, CATALOGS_READ],
  },
  "catalogs-allergies": { permissions: [ALLERGIES_READ, CATALOGS_READ] },
  "catalogs-diseases": { permissions: [DISEASES_READ, CATALOGS_READ] },
  "catalogs-medicines": { permissions: [MEDICINES_READ, CATALOGS_READ] },
  "catalogs-relationship-types": {
    permissions: [RELATIONSHIP_TYPES_READ, CATALOGS_READ],
  },
  "catalogs-finance-categories": {
    permissions: [FINANCE_CATEGORIES_MANAGE, CATALOGS_READ],
  },
  "catalogs-inventory-categories": {
    permissions: [INVENTORY_CATEGORIES_MANAGE, CATALOGS_READ],
  },

  "catalogs-honor-categories": { permissions: [HONOR_CATEGORIES_READ] },
  "catalogs-honors": { permissions: [HONORS_READ] },

  "catalogs-camporee-event-types": {
    permissions: [CAMPOREE_EVENT_TYPES_READ],
  },

  "admin-local-field-payment-methods": {
    permissions: [MATERIALS_CONFIGURE],
  },
  "admin-local-field-delivery": {
    permissions: [MATERIALS_CONFIGURE],
  },

  "admin-campamentos-config-local": {
    permissions: [CAMPOREES_UPDATE, SCORING_CATEGORIES_MANAGE],
  },
  "admin-campamentos-config-union": {
    permissions: [CAMPOREES_UPDATE, SCORING_CATEGORIES_MANAGE],
  },

  "admin-settings-scoring-categories": {
    permissions: [SCORING_CATEGORIES_READ, SCORING_CATEGORIES_MANAGE],
  },

  "admin-system-variables": { permissions: [ECCLESIASTICAL_YEARS_READ] },
  "admin-system-jobs": { permissions: [PERMISSIONS_READ] },
  "admin-system-jobs-history": { permissions: [PERMISSIONS_READ] },
  "admin-system-achievements": { permissions: [ACHIEVEMENTS_READ] },
  "admin-system-roles": { permissions: [ROLES_READ] },
  "admin-system-permissions": { permissions: [PERMISSIONS_READ] },
  "admin-system-matrix": {
    permissions: [ROLES_READ, PERMISSIONS_READ],
  },
};

export function getNavItemAccess(
  item: { id: string; access?: NavAccess },
): NavAccess | undefined {
  return item.access ?? NAV_ITEM_ACCESS[item.id];
}
