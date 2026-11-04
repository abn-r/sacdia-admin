import type { AuthUser } from "@/lib/auth/types";
import {
  readAuthorizationTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import type { LocalFieldOption } from "@/lib/types/materials";

/**
 * Materials/local-field UI constraint. Mirrors backend
 * `resolveActorLocalField`: role-first, union/division never collapse to
 * the home `local_field_id`.
 */
export type UserLocalFieldScope =
  | { scope: "single"; localFieldId: number }
  | { scope: "union"; unionId: number }
  | { scope: "division"; divisionId: number }
  | { scope: "all" };

/**
 * Territory-first local_field constraint for materials and camporee forms.
 *
 *   1. `resolveAdminTerritoryScope` (`authorization.territory`)
 *   2. Club-only actors (`open` territory) may still bind via
 *      `legacy.club.local_field_id`
 *   3. A territorial role whose anchor is missing (`unconfigured`) never
 *      falls back to the home field
 */
export function resolveUserLocalField(
  user: AuthUser | null | undefined,
): UserLocalFieldScope {
  const territory = resolveAdminTerritoryScope(user);

  if (territory.level === "local_field") {
    return { scope: "single", localFieldId: territory.localFieldId };
  }

  if (territory.level === "union") {
    return { scope: "union", unionId: territory.unionId };
  }

  if (territory.level === "division") {
    return { scope: "division", divisionId: territory.divisionId };
  }

  if (readAuthorizationTerritory(user).level === "unconfigured") {
    return { scope: "all" };
  }

  const legacy = (user?.authorization as Record<string, unknown> | undefined)
    ?.legacy as { club?: { local_field_id?: number | null } | null } | undefined;
  const clubLf = legacy?.club?.local_field_id;
  if (typeof clubLf === "number" && Number.isFinite(clubLf) && clubLf > 0) {
    return { scope: "single", localFieldId: clubLf };
  }

  return { scope: "all" };
}

/** Union, division and unscoped admins can pick a child local field. */
export function canPickLocalField(scope: UserLocalFieldScope): boolean {
  return scope.scope !== "single";
}

export function toLocalFieldOptions(
  fields: Array<{
    local_field_id: number;
    name: string;
    abbreviation?: string | null;
  }>,
): LocalFieldOption[] {
  return fields.map((field) => ({
    local_field_id: field.local_field_id,
    name: field.name,
    abbreviation: field.abbreviation ?? "",
  }));
}

export function pickLocalFieldIdInScope(
  scope: UserLocalFieldScope,
  override: number | undefined,
  allowedIds: ReadonlySet<number>,
): number | undefined {
  if (scope.scope === "single") {
    return scope.localFieldId;
  }

  if (override !== undefined && allowedIds.has(override)) {
    return override;
  }

  return undefined;
}
