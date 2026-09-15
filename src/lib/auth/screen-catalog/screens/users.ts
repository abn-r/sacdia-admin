import {
  EMERGENCY_CONTACTS_READ,
  EMERGENCY_CONTACTS_UPDATE,
  HEALTH_READ,
  HEALTH_UPDATE,
  LEGAL_REPRESENTATIVE_READ,
  LEGAL_REPRESENTATIVE_UPDATE,
  POST_REGISTRATION_READ,
  REGISTRATION_COMPLETE,
  USERS_BULK_CREATE,
  USERS_CREATE,
  USERS_READ,
  USERS_READ_DETAIL,
  USERS_UPDATE_ADMIN,
  USERS_UPDATE_PROFILE,
} from "@/lib/auth/permissions";

import type { ScreenDefinition } from "../types";
import { ADMIN_ROLES, USER_MANAGEMENT_ROLES } from "./_helpers";

/**
 * `/dashboard/users` — mirrors `AdminUsersController`.
 *
 * Reads, create and bulk create: `@GlobalRoles(...USER_MANAGEMENT_ROLES)` at
 * method level. Administrative writes keep the class-level admin fence.
 * Family gates copy the transitional OR the API accepts today
 * (`<family>:read` OR `users:read_detail`, `<family>:update` OR
 * `users:update_profile`) — drop the `users:*` half when backend sunsets it.
 */
export const usersScreen: ScreenDefinition = {
  id: "users",
  path: "/dashboard/users",
  titleKey: "users",
  surfaces: ["admin"],
  viewAny: { permissions: [USERS_READ], roles: [...USER_MANAGEMENT_ROLES] },
  capabilities: [
    {
      id: "view_detail",
      kind: "route",
      gate: {
        permissions: [USERS_READ_DETAIL],
        roles: [...USER_MANAGEMENT_ROLES],
      },
    },
    {
      id: "create",
      kind: "route",
      href: "/dashboard/users/new",
      gate: { permissions: [USERS_CREATE], roles: [...USER_MANAGEMENT_ROLES] },
    },
    {
      id: "bulk_create",
      kind: "route",
      href: "/dashboard/users/bulk-upload",
      gate: {
        permissions: [USERS_BULK_CREATE],
        roles: [...USER_MANAGEMENT_ROLES],
      },
    },
    {
      id: "update_profile",
      kind: "section",
      gate: { permissions: [USERS_UPDATE_PROFILE] },
    },
    {
      id: "update_admin",
      kind: "section",
      gate: { permissions: [USERS_UPDATE_ADMIN], roles: [...ADMIN_ROLES] },
    },
    {
      id: "health.read",
      kind: "section",
      gate: { permissions: [HEALTH_READ, USERS_READ_DETAIL] },
    },
    {
      id: "health.update",
      kind: "section",
      gate: { permissions: [HEALTH_UPDATE, USERS_UPDATE_PROFILE] },
    },
    {
      id: "emergency_contacts.read",
      kind: "section",
      gate: { permissions: [EMERGENCY_CONTACTS_READ, USERS_READ_DETAIL] },
    },
    {
      id: "emergency_contacts.update",
      kind: "section",
      gate: { permissions: [EMERGENCY_CONTACTS_UPDATE, USERS_UPDATE_PROFILE] },
    },
    {
      id: "legal_representative.read",
      kind: "section",
      gate: { permissions: [LEGAL_REPRESENTATIVE_READ, USERS_READ_DETAIL] },
    },
    {
      id: "legal_representative.update",
      kind: "section",
      gate: {
        permissions: [LEGAL_REPRESENTATIVE_UPDATE, USERS_UPDATE_PROFILE],
      },
    },
    {
      id: "post_registration.read",
      kind: "section",
      gate: { permissions: [POST_REGISTRATION_READ, USERS_READ_DETAIL] },
    },
    {
      id: "registration.complete",
      kind: "button",
      gate: { permissions: [REGISTRATION_COMPLETE, USERS_UPDATE_PROFILE] },
    },
  ],
};
