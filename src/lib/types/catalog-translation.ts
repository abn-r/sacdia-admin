export type CatalogLocale = "pt-BR" | "en" | "fr";

export type CatalogTranslation = {
  locale: CatalogLocale;
  name?: string | null;
  description?: string | null;
  /** Used by club-ideals translations (no description on this catalog). */
  ideal?: string | null;
};

export const CATALOG_LOCALES: CatalogLocale[] = ["pt-BR", "en", "fr"];
