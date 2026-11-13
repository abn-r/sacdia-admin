import {
  EMERGENCY_CONTACTS_READ,
  EMERGENCY_CONTACTS_UPDATE,
  HEALTH_READ,
  HEALTH_UPDATE,
  GUARDIANSHIP_READ,
  GUARDIANSHIP_UPDATE,
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
import { capabilityAccess } from "./_helpers";

/**
 * `/dashboard/users` — mirrors `AdminUsersController`.
 *
 * Reads, create and bulk create: `@GlobalRoles(...USER_MANAGEMENT_ROLES)` at
 * method level → `users.manage_in_scope`. Administrative writes keep the
 * class-level admin fence → `users.update_admin_fields`.
 * Family gates copy the transitional OR the API accepts today
 * (`<family>:read` OR `users:read_detail`, `<family>:update` OR
 * `users:update_profile`) — drop the `users:*` half when backend sunsets it.
 */
export const usersScreen: ScreenDefinition = {
  id: "users",
  path: "/dashboard/users",
  titleKey: "users",
  surfaces: ["admin"],
  viewAny: capabilityAccess("users.manage_in_scope", [USERS_READ]),
  capabilities: [
    {
      id: "view_detail",
      kind: "route",
      gate: capabilityAccess("users.manage_in_scope", [USERS_READ_DETAIL]),
    },
    {
      id: "create",
      kind: "route",
      href: "/dashboard/users/new",
      gate: capabilityAccess("users.manage_in_scope", [USERS_CREATE]),
    },
    {
      id: "bulk_create",
      kind: "route",
      href: "/dashboard/users/bulk-upload",
      gate: capabilityAccess("users.manage_in_scope", [USERS_BULK_CREATE]),
    },
    {
      id: "update_profile",
      kind: "section",
      gate: { permissions: [USERS_UPDATE_PROFILE] },
    },
    {
      // Accesos: Roles switches, Resumen grid, aside rows + PATCH /admin/users/:userId.
      id: "update_admin",
      kind: "section",
      gate: capabilityAccess("users.update_admin_fields", [USERS_UPDATE_ADMIN]),
    },
    {
      // POST/DELETE /admin/rbac/users/:userId/roles for platform admin roles
      // (backend RBAC_ROLE_SUPER_ADMIN_ONLY).
      id: "roles.mutate_global",
      kind: "section",
      gate: capabilityAccess("rbac.mutate_global_roles"),
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
      id: "guardianship.read",
      kind: "section",
      gate: { permissions: [GUARDIANSHIP_READ, USERS_READ_DETAIL] },
    },
    {
      id: "guardianship.update",
      kind: "section",
      gate: {
        permissions: [GUARDIANSHIP_UPDATE, USERS_UPDATE_PROFILE],
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
