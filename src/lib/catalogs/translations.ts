import {
  CATALOG_LOCALES,
  type CatalogLocale,
  type CatalogTranslation,
} from "@/lib/types/catalog-translation";

type TranslationRowLike = {
  locale: string;
  name?: string | null;
  description?: string | null;
  ideal?: string | null;
};

function isCatalogLocale(value: string): value is CatalogLocale {
  return (CATALOG_LOCALES as readonly string[]).includes(value);
}

/**
 * Backend translation rows -> the form state of `TranslationsTabsField`:
 * only the non-Spanish locales it edits, empty entries dropped.
 */
export function toCatalogTranslations(
  rows: readonly TranslationRowLike[] | null | undefined,
): CatalogTranslation[] {
  const result: CatalogTranslation[] = [];
  for (const row of rows ?? []) {
    if (!isCatalogLocale(row.locale)) continue;
    const name = row.name?.trim() || null;
    const description = row.description?.trim() || null;
    const ideal = row.ideal?.trim() || null;
    if (!name && !description && !ideal) continue;
    result.push({
      locale: row.locale,
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
      ...(ideal ? { ideal } : {}),
    });
  }
  return result;
}
