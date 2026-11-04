import type { AuthorizationTerritory, AuthUser } from "@/lib/auth/types";
import type { Division, LocalField, Union } from "@/lib/api/geography";
import { listLocalFields, listUnions } from "@/lib/api/geography";

export type AdminTerritoryScope =
  | { level: "all" }
  | {
      level: "division";
      divisionId: number;
      divisionName?: string | null;
      countryId?: number | null;
    }
  | {
      level: "union";
      unionId: number;
      unionName?: string | null;
      divisionId?: number | null;
      countryId?: number | null;
    }
  | {
      level: "local_field";
      localFieldId: number;
      localFieldName?: string | null;
      unionId?: number | null;
      divisionId?: number | null;
      countryId?: number | null;
    };

type ScopeNode = {
  id?: number | string | null;
  name?: string | null;
  union_id?: number | string | null;
  division_id?: number | string | null;
} | null | undefined;

type EffectiveGlobalScope = {
  division?: ScopeNode;
  union?: ScopeNode;
  local_field?: ScopeNode;
  country?: ScopeNode;
};

type UserLike = Pick<AuthUser, "authorization"> | null | undefined;

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Names of the anchors (display only); the level comes from `territory`. */
function readEffectiveGlobalScope(user: UserLike): EffectiveGlobalScope | null {
  const effective = (user?.authorization as Record<string, unknown> | undefined)
    ?.effective as { scope?: { global?: EffectiveGlobalScope } } | undefined;

  return effective?.scope?.global ?? null;
}

const TERRITORY_LEVELS = new Set<AuthorizationTerritory["level"]>([
  "all",
  "open",
  "unconfigured",
  "division",
  "union",
  "local_field",
]);

/**
 * `authorization.territory` as published by `/auth/me`. The backend resolves
 * the actor's anchor from its roles (`resolveActorTerritoryScope`); the panel
 * only reads the result. Absent (backend not yet publishing it) → `open`: no
 * UI narrowing, the API still scopes every call.
 */
export function readAuthorizationTerritory(user: UserLike): AuthorizationTerritory {
  const raw = user?.authorization?.territory;
  if (!raw || typeof raw !== "object" || !TERRITORY_LEVELS.has(raw.level)) {
    return { level: "open", division_id: null, union_id: null, local_field_id: null };
  }
  return {
    level: raw.level,
    division_id: toPositiveNumber(raw.division_id),
    union_id: toPositiveNumber(raw.union_id),
    local_field_id: toPositiveNumber(raw.local_field_id),
  };
}

/**
 * True when the backend answered `territory.level === "unconfigured"`: a
 * territorial or admin role with no territory to anchor to. Those accounts get
 * 403 ADMIN_USER_SCOPE_MISSING from every scoped call, so the panel blocks
 * them with an explanation instead of treating them as global.
 */
export function isTerritoryUnconfigured(user: UserLike): boolean {
  return readAuthorizationTerritory(user).level === "unconfigured";
}

export function resolveAdminTerritoryScope(user: UserLike): AdminTerritoryScope {
  const territory = readAuthorizationTerritory(user);
  const globalScope = readEffectiveGlobalScope(user);
  const countryId = toPositiveNumber(globalScope?.country?.id);
  const divisionId =
    territory.division_id ??
    toPositiveNumber(globalScope?.union?.division_id) ??
    toPositiveNumber(globalScope?.local_field?.division_id) ??
    toPositiveNumber(globalScope?.division?.id);
  const unionId =
    territory.union_id ??
    toPositiveNumber(globalScope?.local_field?.union_id) ??
    toPositiveNumber(globalScope?.union?.id);

  if (territory.level === "local_field" && territory.local_field_id) {
    return {
      level: "local_field",
      localFieldId: territory.local_field_id,
      localFieldName: globalScope?.local_field?.name ?? null,
      unionId,
      divisionId,
      countryId,
    };
  }

  if (territory.level === "union" && territory.union_id) {
    return {
      level: "union",
      unionId: territory.union_id,
      unionName: globalScope?.union?.name ?? null,
      divisionId,
      countryId,
    };
  }

  if (territory.level === "division" && territory.division_id) {
    return {
      level: "division",
      divisionId: territory.division_id,
      divisionName: globalScope?.division?.name ?? null,
      countryId,
    };
  }

  // `all`, `open`, `unconfigured` (blocked by the layout) and malformed
  // anchors: no UI narrowing; the API scopes every call anyway.
  return { level: "all" };
}

/** Union, division and system admins can pick a local field; LF-scoped admins cannot. */
export function canAdminFilterByLocalField(scope: AdminTerritoryScope): boolean {
  return (
    scope.level === "all" ||
    scope.level === "division" ||
    scope.level === "union"
  );
}

export function applyTerritoryToReportSearchParams<T extends Record<string, string | undefined>>(
  params: T,
  scope: AdminTerritoryScope,
): T {
  if (scope.level === "division") {
    return {
      ...params,
      division_id: String(scope.divisionId),
      union_id: undefined,
      local_field_id: undefined,
    };
  }

  if (scope.level === "union") {
    return {
      ...params,
      division_id: undefined,
      union_id: String(scope.unionId),
      local_field_id: undefined,
    };
  }

  if (scope.level === "local_field") {
    return {
      ...params,
      division_id: undefined,
      union_id: undefined,
      local_field_id: String(scope.localFieldId),
    };
  }

  return params;
}

export function filterDivisionsByTerritory(
  divisions: Division[],
  scope: AdminTerritoryScope,
): Division[] {
  if (scope.level === "division") {
    return divisions.filter((division) => division.division_id === scope.divisionId);
  }

  if ((scope.level === "union" || scope.level === "local_field") && scope.divisionId) {
    return divisions.filter((division) => division.division_id === scope.divisionId);
  }

  return divisions;
}


export function filterUnionsByTerritory(
  unions: Union[],
  scope: AdminTerritoryScope,
): Union[] {
  if (scope.level === "division") {
    return unions.filter((union) => union.division_id === scope.divisionId);
  }

  if (scope.level === "union") {
    return unions.filter((union) => union.union_id === scope.unionId);
  }

  if (scope.level === "local_field" && scope.unionId) {
    return unions.filter((union) => union.union_id === scope.unionId);
  }

  return unions;
}

export function filterLocalFieldsByTerritory(
  localFields: LocalField[],
  scope: AdminTerritoryScope,
): LocalField[] {
  if (scope.level === "union") {
    return localFields.filter((field) => field.union_id === scope.unionId);
  }

  if (scope.level === "local_field") {
    return localFields.filter((field) => field.local_field_id === scope.localFieldId);
  }

  return localFields;
}

export function localFieldOptionFromTerritory(
  scope: AdminTerritoryScope,
): LocalField | null {
  if (scope.level !== "local_field") {
    return null;
  }

  return {
    local_field_id: scope.localFieldId,
    name: scope.localFieldName ?? `Campo local #${scope.localFieldId}`,
    union_id: scope.unionId ?? 0,
    active: true,
  };
}

export async function listLocalFieldsForTerritory(
  user: Pick<AuthUser, "authorization"> | null | undefined,
): Promise<LocalField[]> {
  const scope = resolveAdminTerritoryScope(user);

  if (scope.level === "local_field") {
    const option = localFieldOptionFromTerritory(scope);
    return option ? [option] : [];
  }

  if (scope.level === "union") {
    return filterLocalFieldsByTerritory(
      await listLocalFields(scope.unionId),
      scope,
    );
  }

  if (scope.level === "division") {
    const unions = await listUnions({ divisionId: scope.divisionId });
    return (
      await Promise.all(unions.map((union) => listLocalFields(union.union_id)))
    ).flat();
  }

  return listLocalFields();
}

export function unionOptionFromTerritory(scope: AdminTerritoryScope): Union | null {
  if (scope.level === "union") {
    return {
      union_id: scope.unionId,
      name: scope.unionName ?? `Unión #${scope.unionId}`,
      country_id: scope.countryId ?? 0,
      division_id: scope.divisionId ?? undefined,
      active: true,
    };
  }

  if (scope.level === "local_field" && scope.unionId) {
    return {
      union_id: scope.unionId,
      name: `Unión #${scope.unionId}`,
      country_id: scope.countryId ?? 0,
      division_id: scope.divisionId ?? undefined,
      active: true,
    };
  }

  return null;
}

export async function listUnionsForTerritory(
  user: Pick<AuthUser, "authorization"> | null | undefined,
): Promise<Union[]> {
  const scope = resolveAdminTerritoryScope(user);

  if (scope.level === "all") {
    return listUnions();
  }

  if (scope.level === "division") {
    return listUnions({ divisionId: scope.divisionId });
  }

  const unions = filterUnionsByTerritory(await listUnions(), scope);
  if (unions.length > 0) {
    return unions;
  }

  const fallback = unionOptionFromTerritory(scope);
  return fallback ? [fallback] : [];
}
