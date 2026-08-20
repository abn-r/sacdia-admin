import type { AuthUser } from "@/lib/auth/types";
import type { Division, LocalField, Union } from "@/lib/api/geography";
import { listLocalFields, listUnions } from "@/lib/api/geography";
import { extractRoles } from "@/lib/auth/roles";

export type AdminTerritoryScope =
  | { level: "all" }
  | { level: "division"; divisionId: number; divisionName?: string | null }
  | { level: "union"; unionId: number; unionName?: string | null; divisionId?: number | null }
  | {
      level: "local_field";
      localFieldId: number;
      localFieldName?: string | null;
      unionId?: number | null;
      divisionId?: number | null;
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

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readEffectiveGlobalScope(
  user: Pick<AuthUser, "authorization"> | null | undefined,
): EffectiveGlobalScope | null {
  const effective = (user?.authorization as Record<string, unknown> | undefined)
    ?.effective as { scope?: { global?: EffectiveGlobalScope } } | undefined;

  return effective?.scope?.global ?? null;
}

const SUPER_ADMIN_ROLES = new Set(["super-admin"]);
const DIVISION_ROLES = new Set(["director-dia", "assistant-dia"]);
const UNION_ROLES = new Set(["director-union", "assistant-union"]);
const LOCAL_FIELD_ROLES = new Set(["director-lf", "assistant-lf"]);
const ADMIN_SCOPE_ROLES = new Set(["admin", "assistant-admin"]);

function hasAnyRole(roles: Set<string>, allowed: Set<string>): boolean {
  for (const role of allowed) {
    if (roles.has(role)) {
      return true;
    }
  }
  return false;
}

export function resolveAdminTerritoryScope(
  user: Pick<AuthUser, "authorization"> | null | undefined,
): AdminTerritoryScope {
  const roles = new Set(extractRoles(user as AuthUser | null | undefined));
  const globalScope = readEffectiveGlobalScope(user);
  const localFieldId = toPositiveNumber(globalScope?.local_field?.id);
  const unionId = toPositiveNumber(globalScope?.union?.id);
  const divisionId = toPositiveNumber(globalScope?.division?.id);

  const localFieldScope = (): AdminTerritoryScope => ({
    level: "local_field",
    localFieldId: localFieldId as number,
    localFieldName: globalScope?.local_field?.name ?? null,
    unionId: toPositiveNumber(globalScope?.local_field?.union_id) ?? unionId,
    divisionId:
      toPositiveNumber(globalScope?.local_field?.division_id) ??
      toPositiveNumber(globalScope?.union?.division_id) ??
      divisionId,
  });

  const unionScope = (): AdminTerritoryScope => ({
    level: "union",
    unionId: unionId as number,
    unionName: globalScope?.union?.name ?? null,
    divisionId: toPositiveNumber(globalScope?.union?.division_id) ?? divisionId,
  });

  const divisionScope = (): AdminTerritoryScope => ({
    level: "division",
    divisionId: divisionId as number,
    divisionName: globalScope?.division?.name ?? null,
  });

  if (hasAnyRole(roles, SUPER_ADMIN_ROLES)) {
    return { level: "all" };
  }

  if (hasAnyRole(roles, DIVISION_ROLES) && divisionId) {
    return divisionScope();
  }

  if (hasAnyRole(roles, UNION_ROLES) && unionId) {
    return unionScope();
  }

  if (hasAnyRole(roles, LOCAL_FIELD_ROLES) && localFieldId) {
    return localFieldScope();
  }

  if (hasAnyRole(roles, ADMIN_SCOPE_ROLES)) {
    if (unionId) {
      return unionScope();
    }
    if (localFieldId) {
      return localFieldScope();
    }
    if (divisionId) {
      return divisionScope();
    }
  }

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

export async function listUnionsForTerritory(
  user: Pick<AuthUser, "authorization"> | null | undefined,
): Promise<Union[]> {
  const scope = resolveAdminTerritoryScope(user);

  if (scope.level === "division") {
    return listUnions({ divisionId: scope.divisionId });
  }

  if (scope.level === "all") {
    return listUnions();
  }

  return [];
}
