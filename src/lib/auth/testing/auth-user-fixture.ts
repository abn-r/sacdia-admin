/**
 * Test-only fixtures. Builds `/auth/me`-shaped users with the full phase 7
 * `authorization` block (`capabilities`, `territory`,
 * `assignable_global_roles`) derived from roles the way the backend does, so
 * unit tests describe actors by role while production code reads only the
 * published capabilities.
 *
 * The derivation mirrors `docs/authz` contract rules; it is NOT imported by
 * runtime code (the ratchet test excludes this folder).
 */
import type { CapabilityKey } from "@/lib/auth/generated/capability-keys";
import type {
  AuthorizationTerritory,
  AuthorizationTerritoryLevel,
  AuthUser,
} from "@/lib/auth/types";

type GlobalScope = Record<string, unknown>;

const PLATFORM = ["super-admin", "admin", "assistant-admin"];
const FIELD = ["director-lf", "assistant-lf"];
const UNION = ["director-union", "assistant-union"];
const DIVISION = ["director-dia", "assistant-dia"];
const COORDINATORS = ["coordinator", "zone-coordinator", "general-coordinator"];
const T5 = ["user", "coordinator", "zone-coordinator", "general-coordinator", "pastor"];
const BOARD = ["director", "secretary", "secretary-treasurer"];
const STAFF = ["director", "deputy-director", "secretary", "secretary-treasurer", "treasurer"];

function anyOf(have: ReadonlySet<string>, want: readonly string[]): boolean {
  return want.some((role) => have.has(role));
}

function positive(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function deriveAssignableGlobalRoles(globalRoles: readonly string[]): string[] {
  const roles = new Set(globalRoles);
  let out: string[] = [];
  if (roles.has("super-admin")) out = [...T5, ...FIELD, ...UNION, ...DIVISION, "admin"];
  else if (roles.has("admin")) out = [...T5, ...FIELD, ...UNION, ...DIVISION];
  else if (anyOf(roles, DIVISION)) out = [...T5, ...FIELD, ...UNION];
  else if (anyOf(roles, UNION)) out = [...T5, ...FIELD];
  else if (anyOf(roles, FIELD)) out = [...T5];
  return [...new Set(out)].sort();
}

/**
 * Anchors assumed when a test names a territorial role without a scope: the
 * actor is "configured" (division 1 / union 1 / local field 1). Pass `scope`
 * explicitly (even `{}`) to describe an unconfigured actor.
 */
const DEFAULT_SCOPE: GlobalScope = {
  division: { id: 1 },
  union: { id: 1 },
  local_field: { id: 1 },
};

export function deriveTerritory(
  globalRoles: readonly string[],
  scope: GlobalScope = DEFAULT_SCOPE,
): AuthorizationTerritory {
  const roles = new Set(globalRoles);
  const division = positive((scope.division as { id?: unknown } | undefined)?.id);
  const union = positive((scope.union as { id?: unknown } | undefined)?.id);
  const localField = positive((scope.local_field as { id?: unknown } | undefined)?.id);
  const base = { division_id: division, union_id: union, local_field_id: localField };
  const level = ((): AuthorizationTerritoryLevel => {
    if (roles.has("super-admin")) return "all";
    if (anyOf(roles, DIVISION)) return division ? "division" : "unconfigured";
    if (anyOf(roles, UNION)) return union ? "union" : "unconfigured";
    if (anyOf(roles, FIELD)) return localField ? "local_field" : "unconfigured";
    if (roles.has("admin") || roles.has("assistant-admin")) {
      if (union) return "union";
      if (localField) return "local_field";
      if (division) return "division";
      return "unconfigured";
    }
    return "open";
  })();
  return { level, ...base };
}

export type DeriveCapabilitiesInput = {
  globalRoles: readonly string[];
  activeClubRole?: string | null;
  territoryLevel: AuthorizationTerritoryLevel;
  assignableGlobalRoles: readonly string[];
};

/** The 47-key contract, derived from G (global roles), A (active club role) and T (territory). */
export function deriveCapabilities(input: DeriveCapabilitiesInput): CapabilityKey[] {
  const g = new Set(input.globalRoles);
  const a = input.activeClubRole ?? null;
  const t = input.territoryLevel;
  const out = new Set<CapabilityKey>();
  const grant = (key: CapabilityKey, ok: boolean) => {
    if (ok) out.add(key);
  };

  const superAdmin = g.has("super-admin");
  const platform = anyOf(g, PLATFORM);
  const fieldOrPlatform = platform || anyOf(g, FIELD);
  const fieldWithScope = anyOf(g, FIELD) && t === "local_field";
  const tIn = (...levels: AuthorizationTerritoryLevel[]) => levels.includes(t);

  grant("admin_panel.access", [...g].some((role) => role !== "user"));
  grant("admin_panel.pastor_only", g.size > 0 && [...g].every((role) => role === "pastor"));
  grant("audit.read_system", superAdmin);
  grant("camporee_orders.configure_offering", tIn("all", "local_field", "union"));
  grant("camporee_orders.issue", a !== null && STAFF.includes(a));
  grant(
    "camporee_orders.review_payment",
    anyOf(g, ["director-lf", "assistant-lf", "admin", "super-admin"]) && tIn("all", "local_field"),
  );
  grant("camporee_supplies.configure", tIn("all", "local_field", "union"));
  grant("camporee_supplies.deliver", tIn("all", "local_field"));
  grant("camporee_supplies.plan", a !== null && STAFF.includes(a));
  grant(
    "camporee_supplies.review_payment",
    anyOf(g, ["director-lf", "assistant-lf", "admin", "super-admin"]) && tIn("all", "local_field"),
  );
  grant("catalogs.edit", platform);
  grant("catalogs.manage_protected", superAdmin);
  grant("certificates.review_imports", platform || fieldWithScope);
  grant("club.active_director", a === "director");
  grant("club.operational_staff", a !== null && STAFF.includes(a));
  grant("club.staff_mode", a !== null && STAFF.includes(a));
  grant("club_roles.assign_section", anyOf(g, ["super-admin", "admin", ...FIELD]));
  grant("club_roles.designate_director", anyOf(g, ["super-admin", "admin", ...FIELD]));
  grant("club_roles.succeed_director", anyOf(g, ["super-admin", "admin", ...FIELD]));
  grant("club_sections.create_active", a === "director");
  grant("clubs.deactivate_active", a === "director");
  grant("clubs.manage_active", a === "director");
  grant("coordination.hub_view", platform || anyOf(g, COORDINATORS) || anyOf(g, FIELD));
  grant(
    "coordination.manage",
    (platform || anyOf(g, FIELD)) && tIn("all", "division", "union", "local_field"),
  );
  grant(
    "field_payment_orders.review",
    anyOf(g, ["director-lf", "assistant-lf", "admin", "super-admin"]) && tIn("all", "local_field"),
  );
  grant("folders.confirm_union", anyOf(g, UNION));
  grant("folders.evaluate", tIn("all", "division", "union", "local_field"));
  grant("honors.review_instructor_proposals", platform || fieldWithScope);
  grant("institutional_certificates.review", superAdmin);
  grant("investiture.assign_district_pastors", anyOf(g, [...UNION, ...FIELD]));
  grant("investiture.authorize_requests", anyOf(g, [...FIELD, "pastor"]));
  grant("investiture.board", a !== null && BOARD.includes(a));
  grant("investiture.configure_field_window", fieldOrPlatform);
  grant("investiture.consult_field_window", fieldOrPlatform || anyOf(g, [...UNION, ...DIVISION]));
  grant("rbac.manage", superAdmin);
  grant("rbac.mutate_global_roles", superAdmin);
  grant("rbac.view_user_roles", anyOf(g, ["super-admin", "admin"]));
  grant("reports.view_all", anyOf(g, ["super-admin", "admin", ...DIVISION]));
  grant("reports.view_local_field", g.has("assistant-admin") || fieldWithScope);
  grant("reports.view_union", anyOf(g, UNION) && t === "union");
  grant("scoring_categories.manage", anyOf(g, ["super-admin", "admin"]));
  grant("system.config.read", platform);
  grant("system.jobs.run", superAdmin);
  grant("units.manage", a !== null && STAFF.includes(a));
  grant("users.create_in_scope", input.assignableGlobalRoles.length > 0);
  grant(
    "users.manage_in_scope",
    anyOf(g, ["admin", "super-admin", ...FIELD, ...UNION, ...DIVISION]),
  );
  grant("users.update_admin_fields", anyOf(g, ["super-admin", "admin"]));

  return [...out].sort();
}

export type AuthUserFixtureOptions = {
  roles?: string[];
  permissions?: string[];
  /** Club role of the ACTIVE assignment (`director`, `secretary`, …). */
  clubRole?: string | null;
  /** Section id of the active assignment (member-of-month tests). */
  clubSectionId?: number;
  /** `authorization.effective.scope.global` (anchors by id). */
  scope?: GlobalScope;
  /** Overrides the derived territory. */
  territory?: Partial<AuthorizationTerritory>;
  /** Overrides the derived capabilities entirely. */
  capabilities?: string[];
  /** Overrides the derived assignable roles. */
  assignableGlobalRoles?: string[];
  id?: string;
  email?: string;
  extra?: Record<string, unknown>;
};

/** `/auth/me` user with a complete phase 7 authorization block. */
export function buildAuthUser(options: AuthUserFixtureOptions = {}): AuthUser {
  const roles = options.roles ?? [];
  const permissions = options.permissions ?? [];
  const territory: AuthorizationTerritory = {
    ...deriveTerritory(roles, options.scope),
    ...(options.territory ?? {}),
  };
  const assignable = options.assignableGlobalRoles ?? deriveAssignableGlobalRoles(roles);
  const capabilities =
    options.capabilities ??
    deriveCapabilities({
      globalRoles: roles,
      activeClubRole: options.clubRole ?? null,
      territoryLevel: territory.level,
      assignableGlobalRoles: assignable,
    });

  const clubAssignments = options.clubRole
    ? [
        {
          assignment_id: "active-assignment",
          role_name: options.clubRole,
          permissions,
          section: { club_section_id: options.clubSectionId ?? 1 },
        },
      ]
    : [];

  return {
    id: options.id ?? "actor",
    email: options.email ?? "actor@example.com",
    roles,
    authorization: {
      capabilities,
      territory,
      assignable_global_roles: assignable,
      grants: {
        global_roles: roles.map((role_name) => ({ role_name, permissions })),
        club_assignments: clubAssignments,
      },
      ...(options.clubRole ? { active_assignment: { assignment_id: "active-assignment" } } : {}),
      effective: {
        permissions,
        ...(options.scope ? { scope: { global: options.scope } } : {}),
      },
    },
    ...(options.extra ?? {}),
  };
}

/** Shorthand used by most catalog tests: global roles + effective permissions. */
export function buildUser(roles: string[], permissions: string[] = []): AuthUser {
  return buildAuthUser({ roles, permissions });
}
