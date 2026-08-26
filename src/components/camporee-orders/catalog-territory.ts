import type { AdminTerritoryScope } from "@/lib/auth/territory-scope";
import type {
  CamporeeOrderOwnerScope,
  CatalogTerritoryActor,
  CreateCamporeeOrderProductInput,
} from "@/lib/types/camporee-orders";

export type CatalogOwnerHint = {
  scope: CamporeeOrderOwnerScope;
  ownerId: number;
};

export type CatalogCreateOwnerFields = Pick<
  CreateCamporeeOrderProductInput,
  | "owner_scope"
  | "owner_division_id"
  | "owner_union_id"
  | "owner_local_field_id"
> & {
  owner_scope: CamporeeOrderOwnerScope;
};

export function toCatalogTerritoryActor(
  scope: AdminTerritoryScope,
): CatalogTerritoryActor {
  switch (scope.level) {
    case "all":
      return { level: "all" };
    case "division":
      return { level: "division", divisionId: scope.divisionId };
    case "union":
      return { level: "union", unionId: scope.unionId };
    case "local_field":
      return { level: "local_field", localFieldId: scope.localFieldId };
  }
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function defaultCatalogOwnerScope(
  actor: CatalogTerritoryActor,
): CamporeeOrderOwnerScope {
  if (actor.level === "local_field") return "LOCAL_FIELD";
  if (actor.level === "union") return "UNION";
  return "DIVISION";
}

/**
 * Owner fields for POST /camporee-order-products.
 * Territorial roles are locked to the actor. Platform admin (`level: all`)
 * must pick exactly one geography id that matches `hint.scope`.
 */
export function buildCatalogCreateOwnerFields(
  actor: CatalogTerritoryActor,
  hint?: CatalogOwnerHint | null,
): CatalogCreateOwnerFields | null {
  if (actor.level === "unconfigured" || actor.level === "open") {
    return null;
  }

  if (actor.level === "division") {
    if (!isPositiveInt(actor.divisionId)) return null;
    return {
      owner_scope: "DIVISION",
      owner_division_id: actor.divisionId,
    };
  }

  if (actor.level === "union") {
    if (!isPositiveInt(actor.unionId)) return null;
    return {
      owner_scope: "UNION",
      owner_union_id: actor.unionId,
    };
  }

  if (actor.level === "local_field") {
    if (!isPositiveInt(actor.localFieldId)) return null;
    return {
      owner_scope: "LOCAL_FIELD",
      owner_local_field_id: actor.localFieldId,
    };
  }

  if (!hint || !isPositiveInt(hint.ownerId)) {
    return null;
  }

  if (hint.scope === "DIVISION") {
    return { owner_scope: "DIVISION", owner_division_id: hint.ownerId };
  }
  if (hint.scope === "UNION") {
    return { owner_scope: "UNION", owner_union_id: hint.ownerId };
  }
  return { owner_scope: "LOCAL_FIELD", owner_local_field_id: hint.ownerId };
}

export function ownerScopeLabel(
  scope: string,
  t: (key: "catalog.ownerDivision" | "catalog.ownerUnion" | "catalog.ownerLocalField") => string,
): string {
  switch (scope) {
    case "DIVISION":
      return t("catalog.ownerDivision");
    case "UNION":
      return t("catalog.ownerUnion");
    case "LOCAL_FIELD":
      return t("catalog.ownerLocalField");
    default:
      return scope;
  }
}
