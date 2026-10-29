import { getTranslations } from "next-intl/server";

export type CatalogEntityKey =
  | "churches"
  | "club-ideals"
  | "club-types"
  | "countries"
  | "districts"
  | "divisions"
  | "honor-categories"
  | "honors"
  | "local-fields"
  | "unions";

export type CatalogActionTextKey =
  | "invalidForm"
  | "invalidId"
  | "noPermissionCreate"
  | "noPermissionUpdate"
  | "noPermissionDelete"
  | "createFailed"
  | "updateFailed"
  | "deleteFailed";

type LooseTranslator = (key: string, values?: Record<string, string | number>) => string;

/** Translated error text for a catalog server action, in the user's locale. */
export async function catalogActionText(
  entity: CatalogEntityKey,
  key: CatalogActionTextKey,
): Promise<string> {
  const t = (await getTranslations("catalogs")) as unknown as LooseTranslator;
  const entityName = t(`entities.${entity}.title`).toLocaleLowerCase();
  return t(`actionErrors.${key}`, { entity: entityName });
}

/**
 * Catalog schemas use message codes instead of text: `required:<field>`,
 * `select:<field>` or `min:<field>:<value>`, where <field> is a key of `catalogs.fields`. This turns
 * the first issue's code into a translated message.
 */
export async function catalogValidationText(issueMessage: string | undefined): Promise<string> {
  const t = (await getTranslations("catalogs")) as unknown as LooseTranslator;
  const [kind, field, value] = (issueMessage ?? "").split(":");
  if (field && (kind === "required" || kind === "select" || kind === "min")) {
    const fieldLabel = t(`fields.${field}`);
    if (kind === "required") return t("validation.field_required", { field: fieldLabel });
    if (kind === "select") return t("validation.field_select", { field: fieldLabel });
    return t("validation.field_min", { field: fieldLabel, min: Number(value) || 0 });
  }
  return t("actionErrors.invalidForm");
}
