import type { AdminTerritoryScope } from "@/lib/auth/territory-scope";
import type { CatalogTerritoryActor } from "@/lib/types/camporee-orders";

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
