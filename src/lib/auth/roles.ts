import type { GlobalRoleName } from "./generated/role-names";
import type { AuthUser } from "@/lib/auth/types";

/**
 * Canonical name of the super-admin role.
 * Backend PR #77 standardized all role names to hyphen form in the DB.
 * Use this constant everywhere instead of a raw string literal.
 *
 * Phase 7 (authz capabilities): role names are data (labels, grant rows,
 * protected rows in the RBAC tables). Authorization decisions read
 * `authorization.capabilities` from `/auth/me` instead — see
 * `extractCapabilities` / `hasCapability` in `permission-utils.ts`.
 */
export const SUPER_ADMIN_ROLE = "super-admin" as const satisfies GlobalRoleName;

/**
 * Platform administration roles. A user holding one of these can only be
 * granted or revoked by an actor with `rbac.mutate_global_roles`
 * (backend `RBAC_ROLE_SUPER_ADMIN_ONLY`). Data about role rows, not a gate.
 */
export const PLATFORM_ADMIN_ROLES = [
  SUPER_ADMIN_ROLE,
  "admin",
  "assistant-admin",
] as const satisfies readonly GlobalRoleName[];

/**
 * Display order (highest to lowest) of the global roles an actor may assign
 * when creating a user. The actual set comes from
 * `authorization.assignable_global_roles`; this only orders it.
 */
export const ASSIGNABLE_GLOBAL_ROLE_ORDER = [
  "admin",
  "director-dia",
  "assistant-dia",
  "director-union",
  "assistant-union",
  "director-lf",
  "assistant-lf",
  "general-coordinator",
  "zone-coordinator",
  "coordinator",
  "pastor",
  "user",
] as const satisfies readonly GlobalRoleName[];

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Defensive normalizer: lowercase + trim only. */
function normalizeRole(role: unknown): string | null {
  if (typeof role !== "string") {
    return null;
  }

  const normalized = role.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function unwrapResponse(user: AuthUser): AuthUser {
  const status = user["status"];
  const data = user["data"];

  if (
    typeof status === "string" &&
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    return data as AuthUser;
  }

  return user;
}

function addRole(set: Set<string>, value: unknown) {
  const normalized = normalizeRole(value);
  if (normalized) {
    set.add(normalized);
  }
}

function addRolesFromGrant(set: Set<string>, grant: unknown) {
  if (!isRecord(grant)) {
    return;
  }
  addRole(set, grant.role_name);
  addRole(set, grant.role);
  addRole(set, grant.name);
  addRole(set, grant.key);
}

function activeAssignmentId(authorization: UnknownRecord): string | null {
  const active = authorization.active_assignment;
  if (!isRecord(active) || typeof active.assignment_id !== "string") {
    return null;
  }
  const id = active.assignment_id.trim();
  return id.length > 0 ? id : null;
}

/**
 * Roles the actor holds right now, as the backend guards see them:
 * `authorization.grants.global_roles[]` plus the club role of the ACTIVE
 * assignment (`authorization.active_assignment`). Other club assignments are
 * not aggregated: the guards only honour the active one, so a role from a
 * dormant club would light up verbs that answer 403.
 */
export function extractRoles(user: AuthUser | null | undefined): string[] {
  if (!user) {
    return [];
  }

  const resolved = unwrapResponse(user);
  const roles = new Set<string>();
  const authorization = resolved.authorization;
  if (!isRecord(authorization)) {
    return [];
  }

  const grants = authorization.grants;
  if (isRecord(grants) && Array.isArray(grants.global_roles)) {
    for (const grant of grants.global_roles) {
      addRolesFromGrant(roles, grant);
    }
  }

  const activeId = activeAssignmentId(authorization);
  const active = authorization.active_assignment;
  if (isRecord(active)) {
    // Some payloads carry the role on the active assignment itself.
    addRolesFromGrant(roles, active);
  }
  if (activeId && isRecord(grants) && Array.isArray(grants.club_assignments)) {
    for (const grant of grants.club_assignments) {
      if (isRecord(grant) && grant.assignment_id === activeId) {
        addRolesFromGrant(roles, grant);
      }
    }
  }

  return Array.from(roles);
}

export function isSuperAdminUser(user: AuthUser | null | undefined): boolean {
  return extractRoles(user).includes(SUPER_ADMIN_ROLE);
}

/**
 * Where a pastor-only user lands and the only dashboard subtree they can open
 * (decision 2026-10-08: the pastor sees just the authorization screen for now).
 */
export const PASTOR_LANDING_PATH = "/dashboard/investiture-requests" as const;
