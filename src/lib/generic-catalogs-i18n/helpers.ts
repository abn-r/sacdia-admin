/**
 * Generic Catalogs i18n — pure (non-server-action) helpers.
 *
 * Lives outside `actions.ts` because that file is annotated with
 * `"use server"`, and Next.js requires every exported function from a
 * "use server" module to be async. These helpers are synchronous form
 * parsers / payload builders shared by the server-action factory.
 */

import {
  CATALOG_LOCALES,
  type CatalogTranslation,
} from "@/lib/types/catalog-translation";

/** The set of field names that can appear in a per-locale translation entry. */
export type TranslatableField = "name" | "description" | "ideal";

export function readString(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

export function parseBool(formData: FormData, field: string): boolean {
  return formData.get(field) === "on" || formData.get(field) === "true";
}

export function parsePositiveInt(
  formData: FormData,
  field: string,
): number | null {
  const raw = readString(formData, field);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

/**
 * Parses `translations[N][locale]` / `translations[N][name]` /
 * `translations[N][description]` / `translations[N][ideal]` entries from
 * FormData into a CatalogTranslation array.
 *
 * Only the fields listed in `fields` are extracted per entry.
 * Entries where all translatable fields are empty are skipped.
 * Entries with locale not in CATALOG_LOCALES are skipped.
 */
export function parseTranslations(
  formData: FormData,
  fields: TranslatableField[] = ["name", "description"],
): CatalogTranslation[] {
  const result: CatalogTranslation[] = [];
  const indices = new Set<number>();

  for (const key of formData.keys()) {
    const match = key.match(/^translations\[(\d+)\]\[locale\]$/);
    if (match) indices.add(Number(match[1]));
  }

  for (const idx of Array.from(indices).sort((a, b) => a - b)) {
    const locale = readString(formData, `translations[${idx}][locale]`);
    if (!CATALOG_LOCALES.includes(locale as CatalogTranslation["locale"])) continue;

    const entry: Record<string, string> = {};
    let hasValue = false;

    for (const field of fields) {
      const val = readString(formData, `translations[${idx}][${field}]`);
      if (val) {
        entry[field] = val;
        hasValue = true;
      }
    }

    if (!hasValue) continue;

    result.push({
      locale: locale as CatalogTranslation["locale"],
      ...entry,
    } as CatalogTranslation & Record<string, string>);
  }

  return result;
}

/**
 * Builds a create payload for catalogs that have `name` + `description`
 * (TranslatablePayload shape). Caller may override translatable fields.
 */
export function buildTranslatableCreate(
  formData: FormData,
  fields: TranslatableField[] = ["name", "description"],
  customFields?: Record<string, unknown>,
): Record<string, unknown> {
  const name = readString(formData, "name");
  if (!name) throw new Error("El nombre es obligatorio.");
  const active = formData.has("active") ? parseBool(formData, "active") : true;
  const translations = parseTranslations(formData, fields);

  const payload: Record<string, unknown> = { name, active };

  if (fields.includes("description")) {
    const description = readString(formData, "description") || undefined;
    if (description !== undefined) payload.description = description;
  }

  if (fields.includes("ideal")) {
    const ideal = readString(formData, "ideal") || undefined;
    if (ideal !== undefined) payload.ideal = ideal;
  }

  if (translations.length > 0) payload.translations = translations;

  if (customFields) {
    for (const [k, v] of Object.entries(customFields)) {
      if (v !== null && v !== undefined) payload[k] = v;
    }
  }

  return payload;
}

/**
 * Builds an update payload for catalogs that have `name` (and optionally
 * `description` or `ideal`). Caller may override translatable fields.
 *
 * Only sends `translations` when the dirty flag is set.
 */
export function buildTranslatableUpdate(
  formData: FormData,
  fields: TranslatableField[] = ["name", "description"],
  customFields?: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const name = readString(formData, "name");
  if (name) payload.name = name;

  if (fields.includes("description")) {
    payload.description = readString(formData, "description") || "";
  }

  if (fields.includes("ideal")) {
    const ideal = readString(formData, "ideal");
    if (ideal) payload.ideal = ideal;
  }

  if (formData.has("active")) payload.active = parseBool(formData, "active");

  const dirty = formData.get("translations_dirty");
  if (dirty === "1") payload.translations = parseTranslations(formData, fields);

  if (customFields) {
    for (const [k, v] of Object.entries(customFields)) {
      if (v !== null && v !== undefined) payload[k] = v;
    }
  }

  return payload;
}

/**
 * Builds a create payload for name-only catalogs (no description, no ideal).
 */
export function buildNameOnlyCreate(
  formData: FormData,
): Record<string, unknown> {
  const name = readString(formData, "name");
  if (!name) throw new Error("El nombre es obligatorio.");
  const active = formData.has("active") ? parseBool(formData, "active") : true;
  const translations = parseTranslations(formData, ["name"]);
  return {
    name,
    active,
    ...(translations.length > 0 ? { translations } : {}),
  };
}

/**
 * Builds an update payload for name-only catalogs.
 */
export function buildNameOnlyUpdate(
  formData: FormData,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const name = readString(formData, "name");
  if (name) payload.name = name;
  if (formData.has("active")) payload.active = parseBool(formData, "active");
  const dirty = formData.get("translations_dirty");
  if (dirty === "1") payload.translations = parseTranslations(formData, ["name"]);
  return payload;
}
