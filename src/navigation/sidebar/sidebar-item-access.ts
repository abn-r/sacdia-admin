import {
  ACHIEVEMENTS_READ,
  ACTIVITIES_READ,
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
  COUNTRIES_READ,
  DISTRICTS_READ,
  ECCLESIASTICAL_YEARS_READ,
  HONOR_CATEGORIES_READ,
  HONORS_READ,
  LOCAL_FIELDS_READ,
  MATERIALS_CONFIGURE,
  MATERIALS_MANAGE_INVENTORY,
  MATERIALS_READ,
  MEMBER_RANKING_WEIGHTS_READ,
  NOTIFICATIONS_BROADCAST,
  NOTIFICATIONS_CLUB,
  NOTIFICATIONS_SEND,
  PERMISSIONS_READ,
  RANKING_WEIGHTS_READ,
  RANKINGS_READ,
  ROLES_READ,
  SCORING_CATEGORIES_MANAGE,
  SCORING_CATEGORIES_READ,
  UNIONS_READ,
  USERS_READ,
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
  "clubs-list": { permissions: [CLUBS_READ] },

  "validations-investitures": {
    permissions: [VALIDATION_READ, "investiture:read"],
  },
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

  "admin-system-variables": { permissions: [ECCLESIASTICAL_YEARS_READ] },
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
